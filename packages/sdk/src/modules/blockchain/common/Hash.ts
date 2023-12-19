/**
 *  Includes classes and functions associated with hash.
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import crypto from "crypto";
import { BigNumber } from "ethers";
import { SmartBuffer } from "smart-buffer";
import { Utils } from "../../utils/Utils";

/**
 * The Class for creating hash
 */
export class Hash {
    /**
     * The number of byte of the Hash
     */
    public static Width: number = 32;
    /**
     * Buffer containing calculated hash values
     */
    public readonly data: Buffer;

    /**
     * Construct a new instance of this class
     *
     * @param data   The string or binary representation of the hash
     * @throws Will throw an error if the data is not the same size as 64.
     */
    constructor(data: Buffer | string) {
        if (typeof data === "string") this.data = Utils.readFromString(data);
        else {
            this.data = Buffer.alloc(Hash.Width);
            this.fromBinary(data);
        }
        if (this.data.length !== Hash.Width) throw new Error("The size of the data is abnormal.");
    }

    /**
     * Returns an instance filled with zero all bytes.
     * @returns The instance of Hash
     */
    public static get Null(): Hash {
        return new Hash(Buffer.alloc(Hash.Width));
    }

    /**
     * Deserialize as binary data.
     * @param buffer - The buffer to be deserialized
     */
    public static deserialize(buffer: SmartBuffer): Hash {
        return new Hash(Utils.readBuffer(buffer, Hash.Width));
    }

    /**
     * Compare whether the two hash are the same.
     * If it is the same, the true is returned. If different, false is returned.
     */
    public static equal(a: Hash, b: Hash): boolean {
        return Buffer.compare(a.data, b.data) === 0;
    }

    /**
     * Compare whether the two hash are the same.
     * If a is greater than b, it returns a positive number,
     * if a is less than b, it returns a negative number,
     * and if a and b are equal, it returns zero.
     */
    public static compare(a: Hash, b: Hash): number {
        return Utils.compareBuffer(a.data, b.data);
    }

    /**
     * Reads from the hex string
     * @param hex The hex string
     * @returns The instance of Hash
     */
    public fromString(hex: string): Hash {
        Utils.readFromString(hex, this.data);
        return this;
    }

    /**
     * Writes to the hex string
     * @returns The hex string
     */
    public toString(): string {
        return Utils.writeToString(this.data);
    }

    /**
     * Set binary data
     * @param bin    The binary data of the hash
     * @returns The instance of Hash
     * @throws Will throw an error if the argument `bin` is not the same size as 64.
     */
    public fromBinary(bin: Buffer): Hash {
        if (bin.length !== Hash.Width) throw new Error("The size of the data is abnormal.");

        bin.copy(this.data);

        return this;
    }

    /**
     * Get binary data
     * @returns The binary data of the hash
     */
    public toBinary(): Buffer {
        return this.data;
    }

    /**
     * Collects data to create a hash.
     * @param buffer The buffer where collected data is stored
     */
    public computeHash(buffer: SmartBuffer) {
        buffer.writeBuffer(this.data);
    }

    /**
     * Converts this object to its JSON representation
     */
    public toJSON(): string {
        return this.toString();
    }

    /**
     * Serialize as binary data.
     * @param buffer - The buffer where serialized data is stored
     */
    public serialize(buffer: SmartBuffer) {
        buffer.writeBuffer(this.data);
    }

    /**
     * Creates and returns a copy of this object.
     */
    public clone(): Hash {
        return new Hash(this.data);
    }

    /**
     * This checks whether all values are initial values (0).
     */
    public isNull(): boolean {
        if (this.data.length !== Hash.Width) return false;
        return this.data.every((value) => value === 0);
    }
}

/**
 * Creates a hash and stores it in buffer.
 * @param source Original for creating hash
 * @returns Instance of Hash
 */
export function hash(source: Buffer): Hash {
    return new Hash(crypto.createHash("sha256").update(source).digest());
}

/**
 * Creates a hash of the two buffer combined.
 * @param args The array of any for creating hash
 * @returns The instance of Hash
 * See_Also https://github.com/bosagora/agora/blob/93c31daa616e76011deee68a8645e1b86624ce3d/source/agora/common/Hash.d#L239-L255
 */
export function hashMulti(...args: any[]): Hash {
    const buffer = new SmartBuffer();
    for (const m of args) hashPart(m, buffer);
    return new Hash(crypto.createHash("sha256").update(buffer.toBuffer()).digest());
}

/**
 * Serializes all internal objects that the instance contains in a buffer.
 * Calculates the hash of the buffer.
 * @param record The object to serialize for the hash for creation.
 * The object has a method named `computeHash`.
 * @returns The instance of the hash
 */
export function hashFull(record: any): Hash {
    if (record === null || record === undefined) return Hash.Null;

    const buffer = new SmartBuffer();
    hashPart(record, buffer);
    return hash(buffer.readBuffer());
}

/**
 * Serializes all internal objects that the instance contains in the buffer.
 * @param record The object to serialize for the hash for creation
 * @param buffer The storage of serialized data for creating the hash
 */
export function hashPart(record: any, buffer: SmartBuffer) {
    if (record === null || record === undefined) return;

    // If the record has a method called `computeHash`,
    if (typeof record.computeHash === "function") {
        record.computeHash(buffer);
        return;
    }

    if (typeof record === "string") {
        const buf = Buffer.from(record, "utf8");
        hashVarInt(BigInt(buf.length), buffer);
        buffer.writeBuffer(buf);
        return;
    }

    if (typeof record === "number") {
        buffer.writeBigUInt64LE(BigInt(record));
        return;
    }

    if (typeof record === "bigint") {
        buffer.writeBigUInt64LE(record);
        return;
    }

    if (record instanceof BigNumber) {
        const raw = record.toHexString();
        const hex = raw.substring(0, 2) === "0x" ? raw.substring(2) : raw;
        buffer.writeBuffer(Buffer.from(hex, "hex"));
        return;
    }

    if (record instanceof Buffer) {
        hashVarInt(BigInt(record.length), buffer);
        buffer.writeBuffer(record);
        return;
    }

    if (Array.isArray(record)) {
        hashVarInt(BigInt(record.length), buffer);
        for (const elem of record) {
            hashPart(elem, buffer);
        }
    } else {
        for (const key in record) {
            if (record.hasOwnProperty(key)) {
                hashPart(record[key], buffer);
            }
        }
    }
}

/**
 * Serializes array length information into buffers.
 * @param value The length of the Array
 * @param buffer The storage of serialized data for creating the hash
 */
export function hashVarInt(value: bigint, buffer: SmartBuffer) {
    if (value <= 0xfc) {
        buffer.writeUInt8(Number(value));
    } else if (value <= 0xffff) {
        buffer.writeUInt8(0xfd);
        buffer.writeUInt16LE(Number(value));
    } else if (value < 0xffffffff) {
        buffer.writeUInt8(0xfe);
        buffer.writeUInt32LE(Number(value));
    } else {
        buffer.writeUInt8(0xff);
        buffer.writeBigUInt64LE(value);
    }
}
