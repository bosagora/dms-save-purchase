/**
 *  The class that defines the transaction of a block.
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { SmartBuffer } from "smart-buffer";
import { JSONValidator } from "../../utils/JSONValidator";
import { hashFull, hashPart } from "../common/Hash";

import { Signer } from "@ethersproject/abstract-signer";
import { BigNumber } from "@ethersproject/bignumber";
import { verifyMessage } from "@ethersproject/wallet";

export enum TransactionType {
    NEW = 0,
    CANCEL = 1,
}

export interface INewTransaction {
    type: TransactionType;
    sequence: number;
    purchaseId: string;
    timestamp: number;
    amount: BigNumber;
    currency: string;
    shopId: string;
    method: number;
    userAccount: string;
    userPhoneHash: string;
    signer: string;
    signature: string;
}

export interface ICancelTransaction {
    type: TransactionType;
    sequence: number;
    purchaseId: string;
    timestamp: number;
    signer: string;
    signature: string;
}

/**
 * The class that defines the transaction of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class NewTransaction implements INewTransaction {
    public type: TransactionType;
    public sequence: number;
    public purchaseId: string;
    public timestamp: number;
    public amount: BigNumber;
    public currency: string;
    public shopId: string;
    public method: number;
    public userAccount: string;
    public userPhoneHash: string;
    public signer: string;
    public signature: string;

    /**
     * Constructor
     */
    constructor(
        sequence: number,
        purchaseId: string,
        timestamp: number,
        amount: BigNumber,
        currency: string,
        shopId: string,
        method: number,
        userAccount: string,
        userPhoneHash: string,
        signer?: string,
        signature?: string
    ) {
        this.type = TransactionType.NEW;
        this.sequence = sequence;
        this.purchaseId = purchaseId;
        this.timestamp = timestamp;
        this.amount = amount;
        this.currency = currency;
        this.shopId = shopId;
        this.method = method;
        this.userAccount = userAccount;
        this.userPhoneHash = userPhoneHash;
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

        JSONValidator.isValidOtherwiseThrow("NewTransaction", value);

        return new NewTransaction(
            value.sequence,
            value.purchaseId,
            value.timestamp,
            BigNumber.from(value.amount),
            value.currency,
            value.shopId,
            value.method,
            value.userAccount,
            value.userPhoneHash,
            value.signer,
            value.signature
        );
    }

    /**
     * Collects data to create a hash.
     * @param buffer The buffer where collected data is stored
     */
    public computeHash(buffer: SmartBuffer) {
        hashPart(this.type, buffer);
        hashPart(this.sequence, buffer);
        hashPart(this.purchaseId, buffer);
        hashPart(this.timestamp, buffer);
        hashPart(this.amount, buffer);
        hashPart(this.currency, buffer);
        hashPart(this.shopId, buffer);
        hashPart(this.method, buffer);
        hashPart(this.userAccount, buffer);
        hashPart(this.userPhoneHash, buffer);
        hashPart(this.signer, buffer);
    }

    /**
     * Converts this object to its JSON representation
     */
    public toJSON(): any {
        return {
            type: this.type,
            sequence: this.sequence,
            purchaseId: this.purchaseId,
            timestamp: this.timestamp,
            amount: this.amount.toString(),
            currency: this.currency,
            shopId: this.shopId,
            method: this.method,
            userAccount: this.userAccount,
            userPhoneHash: this.userPhoneHash,
            signer: this.signer,
            signature: this.signature,
        };
    }

    /**
     * Creates and returns a copy of this object.
     */
    public clone(): NewTransaction {
        return new NewTransaction(
            this.sequence,
            this.purchaseId,
            this.timestamp,
            this.amount,
            this.currency,
            this.shopId,
            this.method,
            this.userAccount,
            this.userPhoneHash,
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
            res = verifyMessage(h.data, this.signature);
        } catch (error) {
            return false;
        }
        if (address !== undefined) return res.toLowerCase() === address.toLowerCase();
        return res.toLowerCase() === this.signer.toLowerCase();
    }
}

export class CancelTransaction implements ICancelTransaction {
    public type: TransactionType;
    public sequence: number;
    public purchaseId: string;
    public timestamp: number;
    public signer: string;
    public signature: string;

    /**
     * Constructor
     */
    constructor(sequence: number, purchaseId: string, timestamp: number, signer?: string, signature?: string) {
        this.type = TransactionType.CANCEL;
        this.sequence = sequence;
        this.purchaseId = purchaseId;
        this.timestamp = timestamp;
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

        JSONValidator.isValidOtherwiseThrow("CancelTransaction", value);

        return new CancelTransaction(value.sequence, value.purchaseId, value.timestamp, value.signer, value.signature);
    }

    /**
     * Collects data to create a hash.
     * @param buffer The buffer where collected data is stored
     */
    public computeHash(buffer: SmartBuffer) {
        hashPart(this.type, buffer);
        hashPart(this.sequence, buffer);
        hashPart(this.purchaseId, buffer);
        hashPart(this.timestamp, buffer);
        hashPart(this.signer, buffer);
    }

    /**
     * Converts this object to its JSON representation
     */
    public toJSON(): any {
        return {
            type: this.type,
            sequence: this.sequence,
            purchaseId: this.purchaseId,
            timestamp: this.timestamp,
            signer: this.signer,
            signature: this.signature,
        };
    }

    /**
     * Creates and returns a copy of this object.
     */
    public clone(): CancelTransaction {
        return new CancelTransaction(this.sequence, this.purchaseId, this.timestamp, this.signer, this.signature);
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
            res = verifyMessage(h.data, this.signature);
        } catch (error) {
            return false;
        }
        if (address !== undefined) return res.toLowerCase() === address.toLowerCase();
        return res.toLowerCase() === this.signer.toLowerCase();
    }
}

export type Transaction = NewTransaction | CancelTransaction;
