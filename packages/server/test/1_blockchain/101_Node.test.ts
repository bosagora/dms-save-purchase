/**
 *  This tests the serialization and deserialization
 *
 *  Copyright:
 *      Copyright (c) 2024 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { HardhatAccount } from "../../src/HardhatAccount";
import { Config } from "../../src/service/common/Config";
import { IBlockExternalizer, Node } from "../../src/service/scheduler/Node";
import { TransactionPool } from "../../src/service/scheduler/TransactionPool";
import { StorePurchaseStorage } from "../../src/service/storage/StorePurchaseStorage";
import { HardhatUtils } from "../../src/service/utils";
import { delay } from "../helper/Utility";

import { Block, Hash, NewTransaction, PurchaseDetails, Utils } from "dms-save-purchase-sdk";

import * as assert from "assert";
import { BigNumber, Wallet } from "ethers";
import { waffle } from "hardhat";
import path from "path";
import { register } from "prom-client";
import { Metrics } from "../../src/service/metrics/Metrics";

class BlockExternalizer implements IBlockExternalizer {
    public block: Block | undefined;
    public cid: string | undefined;
    public externalize(block: Block, cid: string) {
        this.block = block;
        this.cid = cid;
    }
}

describe("Test of Node", function () {
    this.timeout(1000 * 60 * 5);

    let node: Node;
    let externalizer: BlockExternalizer;
    const config = new Config();
    const metrics = new Metrics();
    let storage: StorePurchaseStorage;
    const provider = waffle.provider;
    const deployer = new Wallet(HardhatAccount.keys[0], provider);
    const publisher = new Wallet(HardhatAccount.keys[1], provider);

    before("Deploy StorePurchase Contract", async () => {
        config.readFromFile(path.resolve(process.cwd(), "config/config_test.yaml"));
        await HardhatUtils.deployStorePurchaseContract(config, deployer, publisher);

        register.clear();
        metrics.create("gauge", "status", "serve status");
        metrics.create("gauge", "block", "block number");
        metrics.create("gauge", "sequence", "transaction sequence");
        metrics.create("summary", "success", "request success");
        metrics.create("summary", "failure", "request failure");
    });

    before("Create Node", async () => {
        storage = await StorePurchaseStorage.make(config.database);
        await storage.clearTestDB();
        node = new Node("*/1 * * * * *");
        const pool = new TransactionPool();
        pool.storage = storage;
        node.setOption({ config, storage, pool, metrics });
        externalizer = new BlockExternalizer();
        node.setExternalizer(externalizer);
    });

    after("Destroy storage", async () => {
        await storage.dropTestDB();
    });

    it("Start Node", () => {
        node.start();
        assert.ok(node.isRunning());
    });

    it("Send transactions", async () => {
        const txs = [];
        for (let idx = 0; idx < 8; idx++) {
            txs.push(
                new NewTransaction(
                    BigInt(idx),
                    (12345670 + idx).toString(),
                    Utils.getTimeStampBigInt(),
                    BigInt("86400"),
                    BigNumber.from(idx + 1),
                    BigNumber.from(idx + 1),
                    BigNumber.from(idx + 1),
                    "krw",
                    "0x5f59d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
                    "0xD10ADf251463A260242c216c8c7D3e736eBdB398",
                    "a5c19fed89739383",
                    [new PurchaseDetails("PID001", BigNumber.from(idx + 1), BigNumber.from(300))],
                    "0x4501F7aF010Cef3DcEaAfbc7Bfb2B39dE57df54d",
                    ""
                )
            );
        }
        for (const tx of txs) await tx.sign(publisher);

        const prev_hash = Hash.Null;
        const prev_height = 0n;
        const block = Block.createBlock(prev_hash, prev_height, txs);
        for (const tx of txs) await node.receive(tx);

        await delay(6000);

        assert.ok(externalizer.block !== undefined);
        block.header.timestamp = externalizer.block.header.timestamp;
        assert.deepStrictEqual(block, externalizer.block);
        assert.ok(externalizer.cid !== undefined);
        console.log(externalizer.cid);
    });
});
