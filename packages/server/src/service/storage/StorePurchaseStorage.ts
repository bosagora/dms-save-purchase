/**
 *  The class that creates, inserts and reads the data into the database.
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { Block, BlockHeader, Hash, hashFull, Transaction } from "dms-store-purchase-sdk";
import { BigNumber } from "ethers";
import { Storage } from "../../modules/storage/Storage";
import { IDatabaseConfig } from "../common/Config";
import {
    createTablesQuery,
    deleteBlockByHeightQuery,
    deleteTxByHashQuery,
    getSetting,
    insertBlockQuery,
    insertTxQuery,
    selectBlockByHeightQuery,
    selectBlockLastHeight,
    selectTxByHashQuery,
    selectTxByLengthQuery,
    selectTxsLength,
    setSetting,
} from "./schema/Schema";

export class StorePurchaseStorage extends Storage {
    constructor(databaseConfig: IDatabaseConfig, callback: (err: Error | null) => void) {
        super(databaseConfig, callback);
    }

    public createTables(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.database.exec(createTablesQuery, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    public static make(databaseConfig: IDatabaseConfig): Promise<StorePurchaseStorage> {
        return new Promise<StorePurchaseStorage>((resolve, reject) => {
            const result: StorePurchaseStorage = new StorePurchaseStorage(databaseConfig, async (err: Error | null) => {
                if (err) reject(err);
                else {
                    return resolve(result);
                }
            });
        });
    }
    public insertBlock(_block: Block, _CID: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (_block?.header === undefined) reject("The data is not available.");
            if (_CID.length <= 0) reject("The CID is not valid.");
            const cur_hash: Hash = hashFull(_block.header);
            const header: BlockHeader = _block.header;
            this.database.run(
                insertBlockQuery,
                [
                    header.height.toString(),
                    cur_hash.toString(),
                    header.prevBlock.toString(),
                    header.merkleRoot.toString(),
                    header.timestamp,
                    _CID,
                ],
                (err: Error | null) => {
                    if (err) reject(err);
                    else resolve(true);
                }
            );
        });
    }

    /**
     * Deletes blocks with a block height less than the input value
     * @param height
     */
    public deleteBlockByHeight(height: bigint): Promise<void> {
        return new Promise((resolve, reject) => {
            this.database.run(deleteBlockByHeightQuery, [height.toString()], (err: Error | null) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    public insertTx(params: DBTransaction[]): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (params.length < 1) reject("The data is not available.");
            const statement = this.database.prepare(insertTxQuery);

            params.forEach((row) => {
                statement.run([
                    row.sequence,
                    row.purchaseId,
                    row.timestamp,
                    row.amount?.toString(),
                    row.currency,
                    row.shopId,
                    row.method,
                    row.userAccount,
                    row.userPhoneHash,
                    row.signer,
                    row.signature,
                    row.hash,
                ]);
            });
            statement.finalize((err) => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }

    public selectTxByLength(length: number): Promise<DBTransaction[]> {
        return new Promise<DBTransaction[]>((resolve, reject) => {
            this.database.all(selectTxByLengthQuery, [length], (err: Error | null, row: DBTransaction[]) => {
                if (err) reject(err);
                else resolve(row.map((tx: DBTransaction) => tx as DBTransaction));
            });
        });
    }

    public selectTxByHash(hash: string): Promise<DBTransaction | null> {
        return new Promise<DBTransaction | null>((resolve, reject) => {
            this.database.all(selectTxByHashQuery, [hash], (err: Error | null, row: DBTransaction[]) => {
                if (err) reject(err);
                else resolve(row.length > 0 ? (row[0] as DBTransaction) : null);
            });
        });
    }

    public deleteTxByHash(hash: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.database.run(deleteTxByHashQuery, [hash], (err: Error | null) => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }

    public selectTxsLength(): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            this.database.all(selectTxsLength, [], (err: Error | null, row: any) => {
                if (err) reject(err);
                else resolve(row?.length ? row[0].count : null);
            });
        });
    }

    public selectLastHeight(): Promise<bigint | null> {
        return new Promise((resolve, reject) => {
            this.database.all(selectBlockLastHeight, [], (err: Error | null, row: any) => {
                if (err) reject(err);
                if (row?.length) {
                    if (row[0].height !== null) resolve(BigInt(row[0].height));
                    else resolve(null);
                } else {
                    resolve(null);
                }
            });
        });
    }

    public selectBlockByHeight(height: bigint): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.database.all(selectBlockByHeightQuery, [height.toString()], (err: Error | null, row: any) => {
                if (err) reject(err);
                else resolve(row[0]);
            });
        });
    }

    /**
     * Returns the settings stored in the database.
     * @param key   Key to Settings
     * @param defaultValue 기본값
     */
    public getSetting(key: string, defaultValue: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.database.all(getSetting, [key], (err: Error | null, row: any) => {
                if (err) reject(err);
                else resolve(row.length === 0 ? defaultValue : row[0].value);
            });
        });
    }

    /**
     * Save the settings to the database
     * @param key Key to Settings
     * @param value Value to set
     */
    public setSetting(key: string, value: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.database.all(setSetting, [key, value], (err: Error | null, row: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Return the last sequence received
     */
    public async getLastReceiveSequence(): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            this.getSetting("last_receive_sequence", "-1")
                .then((value) => resolve(Number(value)))
                .catch((e) => reject(e));
        });
    }

    /**
     * Save the last received sequence as a database
     * @param value Value to set
     */
    public async setLastReceiveSequence(value: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.setSetting("last_receive_sequence", value.toString())
                .then(() => resolve())
                .catch((e) => reject(e));
        });
    }
}

export class DBTransaction {
    public hash: string;
    public sequence: number;
    public purchaseId: string;
    public timestamp: number;
    public amount: string;
    public currency: string;
    public shopId: string;
    public method: number;
    public userAccount: string;
    public userPhoneHash: string;
    public signer: string;
    public signature: string;

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
        signature?: string,
        hash?: string
    ) {
        this.sequence = sequence;
        this.purchaseId = purchaseId;
        this.timestamp = timestamp;
        this.amount = amount.toString();
        this.currency = currency;
        this.shopId = shopId;
        this.method = method;
        this.userAccount = userAccount;
        this.userPhoneHash = userPhoneHash;
        if (signer !== undefined) this.signer = signer;
        else this.signer = "";
        if (signature !== undefined) this.signature = signature;
        else this.signature = "";
        if (hash !== undefined) this.hash = hash;
        else this.hash = "";
    }

    public static make(tx: Transaction): DBTransaction {
        return { ...tx.toJSON(), hash: hashFull(tx).toString() };
    }

    public static converterTxArray(dbTx: DBTransaction[]): Transaction[] {
        return dbTx.map(
            (row) =>
                new Transaction(
                    row.sequence,
                    row.purchaseId,
                    row.timestamp,
                    BigNumber.from(row.amount),
                    row.currency,
                    row.shopId,
                    row.method,
                    row.userAccount,
                    row.userPhoneHash,
                    row.signer,
                    row.signature
                )
        );
    }
}
