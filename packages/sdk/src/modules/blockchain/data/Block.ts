/**
 *  The class that defines the block.
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { SmartBuffer } from "smart-buffer";
import { JSONValidator } from "../../utils/JSONValidator";
import { Utils } from "../../utils/Utils";
import { Hash, hashFull, hashMulti } from "../common/Hash";
import { BlockHeader } from "./BlockHeader";
import { Transaction } from "./Transaction";

/**
 * The class that defines the block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class Block {
    /**
     * The header of the block
     */
    public header: BlockHeader;

    /**
     * The array of the transaction
     */
    public txs: Transaction[];

    /**
     * The merkle tree
     */
    public merkle_tree: Hash[];

    /**
     * Constructor
     * @param header      The header of the block
     * @param txs         The array of the transaction
     * @param merkle_tree The merkle tree
     */
    constructor(header: BlockHeader, txs: Transaction[], merkle_tree: Hash[]) {
        this.header = header;
        this.txs = txs;
        this.merkle_tree = merkle_tree;
    }

    /**
     * The reviver parameter to give to `JSON.parse`
     *
     * This function allows to perform any necessary conversion,
     * as well as validation of the final object.
     *
     * @param key   Name of the field being parsed
     * @param value The value associated with `key`
     * @returns A new instance of `Block` if `key == ""`, `value` otherwise.
     */
    public static reviver(key: string, value: any): any {
        if (key !== "") return value;

        JSONValidator.isValidOtherwiseThrow("Block", value);

        const transactions: Transaction[] = [];
        for (const elem of value.txs) transactions.push(Transaction.reviver("", elem));

        const merkle_tree: Hash[] = [];
        for (const elem of value.merkle_tree) merkle_tree.push(new Hash(elem));

        return new Block(BlockHeader.reviver("", value.header), transactions, merkle_tree);
    }

    public static buildMerkleTree(tx_hash_list: Hash[]): Hash[] {
        const merkle_tree: Hash[] = [];
        merkle_tree.push(...tx_hash_list);

        if (merkle_tree.length < 1) {
            return [Hash.Null];
        }
        if (merkle_tree.length === 1) {
            merkle_tree.push(hashMulti(merkle_tree[0], merkle_tree[0]));
            return merkle_tree;
        }

        let offset = 0;
        for (let length = merkle_tree.length; length > 1; length = Math.floor((length + 1) / 2)) {
            for (let left = 0; left < length; left += 2) {
                const right = Math.min(left + 1, length - 1);
                merkle_tree.push(hashMulti(merkle_tree[offset + left], merkle_tree[offset + right]));
            }
            offset += length;
        }
        return merkle_tree;
    }

    /**
     * Create Block
     * @param prev_hash The previous block hash
     * @param prev_height The previous block height
     * @param txs The array of the transactions
     */
    public static createBlock(prev_hash: Hash, prev_height: bigint, txs: Transaction[]): Block {
        const tx_hash_list = txs.map((tx) => hashFull(tx));
        const merkle_tree = Block.buildMerkleTree(tx_hash_list);
        const merkle_root = merkle_tree.length > 0 ? merkle_tree[merkle_tree.length - 1] : Hash.Null;
        const block_header = new BlockHeader(prev_hash, merkle_root, BigInt(prev_height) + 1n, Utils.getTimeStamp());

        return new Block(block_header, txs, merkle_tree);
    }

    /**
     * Collects data to create a hash.
     * @param buffer The buffer where collected data is stored
     */
    public computeHash(buffer: SmartBuffer) {
        this.header.computeHash(buffer);
    }
}
