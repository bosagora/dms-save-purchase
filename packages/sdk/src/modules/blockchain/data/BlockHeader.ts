/**
 *  The class that defines the header of a block.
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
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
    public prev_block: Hash;

    /**
     * The hash of the merkle root of the transactions
     */
    public merkle_root: Hash;

    /**
     * The block height (genesis is #0)
     */
    public height: bigint;

    /**
     * Time timestamp on created
     */
    public timestamp: number;

    /**
     * Constructor
     * @param prev_block  The Hash of the previous block in the chain of blocks
     * @param merkle_root The hash of the merkle root of the transactions
     * @param height      The block height
     * @param timestamp
     */
    constructor(prev_block: Hash, merkle_root: Hash, height: bigint, timestamp: number) {
        this.prev_block = prev_block;
        this.merkle_root = merkle_root;
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
            new Hash(value.prev_block),
            new Hash(value.merkle_root),
            BigInt(value.height),
            value.timestamp
        );
    }

    /**
     * Converts this object to its JSON representation
     */
    public toJSON(): any {
        return {
            prev_block: this.prev_block,
            merkle_root: this.merkle_root,
            height: this.height.toString(),
            timestamp: this.timestamp,
        };
    }

    /**
     * Collects data to create a hash.
     * @param buffer The buffer where collected data is stored
     */
    public computeHash(buffer: SmartBuffer) {
        this.prev_block.computeHash(buffer);
        this.merkle_root.computeHash(buffer);
        buffer.writeBigUInt64LE(this.height);
        buffer.writeBigUInt64LE(BigInt(this.timestamp));
    }
}
