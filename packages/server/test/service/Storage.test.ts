import * as assert from "assert";
import { Block, Hash, NewTransaction, PurchaseDetails } from "dms-store-purchase-sdk";
import { BigNumber } from "ethers";
import path from "path";
import { Config } from "../../src/service/common/Config";
import { DBTransaction, StorePurchaseStorage } from "../../src/service/storage/StorePurchaseStorage";

describe("Test of Storage", () => {
    let storage: StorePurchaseStorage;
    const tx1 = DBTransaction.make(
        new NewTransaction(
            0,
            "123456789",
            1668044556,
            BigNumber.from(123),
            BigNumber.from(123),
            "krw",
            "0x5f59d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
            "0x064c9Fc53d5936792845ca58778a52317fCf47F2",
            "a5c19fed89739383",
            [new PurchaseDetails("PID001", BigNumber.from(123), BigNumber.from(300))],
            "0x19dCAc1131Dfa2fdBbf992261d54c03dDE616D75",
            "0x64ca000fe0fbb7ca96274dc836e3b286863b24fc47576748f0945ce3d07f58ed47f2dda151cbc218d05de2d2363cef6444ab628670d2bc9cf7674862e6dc51c81b"
        )
    );

    const tx2 = DBTransaction.make(
        new NewTransaction(
            1,
            "987654321",
            1313456756,
            BigNumber.from(123),
            BigNumber.from(123),
            "krw",
            "0x5f59d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
            "0x064c9Fc53d5936792845ca58778a52317fCf47F2",
            "a5c19fed89739383",
            [new PurchaseDetails("PID001", BigNumber.from(123), BigNumber.from(300))],
            "0xc2DfB49ad9BF96b541939EDABdDeBd63d85e8d70",
            "0x8a65d1c86d40a468a428d8ade17a795b49c0fc4356159d7208af97d19206f59766f7adbf1a348605d58c0a564098d805b0934e131343d45554b7d54501a83b0d1c"
        )
    );

    before("Create storage", async () => {
        const config: Config = new Config();
        config.readFromFile(path.resolve(process.cwd(), "config/config_test.yaml"));

        storage = await (() => {
            return new Promise<StorePurchaseStorage>((resolve, reject) => {
                const res = new StorePurchaseStorage(config.database, (err) => {
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
                assert.strictEqual(res1.sequence, tx1.sequence);
                assert.strictEqual(res1.contents, tx1.contents);
            }
            const res2 = await storage.selectTxByHash(tx2.hash);
            assert.notStrictEqual(res2, null);
            if (res2) {
                assert.strictEqual(res2.sequence, tx2.sequence);
                assert.strictEqual(res2.contents, tx2.contents);
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
