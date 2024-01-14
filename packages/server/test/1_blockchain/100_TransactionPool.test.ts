/**
 *  Test of TransactionPool
 *
 *  Copyright:
 *      Copyright (c) 2024 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { NewTransaction, PurchaseDetails, Utils } from "dms-store-purchase-sdk";
import { Config } from "../../src/service/common/Config";
import { TransactionPool } from "../../src/service/scheduler/TransactionPool";
import { DBTransaction, StorePurchaseStorage } from "../../src/service/storage/StorePurchaseStorage";

import * as assert from "assert";
import { BigNumber } from "ethers";
import path from "path";

describe("TransactionPool", () => {
    const addresses = [
        "0xbe71a56bAB18a4acf15a21A77cd16497da1c8e67",
        "0xC4d5e97a0335d416012F9a58EcBB3BF14D632902",
        "0x2A59068bd8579E2A703Bd5cF497844EC5ace1fae",
        "0xaaA86429BF3C0efF1e2F6Fa6094497597454C796",
        "0x73d662322EF0F002f76fa69b2B304d189719b577",
        "0x2918DBe8abcCCEe4965c199442B9192369A1d07d",
        "0x667b99c632e50284aCAD52F3Ca5118819A416A17",
        "0xa8039777CaD29b2ac26D6fF5A03015bFC1631D9F",
        "0xAdbB19207AB3f420603CcB827630010758daafE8",
        "0x586547F4FddeDBFB03878CC4EA3dB017f7803Fb6",
        "0xe1D0808481063fa4aC5117De36052Bfd7c58B8ab",
        "0x97C63C4aede30A528C18DA20367a8A47Be0e86E6",
        "0x30D60c530a34bF2B777617ADE079883e71793619",
        "0xe13677C10fc2c8064587120B724F77C027F699cb",
        "0xA34Bb90375B695D603d53a6d8789C6F55Ac9170C",
        "0xcd3C83ea93368cd2b4b7361d4061Bb91eB23b636",
        "0x08C1EF2c2a3C87Fa87A40EE77D89f3526de278ad",
        "0xb13c4B6036fA65495e396d3C524D6EfC45991816",
        "0xc73d3266c8FF50197582aB7c83246D492F978c2A",
        "0x705ddF3da7143635143604Ef93d7624cA91905A5",
    ];

    let tx_pool: TransactionPool;
    let txs: NewTransaction[];
    let dbTxs: DBTransaction[];
    let storage: StorePurchaseStorage;

    before("Create storage", async () => {
        const config: Config = new Config();
        config.readFromFile(path.resolve(process.cwd(), "config/config_test.yaml"));

        storage = await StorePurchaseStorage.make(config.database);
        await storage.clearTestDB();
    });

    after("Destroy storage", async () => {
        await storage.dropTestDB();
    });

    it("Create TransactionPool", async () => {
        tx_pool = new TransactionPool();
        tx_pool.storage = storage;
    });

    // The test codes below compare with the values calculated in Agora.
    it("Insert test for transactionPool", async () => {
        txs = addresses.map(
            (m, index) =>
                new NewTransaction(
                    BigInt(index),
                    "transaction_" + index,
                    Utils.getTimeStampBigInt(),
                    BigNumber.from(10000),
                    BigNumber.from(10000),
                    "krw",
                    "0x5f59d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
                    m,
                    "",
                    [new PurchaseDetails("PID001", BigNumber.from(10000), BigNumber.from(300))],
                    m
                )
        );
        dbTxs = txs.map((m) => DBTransaction.make(m));
        await tx_pool.add(dbTxs);
    });

    it("Check insert data count", async () => {
        const length = await tx_pool.length();
        assert.strictEqual(length, dbTxs.length);
    });

    it("Remove Test", async () => {
        const length = await tx_pool.length();
        assert.strictEqual(length, dbTxs.length);

        for (let idx = 0; idx < length; idx++) {
            const dbTx: DBTransaction[] = await tx_pool.get(1);
            const tx = DBTransaction.converterTxArray(dbTx) as NewTransaction[];
            assert.strictEqual(tx[0].sequence, txs[idx].sequence);
            assert.strictEqual(tx[0].timestamp, txs[idx].timestamp);
            assert.strictEqual(tx[0].totalAmount.toString(), txs[idx].totalAmount.toString());
            assert.strictEqual(tx[0].cashAmount.toString(), txs[idx].cashAmount.toString());
            assert.strictEqual(tx[0].currency, txs[idx].currency);
            assert.strictEqual(tx[0].shopId, txs[idx].shopId);
            assert.strictEqual(tx[0].userAccount, txs[idx].userAccount);
            assert.strictEqual(tx[0].userPhoneHash, txs[idx].userPhoneHash);

            await tx_pool.remove(dbTx[0]);
        }
        assert.strictEqual(await tx_pool.length(), 0);
    });
});
