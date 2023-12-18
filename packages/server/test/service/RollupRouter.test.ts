import { Config } from "../../src/service/common/Config";

import chai, { expect } from "chai";
import chaiHttp from "chai-http";

import * as assert from "assert";
import { BigNumber, Wallet } from "ethers";
import * as path from "path";
import { ITransaction, Transaction } from "rollup-pm-sdk";
import { URL } from "url";
import { RollupServer } from "../../src/service/RollupServer";
import { DBTransaction, RollupStorage } from "../../src/service/storage/RollupStorage";
import { HardhatUtils } from "../../src/service/utils";

chai.use(chaiHttp);

describe("Test of Rollup Router", () => {
    const config = new Config();
    let storage: RollupStorage;
    let serverURL: string;
    let rollupServer: RollupServer;

    before("Create Test SwapServer", async () => {
        config.readFromFile(path.resolve("config", "config_test.yaml"));

        const manager = new Wallet(config.contracts.rollup_manager_key || "");
        await HardhatUtils.deployRollupContract(config, manager);

        serverURL = new URL(`http://127.0.0.1:${config.server.port}`).toString();
        storage = await (() => {
            return new Promise<RollupStorage>((resolve, reject) => {
                const res = new RollupStorage(config.database, (err) => {
                    if (err !== null) reject(err);
                    else resolve(res);
                });
            });
        })();

        rollupServer = new RollupServer(config, storage);
    });

    before("Start Test RollupServer", async () => {
        await rollupServer.start();
    });

    after("Stop Test RollupServer", async () => {
        await rollupServer.stop();
    });

    context("Rollup API Call Test", async () => {
        const token: string = "9812176e565a007a84c5d2fc4cf842b12eb26dbc7568b4e40fc4f2418f2c8f54";
        let tx: ITransaction;

        before("Create Sample Transaction", async () => {
            const signer = new Wallet("0xf6dda8e03f9dce37c081e5d178c1fda2ebdb90b5b099de1a555a658270d8c47d");
            const txObj = new Transaction(
                0,
                "123456789",
                "0x064c9Fc53d5936792845ca58778a52317fCf47F2",
                "0",
                BigNumber.from("12300"),
                1668044556,
                "997DE626B2D417F0361D61C09EB907A57226DB5B",
                "a5c19fed89739383"
            );
            await txObj.sign(signer);
            tx = txObj.toJSON();
        });

        it("Send transaction data to api server", async () => {
            chai.request(serverURL)
                .post("tx/record")
                .send(tx)
                .set("Authorization", token)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                });
        });

        it("Test calls without authorization settings", async () => {
            chai.request(serverURL)
                .post("tx/record")
                .send(tx)
                .end((err, res) => {
                    expect(res).to.have.status(401);
                    const data = res.body.error;
                    assert.strictEqual(data.msg, "Authentication Error");
                });
        });

        it("Verifying values recorded by API in database ", async () => {
            const dbRes: DBTransaction[] = await storage.selectTxByLength(1);
            const dbTx: Transaction[] = DBTransaction.converterTxArray(dbRes);
            assert.strictEqual(dbTx.length, 1);
            assert.strictEqual(dbTx[0].user_id, tx.user_id);
            assert.strictEqual(dbTx[0].state, tx.state);
            assert.strictEqual(dbTx[0].amount.toString(), tx.amount);
            assert.strictEqual(dbTx[0].timestamp, tx.timestamp);
            assert.strictEqual(dbTx[0].exchange_user_id, tx.exchange_user_id);
            assert.strictEqual(dbTx[0].exchange_id, tx.exchange_id);
            assert.strictEqual(dbTx[0].signer, tx.signer);
            assert.strictEqual(dbTx[0].signature, tx.signature);
        });

        it("Invalid parameter validation test of trade_id", async () => {
            const params = { ...tx, trade_id: "" };
            chai.request(serverURL.toString())
                .post("tx/record")
                .send(params)
                .set("Authorization", token)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    const data = res.body.error;
                    assert.strictEqual(data.msg, "trade_id is a required value");
                    assert.strictEqual(data.param, "trade_id");
                });
        });

        it("Invalid parameter validation test of user_id", async () => {
            const params = { ...tx, user_id: "" };
            chai.request(serverURL.toString())
                .post("tx/record")
                .send(params)
                .set("Authorization", token)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    const data = res.body.error;
                    assert.strictEqual(data.msg, "user_id is a required value");
                    assert.strictEqual(data.param, "user_id");
                });
        });

        it("Invalid parameter validation test of state", async () => {
            const params = { ...tx, state: "charge" };
            chai.request(serverURL.toString())
                .post("tx/record")
                .send(params)
                .set("Authorization", token)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    const data = res.body.error;
                    assert.strictEqual(data.msg, `state input type error ,Enter "0" for charge or "1" for discharge`);
                    assert.strictEqual(data.param, "state");
                });

            const params1 = { ...tx, state: undefined };
            chai.request(serverURL.toString())
                .post("tx/record")
                .send(params1)
                .set("Authorization", token)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    const data = res.body.error;
                    assert.strictEqual(data.msg, "state is a required value");
                    assert.strictEqual(data.param, "state");
                });
        });

        it("Invalid parameter validation test of amount", async () => {
            const params = { ...tx, amount: undefined };
            chai.request(serverURL.toString())
                .post("tx/record")
                .send(params)
                .set("Authorization", token)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    const data = res.body.error;
                    assert.strictEqual(data.msg, "amount is a required value");
                    assert.strictEqual(data.param, "amount");
                });

            const params1 = { ...tx, amount: "1,234.10" };
            chai.request(serverURL.toString())
                .post("tx/record")
                .send(params1)
                .set("Authorization", token)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    const data = res.body.error;
                    assert.strictEqual(data.msg, "amount can only be numbers type string");
                    assert.strictEqual(data.param, "amount");
                });
        });

        it("Invalid parameter validation test of timestamp", async () => {
            const params = { ...tx, timestamp: undefined };
            chai.request(serverURL.toString())
                .post("tx/record")
                .send(params)
                .set("Authorization", token)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    const data = res.body.error;
                    assert.strictEqual(data.msg, "timestamp is a required value");
                    assert.strictEqual(data.param, "timestamp");
                });

            const params1 = { ...tx, timestamp: "Thu Dec 08 2022 09:39:19 GMT+0900" };
            chai.request(serverURL.toString())
                .post("tx/record")
                .send(params1)
                .set("Authorization", token)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    const data = res.body.error;
                    assert.strictEqual(data.msg, "timestamp can only be numbers");
                    assert.strictEqual(data.param, "timestamp");
                });
        });

        it("Invalid parameter validation test of exchange_user_id", async () => {
            const params = { ...tx, exchange_user_id: "" };
            chai.request(serverURL.toString())
                .post("tx/record")
                .send(params)
                .set("Authorization", token)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    const data = res.body.error;
                    assert.strictEqual(data.msg, "exchange_user_id is a required value");
                    assert.strictEqual(data.param, "exchange_user_id");
                });
        });

        it("Invalid parameter validation test of exchange_id", async () => {
            const params = { ...tx, exchange_id: "" };
            chai.request(serverURL.toString())
                .post("tx/record")
                .send(params)
                .set("Authorization", token)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    const data = res.body.error;
                    assert.strictEqual(data.msg, "exchange_id is a required value");
                    assert.strictEqual(data.param, "exchange_id");
                });
        });

        it("Invalid parameter validation test of signer", async () => {
            const params = { ...tx, signer: "" };
            chai.request(serverURL.toString())
                .post("tx/record")
                .send(params)
                .set("Authorization", token)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    const data = res.body.error;
                    assert.strictEqual(data.msg, "signer is a required value");
                    assert.strictEqual(data.param, "signer");
                });
        });

        it("Invalid parameter validation test of signature", async () => {
            const params = { ...tx, signature: "" };
            chai.request(serverURL.toString())
                .post("tx/record")
                .send(params)
                .set("Authorization", token)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    const data = res.body.error;
                    assert.strictEqual(data.msg, "signature is a required value");
                    assert.strictEqual(data.param, "signature");
                });
            const params1 = {
                ...tx,
                signature:
                    "0x64ca000fe0fbb7ca96274dc836e3b286863b24fc47576748f0945ce3d07f58ed47f2dda151cbc218d05de2d2363cef6444ab628670d2bc9cf7674862e6dc51c81b",
            };
            chai.request(serverURL.toString())
                .post("tx/record")
                .send(params1)
                .set("Authorization", token)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    const data = res.body.error;
                    assert.strictEqual(data.msg, "The signature value entered is not valid.");
                    assert.strictEqual(data.param, "signature");
                });
        });
    });
});
