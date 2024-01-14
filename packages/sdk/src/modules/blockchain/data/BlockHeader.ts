/**
 *  The class that defines the header of a block.
 *
 *  Copyright:
 *      Copyright (c) 2024 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { SmartBuffer } from "smart-buffer";
import { JSONValidator } from "../../utils/JSONValidator";
import { Hash } from "../common/Hash";

/**
 * The class that defines the header of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class BlockHeader {
    /**
     * The hash of the previous block in the chain of blocks
     */
    public prevBlock: Hash;

    /**
     * The hash of the merkle root of the transactions
     */
    public merkleRoot: Hash;

    /**
     * The block height (genesis is #0)
     */
    public height: bigint;

    /**
     * Time timestamp on created
     */
    public timestamp: bigint;

    /**
     * Constructor
     * @param prevBlock  The Hash of the previous block in the chain of blocks
     * @param merkleRoot The hash of the merkle root of the transactions
     * @param height      The block height
     * @param timestamp
     */
    constructor(prevBlock: Hash, merkleRoot: Hash, height: bigint, timestamp: bigint) {
        this.prevBlock = prevBlock;
        this.merkleRoot = merkleRoot;
        this.height = height;
        this.timestamp = timestamp;
    }

    /**
     * The reviver parameter to give to `JSON.parse`
     *
     * This function allows to perform any necessary conversion,
     * as well as validation of the final object.
     *
     * @param key   Name of the field being parsed
     * @param value The value associated with `key`
     * @returns A new instance of `BlockHeader` if `key == ""`, `value` otherwise.
     */
    public static reviver(key: string, value: any): any {
        if (key !== "") return value;

        JSONValidator.isValidOtherwiseThrow("BlockHeader", value);

        return new BlockHeader(
            new Hash(value.prevBlock),
            new Hash(value.merkleRoot),
            BigInt(value.height),
            BigInt(value.timestamp)
        );
    }

    /**
     * Converts this object to its JSON representation
     */
    public toJSON(): any {
        return {
            prevBlock: this.prevBlock,
            merkleRoot: this.merkleRoot,
            height: this.height.toString(),
            timestamp: this.timestamp.toString(),
        };
    }

    /**
     * Collects data to create a hash.
     * @param buffer The buffer where collected data is stored
     */
    public computeHash(buffer: SmartBuffer) {
        this.prevBlock.computeHash(buffer);
        this.merkleRoot.computeHash(buffer);
        buffer.writeBigUInt64LE(this.height);
        buffer.writeBigUInt64LE(this.timestamp);
    }
}
