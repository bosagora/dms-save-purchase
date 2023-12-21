import { Config } from "../../src/service/common/Config";

import chai from "chai";
import chaiHttp from "chai-http";

import * as assert from "assert";
import { CancelTransaction, NewTransaction, Transaction } from "dms-store-purchase-sdk";
import { Wallet } from "ethers";
import * as path from "path";
import { URL } from "url";
import { Amount } from "../../src/service/common/Amount";
import { DBTransaction, StorePurchaseStorage } from "../../src/service/storage/StorePurchaseStorage";
import { StorePurchaseServer } from "../../src/service/StorePurchaseServer";
import { HardhatUtils } from "../../src/service/utils";
import { TestClient } from "../helper/Utility";

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

    before("Create Test Server", async () => {
        config.readFromFile(path.resolve("config", "config_test.yaml"));
        accessKey = config.authorization.accessKey;

        const manager = new Wallet(config.contracts.managerKey || "");
        await HardhatUtils.deployStorePurchaseContract(config, manager);

        serverURL = new URL(`http://127.0.0.1:${config.server.port}`).toString();
        storage = await (() => {
            return new Promise<StorePurchaseStorage>((resolve, reject) => {
                const res = new StorePurchaseStorage(config.database, (err) => {
                    if (err !== null) reject(err);
                    else resolve(res);
                });
            });
        })();

        server = new StorePurchaseServer(config, storage);
    });

    before("Start Test StorePurchaseServer", async () => {
        await server.start();
    });

    after("Stop Test StorePurchaseServer", async () => {
        await server.stop();
    });

    let newTxParam: any;
    let url: string;
    it("New Transaction", async () => {
        newTxParam = {
            sequence: 0,
            purchaseId: "123456789",
            timestamp: 1668044556,
            totalAmount: 10.25,
            cashAmount: 10.25,
            currency: "usd",
            shopId: "0x5f59d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
            userAccount: "",
            userPhone: "",
            details: [
                {
                    productId: "PID001",
                    amount: 10.25,
                    providePercent: 3.25,
                },
            ],
        };
        url = URI(serverURL).directory("/v1/tx/purchase").filename("new").toString();
    });

    it("Send transaction data to api server", async () => {
        const response = await client.post(url, { accessKey, ...newTxParam });
        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 0, response.data?.error?.message);
        assert.ok(response.data.data !== undefined);
    });

    it("Test calls without authorization settings", async () => {
        const response = await client.post(url, { ...newTxParam });
        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Verifying values recorded by API in database ", async () => {
        const dbRes: DBTransaction[] = await storage.selectTxByLength(1);
        const dbTx: Transaction[] = DBTransaction.converterTxArray(dbRes);
        assert.deepStrictEqual(dbTx.length, 1);
        const tx: NewTransaction = dbTx[0] as NewTransaction;
        assert.deepStrictEqual(tx.sequence, newTxParam.sequence);
        assert.deepStrictEqual(tx.timestamp, newTxParam.timestamp);
        assert.deepStrictEqual(tx.totalAmount, Amount.make(String(newTxParam.totalAmount).trim(), 18).value);
        assert.deepStrictEqual(tx.cashAmount, Amount.make(String(newTxParam.cashAmount).trim(), 18).value);
        assert.deepStrictEqual(tx.shopId, tx.shopId);
    });

    it("Invalid parameter validation test of purchaseId", async () => {
        const response = await client.post(url, { accessKey, ...newTxParam, purchaseId: "" });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of userAccount", async () => {
        let response = await client.post(url, { accessKey, ...newTxParam, userAccount: undefined });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);

        response = await client.post(url, {
            accessKey,
            ...newTxParam,
            userAccount: "0x00",
        });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of userPhone", async () => {
        const response = await client.post(url, { accessKey, ...newTxParam, userPhone: undefined });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of currency", async () => {
        const response = await client.post(url, { accessKey, ...newTxParam, currency: undefined });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of sequence", async () => {
        const response = await client.post(url, { accessKey, ...newTxParam, sequence: undefined });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of timestamp", async () => {
        const response = await client.post(url, { accessKey, ...newTxParam, timestamp: undefined });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of shopId", async () => {
        const response = await client.post(url, { accessKey, ...newTxParam, shopId: "" });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of totalAmount", async () => {
        let response = await client.post(url, { accessKey, ...newTxParam, totalAmount: undefined });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);

        response = await client.post(url, { accessKey, ...newTxParam, totalAmount: "1,234.5678" });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    let cancelTxParam: any;
    it("Cancel Transaction", async () => {
        cancelTxParam = {
            sequence: 1,
            purchaseId: "123456789",
            timestamp: 1668044556,
        };
        url = URI(serverURL).directory("/v1/tx/purchase").filename("cancel").toString();
    });

    it("Send cancel transaction data to api server", async () => {
        const response = await client.post(url, { accessKey, ...cancelTxParam });
        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 0, response.data?.error?.message);
        assert.ok(response.data.data !== undefined);
    });

    it("Test calls without authorization settings", async () => {
        const response = await client.post(url, { ...cancelTxParam });
        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Verifying values recorded by API in database ", async () => {
        const dbRes: DBTransaction[] = await storage.selectTxByLength(2);
        const dbTx: Transaction[] = DBTransaction.converterTxArray(dbRes);
        assert.deepStrictEqual(dbTx.length, 2);
        const tx: CancelTransaction = dbTx[1] as CancelTransaction;
        assert.deepStrictEqual(tx.sequence, cancelTxParam.sequence);
        assert.deepStrictEqual(tx.purchaseId, cancelTxParam.purchaseId);
        assert.deepStrictEqual(tx.timestamp, cancelTxParam.timestamp);
    });

    it("Invalid parameter validation test of purchaseId", async () => {
        const response = await client.post(url, { accessKey, ...cancelTxParam, purchaseId: "" });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of timestamp", async () => {
        const response = await client.post(url, { accessKey, ...cancelTxParam, timestamp: undefined });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });
});
