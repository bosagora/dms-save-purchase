/**
 *  The class that creates, inserts and reads the data into the database.
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { BigNumber } from "ethers";
import { Block, BlockHeader, Hash, hashFull, Transaction } from "rollup-pm-sdk";
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
} from "./schema/RollupSchema";

export class RollupStorage extends Storage {
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

    public static make(databaseConfig: IDatabaseConfig): Promise<RollupStorage> {
        return new Promise<RollupStorage>((resolve, reject) => {
            const result: RollupStorage = new RollupStorage(databaseConfig, async (err: Error | null) => {
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
                    header.prev_block.toString(),
                    header.merkle_root.toString(),
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
                    row.trade_id,
                    row.user_id,
                    row.state,
                    row.amount?.toString(),
                    row.timestamp,
                    row.exchange_user_id,
                    row.exchange_id,
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
            this.database.all(selectTxsLength, [], (err: Error | null, row) => {
                if (err) reject(err);
                else resolve(row?.length ? row[0].count : null);
            });
        });
    }

    public selectLastHeight(): Promise<bigint | null> {
        return new Promise((resolve, reject) => {
            this.database.all(selectBlockLastHeight, [], (err: Error | null, row) => {
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
    public trade_id: string;
    public user_id: string;
    public state: string;
    public amount: string;
    public timestamp: number;
    public exchange_user_id: string;
    public exchange_id: string;
    public signer: string;
    public signature: string;

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
        signature?: string,
        hash?: string
    ) {
        this.sequence = sequence;
        this.trade_id = trade_id;
        this.user_id = user_id;
        this.state = state;
        this.amount = amount.toString();
        this.timestamp = timestamp;
        this.exchange_user_id = exchange_user_id;
        this.exchange_id = exchange_id;
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
                    row.trade_id,
                    row.user_id,
                    row.state,
                    BigNumber.from(row.amount),
                    row.timestamp,
                    row.exchange_user_id,
                    row.exchange_id,
                    row.signer,
                    row.signature
                )
        );
    }
}
