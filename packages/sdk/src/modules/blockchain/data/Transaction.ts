/**
 *  The class that defines the transaction of a block.
 *
 *  Copyright:
 *      Copyright (c) 2024 BOSAGORA Foundation All rights reserved.
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
import { IPurchaseDetails, PurchaseDetails } from "./PurchaseDetails";

export enum TransactionType {
    NEW = 0,
    CANCEL = 1,
}

export interface INewTransaction {
    type: TransactionType;
    sequence: bigint;
    purchaseId: string;
    timestamp: bigint;
    waiting: bigint;
    totalAmount: BigNumber;
    cashAmount: BigNumber;
    currency: string;
    shopId: string;
    userAccount: string;
    userPhoneHash: string;
    details: IPurchaseDetails[];
    sender: string;
    signer: string;
    signature: string;
}

export interface ICancelTransaction {
    type: TransactionType;
    sequence: bigint;
    purchaseId: string;
    timestamp: bigint;
    waiting: bigint;
    sender: string;
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
    public sequence: bigint;
    public purchaseId: string;
    public timestamp: bigint;
    public waiting: bigint;
    public totalAmount: BigNumber;
    public cashAmount: BigNumber;
    public currency: string;
    public shopId: string;
    public userAccount: string;
    public userPhoneHash: string;
    public details: PurchaseDetails[];
    public sender: string;
    public signer: string;
    public signature: string;

    /**
     * Constructor
     */
    constructor(
        sequence: string | bigint,
        purchaseId: string,
        timestamp: bigint,
        waiting: bigint,
        totalAmount: BigNumber,
        cashAmount: BigNumber,
        currency: string,
        shopId: string,
        userAccount: string,
        userPhoneHash: string,
        details: PurchaseDetails[],
        sender: string,
        signer?: string,
        signature?: string
    ) {
        this.type = TransactionType.NEW;
        this.sequence = BigInt(sequence);
        this.purchaseId = purchaseId;
        this.timestamp = timestamp;
        this.waiting = waiting;
        this.totalAmount = BigNumber.from(totalAmount);
        this.cashAmount = BigNumber.from(cashAmount);
        this.currency = currency;
        this.shopId = shopId;
        this.userAccount = userAccount;
        this.userPhoneHash = userPhoneHash;
        this.sender = sender;
        if (signer !== undefined) this.signer = signer;
        else this.signer = "";
        if (signature !== undefined) this.signature = signature;
        else this.signature = "";

        this.details = [];
        this.details.push(...details);
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

        const details: PurchaseDetails[] = [];
        for (const elem of value.details) {
            details.push(PurchaseDetails.reviver("", elem));
        }
        return new NewTransaction(
            value.sequence,
            value.purchaseId,
            BigInt(value.timestamp),
            BigInt(value.waiting),
            BigNumber.from(value.totalAmount),
            BigNumber.from(value.cashAmount),
            value.currency,
            value.shopId,
            value.userAccount,
            value.userPhoneHash,
            details,
            value.sender,
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
        hashPart(this.waiting, buffer);
        hashPart(this.totalAmount, buffer);
        hashPart(this.cashAmount, buffer);
        hashPart(this.currency, buffer);
        hashPart(this.shopId, buffer);
        hashPart(this.userAccount, buffer);
        hashPart(this.userPhoneHash, buffer);
        hashPart(this.sender, buffer);
        hashPart(this.signer, buffer);
        hashPart(this.details.length, buffer);
        for (const elem of this.details) {
            elem.computeHash(buffer);
        }
    }

    /**
     * Converts this object to its JSON representation
     */
    public toJSON(): any {
        return {
            type: this.type,
            sequence: this.sequence.toString(),
            purchaseId: this.purchaseId,
            timestamp: this.timestamp.toString(),
            waiting: this.waiting.toString(),
            totalAmount: this.totalAmount.toString(),
            cashAmount: this.cashAmount.toString(),
            currency: this.currency,
            shopId: this.shopId,
            userAccount: this.userAccount,
            userPhoneHash: this.userPhoneHash,
            sender: this.sender,
            signer: this.signer,
            signature: this.signature,
            details: this.details,
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
            this.waiting,
            this.totalAmount,
            this.cashAmount,
            this.currency,
            this.shopId,
            this.userAccount,
            this.userPhoneHash,
            this.details,
            this.sender,
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
    public sequence: bigint;
    public purchaseId: string;
    public timestamp: bigint;
    public waiting: bigint;
    public sender: string;
    public signer: string;
    public signature: string;

    /**
     * Constructor
     */
    constructor(
        sequence: string | bigint,
        purchaseId: string,
        timestamp: bigint,
        waiting: bigint,
        sender: string,
        signer?: string,
        signature?: string
    ) {
        this.type = TransactionType.CANCEL;
        this.sequence = BigInt(sequence);
        this.purchaseId = purchaseId;
        this.timestamp = timestamp;
        this.waiting = waiting;
        this.sender = sender;
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

        return new CancelTransaction(
            value.sequence,
            value.purchaseId,
            BigInt(value.timestamp),
            BigInt(value.waiting),
            value.sender,
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
        hashPart(this.waiting, buffer);
        hashPart(this.sender, buffer);
        hashPart(this.signer, buffer);
    }

    /**
     * Converts this object to its JSON representation
     */
    public toJSON(): any {
        return {
            type: this.type,
            sequence: this.sequence.toString(),
            purchaseId: this.purchaseId,
            timestamp: this.timestamp.toString(),
            waiting: this.waiting.toString(),
            sender: this.sender,
            signer: this.signer,
            signature: this.signature,
        };
    }

    /**
     * Creates and returns a copy of this object.
     */
    public clone(): CancelTransaction {
        return new CancelTransaction(
            this.sequence,
            this.purchaseId,
            this.timestamp,
            this.waiting,
            this.sender,
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

export type Transaction = NewTransaction | CancelTransaction;
