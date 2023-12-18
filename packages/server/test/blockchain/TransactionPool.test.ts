/**
 *  Test of TransactionPool
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import * as assert from "assert";
import { BigNumber } from "ethers";
import path from "path";
import { Transaction, Utils } from "dms-store-purchase-sdk";
import { Config } from "../../src/service/common/Config";
import { TransactionPool } from "../../src/service/scheduler/TransactionPool";
import { DBTransaction, RollupStorage } from "../../src/service/storage/RollupStorage";

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
    let txs: DBTransaction[];

    it("Create TransactionPool", async () => {
        tx_pool = new TransactionPool();
        const config: Config = new Config();
        config.readFromFile(path.resolve(process.cwd(), "config/config_test.yaml"));

        const storage = await (() => {
            return new Promise<RollupStorage>((resolve, reject) => {
                const res = new RollupStorage(config.database, (err) => {
                    if (err !== null) reject(err);
                    else resolve(res);
                });
            });
        })();
        tx_pool.storage = storage;
    });

    // The test codes below compare with the values calculated in Agora.
    it("Insert test for transactionPool", async () => {
        txs = addresses.map((m, index) =>
            DBTransaction.make(
                new Transaction(
                    index,
                    "transaction_" + index,
                    "0x064c9Fc53d5936792845ca58778a52317fCf47F2",
                    m,
                    BigNumber.from(10000),
                    Utils.getTimeStamp(),
                    "",
                    ""
                )
            )
        );

        await tx_pool.add(txs);
    });

    it("Check insert data count", async () => {
        const length = await tx_pool.length();
        assert.strictEqual(length, txs.length);
    });

    it("Remove Test", async () => {
        const length = await tx_pool.length();
        assert.strictEqual(length, txs.length);

        for (let idx = 0; idx < length; idx++) {
            const tx: DBTransaction[] = await tx_pool.get(1);

            assert.strictEqual(tx[0].trade_id, txs[idx].trade_id);
            assert.strictEqual(tx[0].user_id, txs[idx].user_id);
            assert.strictEqual(tx[0].state, txs[idx].state);
            assert.strictEqual(tx[0].amount.toString(), txs[idx].amount.toString());
            assert.strictEqual(tx[0].timestamp, txs[idx].timestamp);
            assert.strictEqual(tx[0].exchange_user_id, txs[idx].exchange_user_id);
            assert.strictEqual(tx[0].exchange_id, txs[idx].exchange_id);
            assert.strictEqual(tx[0].signer, txs[idx].signer);
            assert.strictEqual(tx[0].signature, txs[idx].signature);

            await tx_pool.remove(tx[0]);
        }
        assert.strictEqual(await tx_pool.length(), 0);
    });
});
