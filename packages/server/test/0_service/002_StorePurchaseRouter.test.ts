import { HardhatAccount } from "../../src/HardhatAccount";
import { Amount } from "../../src/service/common/Amount";
import { Config } from "../../src/service/common/Config";
import { DBTransaction, StorePurchaseStorage } from "../../src/service/storage/StorePurchaseStorage";
import { StorePurchaseServer } from "../../src/service/StorePurchaseServer";
import { HardhatUtils } from "../../src/service/utils";
import { TestClient } from "../helper/Utility";

import { CancelTransaction, NewTransaction, Transaction } from "acc-save-purchase-sdk";

import * as assert from "assert";
import chai from "chai";
import chaiHttp from "chai-http";
import { Wallet } from "ethers";
import { waffle } from "hardhat";
import * as path from "path";
import { URL } from "url";

// tslint:disable-next-line:no-var-requires
const URI = require("urijs");

chai.use(chaiHttp);

describe("Test of StorePurchase Router", () => {
    const config = new Config();
    let storage: StorePurchaseStorage;
    let serverURL: string;
    let server: StorePurchaseServer;
    const client = new TestClient();
    let accessKey: string;

    const deployer = new Wallet(HardhatAccount.keys[0], waffle.provider);
    const publisher = new Wallet(HardhatAccount.keys[1], waffle.provider);

    before("Create Test Server", async () => {
        config.readFromFile(path.resolve("config", "config_test.yaml"));
        accessKey = config.setting.accessKey[0].key;

        await HardhatUtils.deployStorePurchaseContract(config, deployer, publisher);

        serverURL = new URL(`http://127.0.0.1:${config.server.port}`).toString();
        storage = await StorePurchaseStorage.make(config.database);
        server = new StorePurchaseServer(config, storage);
    });

    before("Start Test StorePurchaseServer", async () => {
        await storage.clearTestDB();
        await server.start();
    });

    after("Stop Test StorePurchaseServer", async () => {
        await server.stop();
        await storage.dropTestDB();
    });

    let newTxParam: any;
    let url: string;
    it("New Transaction", async () => {
        newTxParam = {
            purchaseId: "441381704768166151",
            timestamp: "1704768163",
            totalAmount: 10.25,
            cashAmount: 10.25,
            currency: "usd",
            shopId: "0x0001d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
            userAccount: "",
            userPhone: "",
            details: [
                {
                    productId: "20200513101535",
                    amount: 10.25,
                    providePercent: 3.25,
                },
            ],
        };
        url = URI(serverURL).directory("/v1/tx/purchase").filename("new").toString();
    });

    it("Send transaction data to api server 1", async () => {
        const response = await client.post(
            url,
            { ...newTxParam },
            {
                headers: {
                    Authorization: config.setting.accessKey[0].key,
                },
            }
        );
        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 0, response.data?.error?.message);
        assert.ok(response.data.data !== undefined);
        assert.deepStrictEqual(response.data.data.tx.sender, "0x4501F7aF010Cef3DcEaAfbc7Bfb2B39dE57df54d");
    });

    it("Send transaction data to api server 2", async () => {
        const response = await client.post(
            url,
            { ...newTxParam },
            {
                headers: {
                    Authorization: config.setting.accessKey[1].key,
                },
            }
        );
        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 0, response.data?.error?.message);
        assert.ok(response.data.data !== undefined);
        assert.deepStrictEqual(response.data.data.tx.sender, "0xEaeB90D77f7756fBf177D6E0E1BB794639e6097f");
    });

    it("Test calls without setting settings", async () => {
        const response = await client.post(url, { ...newTxParam });
        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 3051);
    });

    it("Verifying values recorded by API in database ", async () => {
        const dbRes: DBTransaction[] = await storage.selectTxByLength(1);
        const dbTx: Transaction[] = DBTransaction.converterTxArray(dbRes);
        assert.deepStrictEqual(dbTx.length, 1);
        const tx: NewTransaction = dbTx[0] as NewTransaction;
        assert.deepStrictEqual(tx.timestamp, BigInt(newTxParam.timestamp));
        assert.deepStrictEqual(tx.totalAmount, Amount.make(String(newTxParam.totalAmount).trim(), 18).value);
        assert.deepStrictEqual(tx.cashAmount, Amount.make(String(newTxParam.cashAmount).trim(), 18).value);
        assert.deepStrictEqual(tx.shopId, tx.shopId);
    });

    it("Invalid parameter validation test of purchaseId", async () => {
        const response = await client.post(
            url,
            { ...newTxParam, purchaseId: "" },
            {
                headers: {
                    Authorization: config.setting.accessKey[0].key,
                },
            }
        );

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of userAccount", async () => {
        let response = await client.post(
            url,
            { ...newTxParam, userAccount: undefined },
            {
                headers: {
                    Authorization: config.setting.accessKey[0].key,
                },
            }
        );

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);

        response = await client.post(
            url,
            {
                ...newTxParam,
                userAccount: "0x00",
            },
            {
                headers: {
                    Authorization: config.setting.accessKey[0].key,
                },
            }
        );

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2002);
    });

    it("Invalid parameter validation test of userPhone", async () => {
        let response = await client.post(
            url,
            { ...newTxParam, userPhone: undefined },
            {
                headers: {
                    Authorization: config.setting.accessKey[0].key,
                },
            }
        );

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);

        response = await client.post(
            url,
            { ...newTxParam, userPhone: "+82 10-1000-2000" },
            {
                headers: {
                    Authorization: config.setting.accessKey[0].key,
                },
            }
        );
        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 0);

        response = await client.post(
            url,
            { ...newTxParam, userPhone: "+821010002000" },
            {
                headers: {
                    Authorization: config.setting.accessKey[0].key,
                },
            }
        );
        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 0);
    });

    it("Invalid parameter validation test of currency", async () => {
        const response = await client.post(
            url,
            { ...newTxParam, currency: undefined },
            {
                headers: {
                    Authorization: config.setting.accessKey[0].key,
                },
            }
        );

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of timestamp", async () => {
        const response = await client.post(
            url,
            { ...newTxParam, timestamp: undefined },
            {
                headers: {
                    Authorization: config.setting.accessKey[0].key,
                },
            }
        );

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of shopId", async () => {
        const response = await client.post(
            url,
            { ...newTxParam, shopId: "" },
            {
                headers: {
                    Authorization: config.setting.accessKey[0].key,
                },
            }
        );

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of totalAmount", async () => {
        let response = await client.post(
            url,
            { ...newTxParam, totalAmount: undefined },
            {
                headers: {
                    Authorization: config.setting.accessKey[0].key,
                },
            }
        );

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);

        response = await client.post(
            url,
            { ...newTxParam, totalAmount: "1,234.5678" },
            {
                headers: {
                    Authorization: config.setting.accessKey[0].key,
                },
            }
        );

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    let cancelTxParam: any;
    it("Cancel Transaction", async () => {
        cancelTxParam = {
            purchaseId: "441381704768166151",
            timestamp: "1704768163",
        };
        url = URI(serverURL).directory("/v1/tx/purchase").filename("cancel").toString();
    });

    it("Send cancel transaction data to api server", async () => {
        const response = await client.post(
            url,
            { ...cancelTxParam },
            {
                headers: {
                    Authorization: config.setting.accessKey[0].key,
                },
            }
        );
        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 0, response.data?.error?.message);
        assert.ok(response.data.data !== undefined);
    });

    it("Test calls without setting settings", async () => {
        const response = await client.post(url, { ...cancelTxParam });
        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 3051);
    });

    it("Verifying values recorded by API in database ", async () => {
        const dbRes: DBTransaction[] = await storage.selectTxByLength(2);
        const dbTx: Transaction[] = DBTransaction.converterTxArray(dbRes);
        assert.deepStrictEqual(dbTx.length, 2);
        const tx: CancelTransaction = dbTx[1] as CancelTransaction;
        assert.deepStrictEqual(tx.purchaseId, cancelTxParam.purchaseId);
        assert.deepStrictEqual(tx.timestamp, BigInt(cancelTxParam.timestamp));
    });

    it("Invalid parameter validation test of purchaseId", async () => {
        const response = await client.post(
            url,
            { ...cancelTxParam, purchaseId: "" },
            {
                headers: {
                    Authorization: config.setting.accessKey[0].key,
                },
            }
        );

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of timestamp", async () => {
        const response = await client.post(
            url,
            { ...cancelTxParam, timestamp: undefined },
            {
                headers: {
                    Authorization: config.setting.accessKey[0].key,
                },
            }
        );

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });
});
