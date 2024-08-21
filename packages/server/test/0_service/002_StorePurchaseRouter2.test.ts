import { HardhatAccount } from "../../src/HardhatAccount";
import { Amount, BOACoin } from "../../src/service/common/Amount";
import { Config } from "../../src/service/common/Config";
import { DBTransaction, StorePurchaseStorage } from "../../src/service/storage/StorePurchaseStorage";
import { StorePurchaseServer } from "../../src/service/StorePurchaseServer";
import { HardhatUtils } from "../../src/service/utils";
import { TestClient } from "../helper/Utility";

import { CancelTransaction, NewTransaction, Transaction } from "acc-save-purchase-sdk";

import { AddressZero } from "@ethersproject/constants";
import * as assert from "assert";
import chai from "chai";
import chaiHttp from "chai-http";
import { BigNumber, Wallet } from "ethers";
import { waffle } from "hardhat";
import * as path from "path";
import { URL } from "url";
import { ContractUtils } from "../../src/service/utils/ContractUtils";

// tslint:disable-next-line:no-var-requires
const URI = require("urijs");

chai.use(chaiHttp);

describe("Test of StorePurchase Router", () => {
    const config = new Config();
    let storage: StorePurchaseStorage;
    let serverURL: string;
    let server: StorePurchaseServer;
    const client = new TestClient();

    const deployer = new Wallet(HardhatAccount.keys[0], waffle.provider);
    const publisher = new Wallet(HardhatAccount.keys[1], waffle.provider);
    const system = new Wallet(HardhatAccount.keys[2], waffle.provider);

    before("Create Test Server", async () => {
        config.readFromFile(path.resolve("config", "config_test.yaml"));

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
            purchase: {
                purchaseId: "441381704768166151",
                cashAmount: BOACoin.make(100).value.toString(),
                loyalty: BOACoin.make(5).value.toString(),
                currency: "usd",
                shopId: "0x0001d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
                userAccount: AddressZero,
                userPhoneHash: ContractUtils.getPhoneHash(""),
                sender: system.address,
                purchaseSignature: "",
            },
            others: {
                totalAmount: BOACoin.make(100).value.toString(),
                timestamp: "1704768163",
                waiting: "0",
            },
            details: [
                {
                    productId: "20200513101535",
                    amount: BOACoin.make(100).value.toString(),
                    providePercent: 5 * 100,
                },
            ],
        };
        const message = ContractUtils.getNewPurchaseDataMessage(
            newTxParam.purchase.purchaseId,
            newTxParam.purchase.cashAmount,
            newTxParam.purchase.loyalty,
            newTxParam.purchase.currency,
            newTxParam.purchase.shopId,
            newTxParam.purchase.userAccount,
            newTxParam.purchase.userPhoneHash,
            newTxParam.purchase.sender
        );
        newTxParam.purchase.purchaseSignature = await ContractUtils.signMessage(system, message);
        url = URI(serverURL).directory("/v2/tx/purchase").filename("new").toString();
    });

    it("Send transaction data to api server 1", async () => {
        const response = await client.post(url, { ...newTxParam });
        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 0, response.data?.error?.message);
        assert.ok(response.data.data !== undefined);
        assert.deepStrictEqual(response.data.data.tx.sender, "0x4501F7aF010Cef3DcEaAfbc7Bfb2B39dE57df54d");
    });

    it("Verifying values recorded by API in database ", async () => {
        const dbRes: DBTransaction[] = await storage.selectTxByLength(1);
        const dbTx: Transaction[] = DBTransaction.converterTxArray(dbRes);
        assert.deepStrictEqual(dbTx.length, 1);
        const tx: NewTransaction = dbTx[0] as NewTransaction;
        assert.deepStrictEqual(tx.timestamp, BigInt(newTxParam.others.timestamp));
        assert.deepStrictEqual(tx.totalAmount, BigNumber.from(newTxParam.others.totalAmount));
        assert.deepStrictEqual(tx.cashAmount, BigNumber.from(newTxParam.purchase.cashAmount));
        assert.deepStrictEqual(tx.shopId, newTxParam.purchase.shopId);
    });

    it("Invalid parameter validation test of purchaseId", async () => {
        const data = newTxParam;
        data.purchase.purchaseId = "";
        const response = await client.post(url, { ...data });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of userAccount", async () => {
        const data = newTxParam;
        data.purchase.userAccount = "";
        let response = await client.post(url, { ...data });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);

        data.purchase.userAccount = "";
        response = await client.post(url, { ...data });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of userPhone", async () => {
        const data = newTxParam;
        data.purchase.userPhoneHash = undefined;
        const response = await client.post(url, { ...data });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of currency", async () => {
        const data = newTxParam;
        data.purchase.currency = undefined;
        const response = await client.post(url, { ...data });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of timestamp", async () => {
        const data = newTxParam;
        data.purchase.timestamp = undefined;
        const response = await client.post(url, { ...data });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of shopId", async () => {
        const data = newTxParam;
        data.purchase.shopId = "";
        const response = await client.post(url, { ...data });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of totalAmount", async () => {
        const data = newTxParam;
        data.purchase.totalAmount = undefined;
        let response = await client.post(url, { ...data });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);

        data.purchase.totalAmount = "1,234.5678";
        response = await client.post(url, { ...data });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    let cancelTxParam: any;
    it("Cancel Transaction", async () => {
        cancelTxParam = {
            purchase: {
                purchaseId: "441381704768166151",
                sender: system.address,
                purchaseSignature: "",
            },
            others: {
                timestamp: "1704768163",
                waiting: "0",
            },
        };
        const message = ContractUtils.getCancelPurchaseDataMessage(
            cancelTxParam.purchase.purchaseId,
            cancelTxParam.purchase.sender
        );
        cancelTxParam.purchase.purchaseSignature = await ContractUtils.signMessage(system, message);
        url = URI(serverURL).directory("/v2/tx/purchase").filename("cancel").toString();
    });

    it("Send cancel transaction data to api server", async () => {
        const data = cancelTxParam;
        const response = await client.post(url, { ...data });
        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 0, response.data?.error?.message);
        assert.ok(response.data.data !== undefined);
    });

    it("Verifying values recorded by API in database", async () => {
        const dbRes: DBTransaction[] = await storage.selectTxByLength(2);
        const dbTx: Transaction[] = DBTransaction.converterTxArray(dbRes);
        assert.deepStrictEqual(dbTx.length, 2);
        const tx: CancelTransaction = dbTx[1] as CancelTransaction;
        assert.deepStrictEqual(tx.purchaseId, cancelTxParam.purchase.purchaseId);
        assert.deepStrictEqual(tx.timestamp, BigInt(cancelTxParam.others.timestamp));
    });

    it("Invalid parameter validation test of purchaseId", async () => {
        const data = cancelTxParam;
        data.purchase.purchaseId = "";
        const response = await client.post(url, { ...data });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });

    it("Invalid parameter validation test of timestamp", async () => {
        const data = cancelTxParam;
        data.others.timestamp = undefined;
        const response = await client.post(url, { ...data });

        assert.deepStrictEqual(response.status, 200);
        assert.deepStrictEqual(response.data.code, 2001);
    });
});
