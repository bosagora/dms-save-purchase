/**
 *  This tests the serialization and deserialization
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { BigNumber, Wallet } from "ethers";
import { waffle } from "hardhat";

import { Block, Hash, Transaction, Utils } from "dms-store-purchase-sdk";
import { Config } from "../../src/service/common/Config";
import { IBlockExternalizer, Node } from "../../src/service/scheduler/Node";
import { HardhatUtils } from "../../src/service/utils";
import { delay } from "../Utility";

import * as assert from "assert";
import path from "path";
import { TransactionPool } from "../../src/service/scheduler/TransactionPool";
import { StorePurchaseStorage } from "../../src/service/storage/StorePurchaseStorage";

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
    let storage: StorePurchaseStorage;
    const provider = waffle.provider;
    config.readFromFile(path.resolve(process.cwd(), "config/config_test.yaml"));
    const manager = new Wallet(config.contracts.managerKey || "");
    const signer = provider.getSigner(manager.address);

    before("Deploy Rollup Contract", async () => {
        await HardhatUtils.deployStorePurchaseContract(config, manager);
    });

    before("Create Node", async () => {
        storage = await (() => {
            return new Promise<StorePurchaseStorage>((resolve, reject) => {
                const res = new StorePurchaseStorage(config.database, (err) => {
                    if (err !== null) reject(err);
                    else resolve(res);
                });
            });
        })();
        node = new Node();
        const pool = new TransactionPool();
        pool.storage = storage;
        node.setOption({ config, storage, pool });
        externalizer = new BlockExternalizer();
        node.setExternalizer(externalizer);
    });

    it("Start Node", () => {
        node.start();
        assert.ok(node.isRunning());
    });

    it("Send transactions", async () => {
        const txs = [];
        for (let idx = 0; idx < 8; idx++) {
            txs.push(
                new Transaction(
                    idx,
                    (12345670 + idx).toString(),
                    Utils.getTimeStamp(),
                    BigNumber.from(idx + 1),
                    "krw",
                    "0x5f59d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
                    0,
                    "0xD10ADf251463A260242c216c8c7D3e736eBdB398",
                    "a5c19fed89739383"
                )
            );
        }
        for (const tx of txs) await tx.sign(signer);

        const prev_hash = Hash.Null;
        const prev_height = -1n;
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
