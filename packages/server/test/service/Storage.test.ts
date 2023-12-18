import * as assert from "assert";
import { BigNumber } from "ethers";
import path from "path";
import { Block, Hash, Transaction } from "rollup-pm-sdk";
import { Config } from "../../src/service/common/Config";
import { DBTransaction, RollupStorage } from "../../src/service/storage/RollupStorage";

describe("Test of Storage", () => {
    let storage: RollupStorage;
    const tx1 = DBTransaction.make(
        new Transaction(
            0,
            "123456789",
            "0x064c9Fc53d5936792845ca58778a52317fCf47F2",
            "0",
            BigNumber.from(123),
            1668044556,
            "997DE626B2D417F0361D61C09EB907A57226DB5B",
            "a5c19fed89739383",
            "0x19dCAc1131Dfa2fdBbf992261d54c03dDE616D75",
            "0x64ca000fe0fbb7ca96274dc836e3b286863b24fc47576748f0945ce3d07f58ed47f2dda151cbc218d05de2d2363cef6444ab628670d2bc9cf7674862e6dc51c81b"
        )
    );
    const tx2 = DBTransaction.make(
        new Transaction(
            1,
            "987654321",
            "0x064c9Fc53d5936792845ca58778a52317fCf47F2",
            "0",
            BigNumber.from(321),
            1313456756,
            "997DE626B2D417F0361D61C09EB907A57226DB5B",
            "a5c19fed89739383",
            "0xc2DfB49ad9BF96b541939EDABdDeBd63d85e8d70",
            "0x8a65d1c86d40a468a428d8ade17a795b49c0fc4356159d7208af97d19206f59766f7adbf1a348605d58c0a564098d805b0934e131343d45554b7d54501a83b0d1c"
        )
    );

    before("Create storage", async () => {
        const config: Config = new Config();
        config.readFromFile(path.resolve(process.cwd(), "config/config_test.yaml"));

        storage = await (() => {
            return new Promise<RollupStorage>((resolve, reject) => {
                const res = new RollupStorage(config.database, (err) => {
                    if (err !== null) reject(err);
                    else resolve(res);
                });
            });
        })();
    });

    context("Test of block", () => {
        const block = Block.createBlock(
            new Hash("0x0000000000000000000000000000000000000000000000000000000000000000"),
            BigInt(0),
            DBTransaction.converterTxArray([tx1, tx2])
        );

        const CID = "QmW3CT4SHmso5dRJdsjR8GL1qmt79HkdAebCn2uNaWXFYh";

        it("Insert block data", async () => {
            assert.strictEqual(await storage.selectLastHeight(), null);
            const res = await storage.insertBlock(block, CID);
            assert.strictEqual(await storage.selectLastHeight(), 1n);
        });
    });

    context("Test of transaction", () => {
        it("Insert transaction data", async () => {
            assert.strictEqual(await storage.selectTxsLength(), 0);
            const res = await storage.insertTx([tx1, tx2]);
            assert.strictEqual(res, true);
            assert.strictEqual(await storage.selectTxsLength(), 2);
        });

        it("Select transaction data by hash", async () => {
            const res1 = await storage.selectTxByHash(tx1?.hash);
            assert.notStrictEqual(res1, null);
            if (res1) {
                assert.strictEqual(res1.user_id, tx1.user_id);
                assert.strictEqual(res1.state, tx1.state);
                assert.strictEqual(res1.amount, tx1.amount?.toString());
                assert.strictEqual(res1.timestamp, tx1.timestamp);
                assert.strictEqual(res1.exchange_user_id, tx1.exchange_user_id);
                assert.strictEqual(res1.exchange_id, tx1.exchange_id);
                assert.strictEqual(res1.signer, tx1.signer);
                assert.strictEqual(res1.signature, tx1.signature);
            }
            const res2 = await storage.selectTxByHash(tx2.hash);
            assert.notStrictEqual(res2, null);
            if (res2) {
                assert.strictEqual(res2.trade_id, tx2.trade_id);
                assert.strictEqual(res2.user_id, tx2.user_id);
                assert.strictEqual(res2.state, tx2.state);
                assert.strictEqual(res2.amount, tx2.amount.toString());
                assert.strictEqual(res2.timestamp, tx2.timestamp);
                assert.strictEqual(res2.exchange_user_id, tx2.exchange_user_id);
                assert.strictEqual(res2.exchange_id, tx2.exchange_id);
                assert.strictEqual(res2.signer, tx2.signer);
                assert.strictEqual(res2.signature, tx2.signature);
            }
        });

        it("Select transaction data by length", async () => {
            let res = await storage.selectTxByLength(1);
            assert.strictEqual(res.length, 1);

            res = await storage.selectTxByLength(2);
            assert.strictEqual(res.length, 2);
        });

        it("Delete transaction data", async () => {
            const res = await storage.deleteTxByHash(tx1.hash);
            assert.strictEqual(res, true);

            const resS = await storage.selectTxByHash(tx1.hash);
            assert.strictEqual(resS, null);

            assert.strictEqual(await storage.selectTxsLength(), 1);
        });
    });

    context("Test of getSetting & setSetting", () => {
        it("getSetting & default", async () => {
            const res = await storage.getSetting("key1", "default");
            assert.strictEqual(res, "default");
        });

        it("setSetting & getSetting", async () => {
            await storage.setSetting("key1", "value1");
            const res = await storage.getSetting("key1", "default");
            assert.strictEqual(res, "value1");
        });

        it("getLastReceiveSequence & default", async () => {
            const res = await storage.getLastReceiveSequence();
            assert.strictEqual(res, -1);
        });

        it("setSetting & getSetting", async () => {
            await storage.setLastReceiveSequence(45);
            const res = await storage.getLastReceiveSequence();
            assert.strictEqual(res, 45);
        });
    });
});
