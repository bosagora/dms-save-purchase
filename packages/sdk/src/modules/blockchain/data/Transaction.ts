/**
 *  The class that defines the transaction of a block.
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { BigNumber, Signer, utils } from "ethers";
import { SmartBuffer } from "smart-buffer";
import { JSONValidator } from "../../utils/JSONValidator";
import { hashFull, hashPart } from "../common/Hash";

export interface ITransaction {
    sequence: number;
    trade_id: string;
    user_id: string;
    state: string;
    amount: BigNumber;
    timestamp: number;
    exchange_user_id: string;
    exchange_id: string;
    signer: string;
    signature: string;
}

/**
 * The class that defines the transaction of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class Transaction implements ITransaction {
    /**
     * Of all transactions, it starts at zero and increases by one in a unique sequence
     */
    public sequence: number;

    /**
     * ID of the trade
     */
    public trade_id: string;

    /**
     * The ID of User
     */
    public user_id: string;

    /**
     * The type of transaction
     */
    public state: string;

    /**
     * The amount of sending
     */
    public amount: BigNumber;

    /**
     * The time stamp
     */
    public timestamp: number;

    /**
     * The exchange user id
     */
    public exchange_user_id: string;

    /**
     * The exchange id
     */
    public exchange_id: string;

    /**
     * The signer
     */
    public signer: string;

    /**
     * The signature
     */
    public signature: string;

    /**
     * Constructor
     */
    constructor(
        sequence: number,
        trade_id: string,
        user_id: string,
        state: string,
        amount: BigNumber,
        timestamp: number,
        exchange_user_id: string,
        exchange_id: string,
        signer?: string,
        signature?: string
    ) {
        this.sequence = sequence;
        this.trade_id = trade_id;
        this.user_id = user_id;
        this.state = state;
        this.amount = amount;
        this.timestamp = timestamp;
        this.exchange_user_id = exchange_user_id;
        this.exchange_id = exchange_id;
        if (signer !== undefined) this.signer = signer;
        else this.signer = "";
        if (signature !== undefined) this.signature = signature;
        else this.signature = "";
    }

    /**
     * The reviver parameter to give to `JSON.parse`
     *
     * This function allows to perform any necessary conversion,
     * as well as validation of the final object.
     *
     * @param key   Name of the field being parsed
     * @param value The value associated with `key`
     * @returns A new instance of `Transaction` if `key == ""`, `value` otherwise.
     */
    public static reviver(key: string, value: any): any {
        if (key !== "") return value;

        JSONValidator.isValidOtherwiseThrow("Transaction", value);

        return new Transaction(
            value.sequence,
            value.trade_id,
            value.user_id,
            value.state,
            BigNumber.from(value.amount),
            value.timestamp,
            value.exchange_user_id,
            value.exchange_id,
            value.signer,
            value.signature
        );
    }

    /**
     * Collects data to create a hash.
     * @param buffer The buffer where collected data is stored
     */
    public computeHash(buffer: SmartBuffer) {
        hashPart(this.sequence, buffer);
        hashPart(this.trade_id, buffer);
        hashPart(this.user_id, buffer);
        hashPart(this.state, buffer);
        hashPart(this.amount, buffer);
        hashPart(this.timestamp, buffer);
        hashPart(this.exchange_user_id, buffer);
        hashPart(this.exchange_id, buffer);
        hashPart(this.signer, buffer);
    }

    /**
     * Converts this object to its JSON representation
     */
    public toJSON(): any {
        return {
            sequence: this.sequence,
            trade_id: this.trade_id,
            user_id: this.user_id,
            state: this.state,
            amount: this.amount.toString(),
            timestamp: this.timestamp,
            exchange_user_id: this.exchange_user_id,
            exchange_id: this.exchange_id,
            signer: this.signer,
            signature: this.signature,
        };
    }

    /**
     * Creates and returns a copy of this object.
     */
    public clone(): Transaction {
        return new Transaction(
            this.sequence,
            this.trade_id,
            this.user_id,
            this.state,
            this.amount,
            this.timestamp,
            this.exchange_user_id,
            this.exchange_id,
            this.signer,
            this.signature
        );
    }

    /**
     * Sign with the wallet entered the parameters
     * @param signer Instances that can be signed
     */
    public async sign(signer: Signer) {
        this.signer = await signer.getAddress();
        const h = hashFull(this);
        this.signature = await signer.signMessage(h.data);
    }

    /**
     * Verifying the signature
     * @param address Signatory's wallet address
     */
    public verify(address?: string): boolean {
        const h = hashFull(this);
        let res: string;
        try {
            res = utils.verifyMessage(h.data, this.signature);
        } catch (error) {
            return false;
        }
        if (address !== undefined) return res.toLowerCase() === address.toLowerCase();
        return res.toLowerCase() === this.signer.toLowerCase();
    }
}
