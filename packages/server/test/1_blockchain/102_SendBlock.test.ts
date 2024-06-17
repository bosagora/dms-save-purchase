/**
 *  Test to transfer block information to the blockchain
 *
 *  Copyright:
 *      Copyright (c) 2024 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { BigNumber, Wallet } from "ethers";
import { waffle } from "hardhat";

import { Block, Hash, hashFull } from "acc-save-purchase-sdk";
import { Config } from "../../src/service/common/Config";
import { SendBlock } from "../../src/service/scheduler/SendBlock";
import { HardhatUtils } from "../../src/service/utils";
import { StorePurchase } from "../../typechain-types";
import { delay } from "../helper/Utility";

import * as assert from "assert";
import path from "path";
import { HardhatAccount } from "../../src/HardhatAccount";
import { StorePurchaseStorage } from "../../src/service/storage/StorePurchaseStorage";

describe("Test of SendBlock", () => {
    let sendBlock: SendBlock;
    let contract: StorePurchase;
    const config = new Config();
    let storage: StorePurchaseStorage;

    const provider = waffle.provider;
    const deployer = new Wallet(HardhatAccount.keys[0], provider);
    const publisher = new Wallet(HardhatAccount.keys[1], provider);

    before("Deploy StorePurchase Contract", async () => {
        config.readFromFile(path.resolve(process.cwd(), "config/config_test.yaml"));
        contract = await HardhatUtils.deployStorePurchaseContract(config, deployer, publisher);
    });

    before("Create SendBlock", async () => {
        storage = await StorePurchaseStorage.make(config.database);
        await storage.clearTestDB();
        const send_block_scheduler = config.scheduler.getScheduler("send_block");
        if (send_block_scheduler && send_block_scheduler.enable) {
            sendBlock = new SendBlock("*/1 * * * * *");
        }
        sendBlock.setOption({ config, storage });
        await sendBlock.start();
        assert.ok(sendBlock.isRunning());
    });

    after("Destroy storage", async () => {
        await sendBlock.stop();
        await storage.dropTestDB();
    });

    it("Test of Insert Blocks & Send Block", async () => {
        const prev_hash = Hash.Null;
        const cid = "CID";
        const block_0 = Block.createBlock(prev_hash, 0n, []);
        const block_1 = Block.createBlock(hashFull(block_0.header), 1n, []);

        // Test Block height 0
        await storage.insertBlock(block_0, cid);
        await delay(5000);
        assert.deepStrictEqual(await contract.connect(publisher).getLastHeight(), BigNumber.from(1));
        assert.deepStrictEqual(await contract.size(), BigNumber.from(2));
        const sc_block_0 = await contract.connect(publisher).getByHeight(BigNumber.from(1));
        const db_block_0 = await storage.selectBlockByHeight(1n);
        assert.deepStrictEqual(sc_block_0[0], BigNumber.from(db_block_0.height));
        assert.deepStrictEqual(sc_block_0[1], db_block_0.curBlock);
        assert.deepStrictEqual(sc_block_0[2], db_block_0.prevBlock);
        assert.deepStrictEqual(sc_block_0[3], db_block_0.merkleRoot);
        assert.deepStrictEqual(sc_block_0[4], BigNumber.from(db_block_0.timestamp));
        assert.deepStrictEqual(sc_block_0[5], db_block_0.CID);
        // Test Block height 1
        await storage.insertBlock(block_1, cid);
        await delay(5000);
        assert.deepStrictEqual(await contract.connect(publisher).getLastHeight(), BigNumber.from(2));
        assert.deepStrictEqual(await contract.size(), BigNumber.from(3));
        const sc_block_1 = await contract.connect(publisher).getByHeight(BigNumber.from(2));
        const db_block_1 = await storage.selectBlockByHeight(2n);
        assert.deepStrictEqual(sc_block_1[0], BigNumber.from(db_block_1.height));
        assert.deepStrictEqual(sc_block_1[1], db_block_1.curBlock);
        assert.deepStrictEqual(sc_block_1[2], db_block_1.prevBlock);
        assert.deepStrictEqual(sc_block_1[3], db_block_1.merkleRoot);
        assert.deepStrictEqual(sc_block_1[4], BigNumber.from(db_block_1.timestamp));
        assert.deepStrictEqual(sc_block_1[5], db_block_1.CID);
    });
});
