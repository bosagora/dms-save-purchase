/**
 *  This tests the serialization and deserialization
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
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
import { ContractUtils } from "../../src/service/utils/ContractUtils";

import { Block, Hash, NewTransaction, PurchaseDetails, Utils } from "dms-store-purchase-sdk";

import assert from "assert";
import { BigNumber, Wallet } from "ethers";
import { ethers } from "hardhat";
import path from "path";

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
    config.readFromFile(path.resolve(process.cwd(), "config/config_test.yaml"));
    const deployer = new Wallet(HardhatAccount.keys[0], ethers.provider);
    const publisher = new Wallet(HardhatAccount.keys[1], ethers.provider);

    before("Deploy StorePurchase Contract", async () => {
        await HardhatUtils.deployStorePurchaseContract(config, deployer, publisher);
    });

    before("Create Node", async () => {
        storage = await StorePurchaseStorage.make(config.database);
        node = new Node("*/1 * * * * *");
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
                new NewTransaction(
                    BigInt(idx),
                    (12345670 + idx).toString(),
                    Utils.getTimeStampBigInt(),
                    BigNumber.from(idx + 1),
                    BigNumber.from(idx + 1),
                    "krw",
                    "0x5f59d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
                    "0xD10ADf251463A260242c216c8c7D3e736eBdB398",
                    "a5c19fed89739383",
                    [new PurchaseDetails("PID001", BigNumber.from(idx + 1), BigNumber.from(300))]
                )
            );
        }
        for (const tx of txs) await tx.sign(publisher);

        const prev_hash = Hash.Null;
        const prev_height = 0n;
        const block = Block.createBlock(prev_hash, prev_height, txs);
        for (const tx of txs) await node.receive(tx);

        await ContractUtils.delay(6000);

        assert.ok(externalizer.block !== undefined);
        block.header.timestamp = externalizer.block.header.timestamp;
        assert.deepStrictEqual(block, externalizer.block);
        assert.ok(externalizer.cid !== undefined);
        console.log(externalizer.cid);
    });
});
