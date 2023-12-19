/**
 *  The class that defines the transaction pool
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { logger } from "../common/Logger";
import { DBTransaction, StorePurchaseStorage } from "../storage/StorePurchaseStorage";

export class TransactionPool {
    /**
     * The object needed to access the database
     */
    private _storage: StorePurchaseStorage | undefined;

    /**
     * Returns the value if this._storage is defined.
     * Otherwise, exit the process.
     */
    get storage(): StorePurchaseStorage {
        if (this._storage !== undefined) return this._storage;
        else {
            logger.error("Storage is not ready yet.");
            process.exit(1);
        }
    }

    set storage(storage) {
        this._storage = storage;
    }

    /**
     * Insert transactions in the storage.
     * @param tx transaction to be added
     */
    public async add(tx: DBTransaction | DBTransaction[]) {
        try {
            if (Array.isArray(tx)) {
                await this.storage.insertTx(tx);
            } else {
                await this.storage.insertTx([tx]);
            }
        } catch (e) {
            throw new Error("TransactionPool::added error:" + e);
        }
    }

    /**
     * Query the transactions in the storage in the order in which they are entered.
     * @param length Number of transactions desired
     */
    public async get(length: number): Promise<DBTransaction[]> {
        if (length <= 0) return [];
        return this.storage.selectTxByLength(length);
    }

    /**
     * Delete transactions in the storage.
     * @param tx transaction to be deleted
     */
    public async remove(tx: DBTransaction | DBTransaction[]) {
        try {
            if (Array.isArray(tx)) {
                for (const t of tx) {
                    await this.storage.deleteTxByHash(t.hash);
                }
            } else {
                await this.storage.deleteTxByHash(tx.hash);
            }
        } catch (e) {
            throw new Error("TransactionPool::remove error:" + e);
        }
    }

    /**
     * Total number of transactions in storage
     */
    public async length(): Promise<number> {
        return this.storage.selectTxsLength();
    }
}
