/**
 *  Contains classes that define the scheduler that creates blocks
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { IPFSManager, Scheduler } from "../../modules";
import { Config } from "../common/Config";
import { logger } from "../common/Logger";
import { TransactionPool } from "./TransactionPool";

import { Block, Hash, hashFull, Transaction, Utils } from "dms-store-purchase-sdk";
import { DBTransaction, StorePurchaseStorage } from "../storage/StorePurchaseStorage";
import { LastBlockInfo } from "./LastBlockInfo";

/**
 * Definition of event type
 */
export interface IBlockExternalizer {
    externalize(block: Block, cid: string): void;
}

/**
 * Creates blocks at regular intervals and stores them in IPFS and databases.
 */
export class Node extends Scheduler {
    /**
     * The object containing the settings required to run
     */
    private _config: Config | undefined;

    /**
     * The object needed to store data in IPFS
     */
    private _ipfs: IPFSManager | undefined;

    /**
     * The object needed to access the database
     */
    private _storage: StorePurchaseStorage | undefined;

    /**
     * The object needed to temporarily store transactions.
     */
    private _pool: TransactionPool | undefined;

    /**
     * Registered Event Handler
     */
    public externalizer: IBlockExternalizer | undefined;

    /**
     * Hash of previously created blocks
     */
    private prev_hash: Hash;

    /**
     * Height of previously created blocks
     */
    private prev_height: bigint;

    /**
     * This is the timestamp when the previous block was created
     */
    private old_time_stamp: number;

    constructor(expression: string) {
        super(expression);
        this._pool = new TransactionPool();
        this.prev_hash = Hash.Null;
        this.prev_height = -1n;

        this.old_time_stamp = Utils.getTimeStamp();
    }

    /**
     * Returns the value if this._config is defined.
     * Otherwise, exit the process.
     */
    private get config(): Config {
        if (this._config !== undefined) return this._config;
        else {
            logger.error("Config is not ready yet.");
            process.exit(1);
        }
    }

    /**
     * Returns the value if this._ipfs is defined.
     * Otherwise, exit the process.
     */
    private get ipfs(): IPFSManager {
        if (this._ipfs !== undefined) return this._ipfs;
        else {
            logger.error("IPFSManager is not ready yet.");
            process.exit(1);
        }
    }

    /**
     * Returns the value if this._storage is defined.
     * Otherwise, exit the process.
     */
    private get storage(): StorePurchaseStorage {
        if (this._storage !== undefined) return this._storage;
        else {
            logger.error("Storage is not ready yet.");
            process.exit(1);
        }
    }

    /**
     * Returns the value if this._pool is defined.
     * Otherwise, exit the process.
     */
    private get pool(): TransactionPool {
        if (this._pool !== undefined) return this._pool;
        else {
            logger.error("TransactionPool is not ready yet.");
            process.exit(1);
        }
    }

    /**
     * Set up multiple objects for execution
     * @param options objects for execution
     */
    public setOption(options: any) {
        if (options) {
            if (options.config && options.config instanceof Config) this._config = options.config;
            if (options.storage && options.storage instanceof StorePurchaseStorage) {
                this._storage = options.storage;
            }
            if (options.pool && options.pool instanceof TransactionPool) {
                this._pool = options.pool;
            }
        }
        if (this._config !== undefined) {
            this._ipfs = new IPFSManager(this._config.node.ipfs_api_url);
            this._ipfs.setTest(this._config.node.ipfs_test);
        }
    }

    /**
     * Called when the scheduler starts.
     */
    public async onStart() {
        // Initialize the information of the previous block.
        const lastInfo = await LastBlockInfo.getInfo(this.storage, this.config);
        if (lastInfo !== undefined) {
            this.prev_height = lastInfo.height;
            this.prev_hash = lastInfo.hash;
        }
    }

    /**
     * Set the event handler.
     * @param value
     */
    public setExternalizer(value: IBlockExternalizer) {
        this.externalizer = value;
    }

    /**
     * Add a received transaction
     * @param tx received transaction
     */
    public async receive(tx: Transaction) {
        await this.pool.add(DBTransaction.make(tx));
    }

    /**
     * This function is repeatedly executed by the scheduler.
     * @protected
     */
    protected override async work() {
        const new_time_stamp = Utils.getTimeStamp();
        try {
            const old_period = Math.floor(this.old_time_stamp / this.config.node.interval);
            const new_period = Math.floor(new_time_stamp / this.config.node.interval);

            if (old_period !== new_period) {
                this.old_time_stamp = new_time_stamp;
                const txs = await this.pool.get(this.config.node.max_txs);

                // 트랜잭션이 존재하면
                if (txs.length > 0) {
                    const txList = DBTransaction.converterTxArray(txs);

                    const block = Block.createBlock(this.prev_hash, this.prev_height, txList);

                    let cid: string = "";
                    let success: boolean = true;

                    try {
                        // Save block to IPFS
                        cid = await this.ipfs.add(JSON.stringify(block));
                        logger.info(`Saved block to IPFS - height: ${block.header.height.toString()}, CID: ${cid}`);
                    } catch {
                        success = false;
                    }

                    if (success) {
                        try {
                            // Save block info to the database
                            await this.storage.insertBlock(block, cid);
                            logger.info(`Saved block to DB - height: ${block.header.height.toString()}, CID: ${cid}`);
                        } catch {
                            success = false;
                        }
                    }

                    if (success) {
                        this.prev_hash = hashFull(block.header);
                        this.prev_height = block.header.height;
                        await this.pool.remove(txs);
                        if (this.externalizer !== undefined) this.externalizer.externalize(block, cid);
                    }
                }
            }
        } catch (error) {
            logger.error(`Failed to execute the node scheduler: ${error}`);
        }
    }
}
