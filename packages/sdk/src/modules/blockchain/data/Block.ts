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
import { CancelTransaction, NewTransaction, Transaction, TransactionType } from "./Transaction";

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
    public merkleTree: Hash[];

    /**
     * Constructor
     * @param header      The header of the block
     * @param txs         The array of the transaction
     * @param merkleTree The merkle tree
     */
    constructor(header: BlockHeader, txs: Transaction[], merkleTree: Hash[]) {
        this.header = header;
        this.txs = txs;
        this.merkleTree = merkleTree;
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
        for (const elem of value.txs) {
            if (elem.type === TransactionType.NEW) transactions.push(NewTransaction.reviver("", elem));
            else if (elem.type === TransactionType.CANCEL) transactions.push(CancelTransaction.reviver("", elem));
        }

        const merkleTree: Hash[] = [];
        for (const elem of value.merkleTree) merkleTree.push(new Hash(elem));

        return new Block(BlockHeader.reviver("", value.header), transactions, merkleTree);
    }

    public static buildMerkleTree(txHashList: Hash[]): Hash[] {
        const merkleTree: Hash[] = [];
        merkleTree.push(...txHashList);

        if (merkleTree.length < 1) {
            return [Hash.Null];
        }
        if (merkleTree.length === 1) {
            merkleTree.push(hashMulti(merkleTree[0], merkleTree[0]));
            return merkleTree;
        }

        let offset = 0;
        for (let length = merkleTree.length; length > 1; length = Math.floor((length + 1) / 2)) {
            for (let left = 0; left < length; left += 2) {
                const right = Math.min(left + 1, length - 1);
                merkleTree.push(hashMulti(merkleTree[offset + left], merkleTree[offset + right]));
            }
            offset += length;
        }
        return merkleTree;
    }

    /**
     * Create Block
     * @param prevHash The previous block hash
     * @param prevHeight The previous block height
     * @param txs The array of the transactions
     */
    public static createBlock(prevHash: Hash, prevHeight: bigint, txs: Transaction[]): Block {
        const txHashList = txs.map((tx) => hashFull(tx));
        const merkleTree = Block.buildMerkleTree(txHashList);
        const merkleRoot = merkleTree.length > 0 ? merkleTree[merkleTree.length - 1] : Hash.Null;
        const blockHeader = new BlockHeader(prevHash, merkleRoot, BigInt(prevHeight) + 1n, Utils.getTimeStampBigInt());

        return new Block(blockHeader, txs, merkleTree);
    }

    /**
     * Collects data to create a hash.
     * @param buffer The buffer where collected data is stored
     */
    public computeHash(buffer: SmartBuffer) {
        this.header.computeHash(buffer);
    }
}
