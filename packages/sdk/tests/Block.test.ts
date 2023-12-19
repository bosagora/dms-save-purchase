/**
 *  This tests the serialization and deserialization
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { Block, Hash, hashFull, Transaction } from "../src";

import * as assert from "assert";
import { BigNumber, Wallet } from "ethers";

describe("Test of Block", () => {
    it("Test buildMerkleTree", () => {
        const txs = [];
        const txs_hash = [];
        for (let idx = 0; idx < 7; idx++) {
            txs.push(
                new Transaction(
                    0,
                    (12345670 + idx).toString(),
                    "0x064c9Fc53d5936792845ca58778a52317fCf47F2",
                    "0",
                    BigNumber.from(idx + 1),
                    1668044556,
                    "997DE626B2D417F0361D61C09EB907A57226DB5B",
                    "a5c19fed89739383"
                )
            );
            txs_hash.push(hashFull(txs[idx]));
        }

        const merkel_tree = Block.buildMerkleTree(txs_hash);
        assert.strictEqual(merkel_tree.length, txs_hash.length + 7);
    });

    it("Test createBlock", () => {
        const txs = [
            new Transaction(
                0,
                "00000000",
                "0x0000000000000000000000000000000000000000",
                "0",
                BigNumber.from(1000000000),
                1668044556,
                "997DE626B2D417F0361D61C09EB907A57226DB5B",
                "a5c19fed89739383"
            ),
            new Transaction(
                1,
                "00000001",
                "0x0000000000000000000000000000000000000000",
                "0",
                BigNumber.from(1000000000),
                1668044556,
                "997DE626B2D417F0361D61C09EB907A57226DB5B",
                "a5c19fed89739383"
            ),
            new Transaction(
                2,
                "00000002",
                "0x0000000000000000000000000000000000000000",
                "0",
                BigNumber.from(1000000000),
                1668044556,
                "997DE626B2D417F0361D61C09EB907A57226DB5B",
                "a5c19fed89739383"
            ),
            new Transaction(
                3,
                "00000003",
                "0x0000000000000000000000000000000000000000",
                "0",
                BigNumber.from(1000000000),
                1668044556,
                "997DE626B2D417F0361D61C09EB907A57226DB5B",
                "a5c19fed89739383"
            ),
            new Transaction(
                4,
                "00000004",
                "0x0000000000000000000000000000000000000000",
                "0",
                BigNumber.from(1000000000),
                1668044556,
                "997DE626B2D417F0361D61C09EB907A57226DB5B",
                "a5c19fed89739383"
            ),
        ];
        const signer = new Wallet("0xf6dda8e03f9dce37c081e5d178c1fda2ebdb90b5b099de1a555a658270d8c47d");
        const prev_hash = Hash.Null;
        const prev_height = 0n;

        const block = Block.createBlock(prev_hash, prev_height, txs);
        const block_string = JSON.stringify(block);
        const block_json = JSON.parse(block_string);

        const block2 = Block.reviver("", block_json);

        assert.deepStrictEqual(block, block2);

        // Check hash of Block
        assert.deepStrictEqual(hashFull(block2), hashFull(block2.header));
    });
});
