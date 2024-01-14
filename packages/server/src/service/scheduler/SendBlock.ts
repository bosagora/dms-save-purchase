/**
 *  A class that transmits block information to the blockchain.
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { NonceManager } from "@ethersproject/experimental";
import { Utils } from "dms-store-purchase-sdk";
import { Signer, Wallet } from "ethers";
import { ethers } from "hardhat";
import { StorePurchase } from "../../../typechain-types";
import { Scheduler } from "../../modules";
import { Config } from "../common/Config";
import { logger } from "../common/Logger";
import { GasPriceManager } from "../contract/GasPriceManager";
import { StorePurchaseStorage } from "../storage/StorePurchaseStorage";
import { ResponseMessage } from "../utils/Errors";

/**
 * Store the headers of blocks in a smart contract at regular intervals.
 * The header of the block is created by the class Node and stored in the database.
 */
export class SendBlock extends Scheduler {
    /**
     * The object containing the settings required to run
     */
    private _config: Config | undefined;

    /**
     * The object needed to access the database
     */
    private _storage: StorePurchaseStorage | undefined;

    /**
     * The contract object needed to save the block information
     */
    private _contract: StorePurchase | undefined;

    /**
     * This is the timestamp when the previous block was created
     */
    private old_time_stamp: number;

    /**
     * Constructor
     */
    constructor(expression: string) {
        super(expression);

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

    private get publisherSigner(): Signer {
        return new NonceManager(new GasPriceManager(new Wallet(this.config.contracts.publisherKey, ethers.provider)));
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
     * Set up multiple objects for execution
     * @param options objects for execution
     */
    public setOption(options: any) {
        if (options) {
            if (options.config && options.config instanceof Config) this._config = options.config;
            if (options.storage && options.storage instanceof StorePurchaseStorage) {
                this._storage = options.storage;
            }
        }
    }

    /**
     * Look up the new block in the DB and add the block to the StorePurchase contract.
     * @protected
     */
    protected override async work() {
        const new_time_stamp = Utils.getTimeStamp();
        try {
            const old_period = Math.floor(this.old_time_stamp / this.config.node.send_interval);
            const new_period = Math.floor(new_time_stamp / this.config.node.send_interval);

            if (old_period === new_period) return;

            this.old_time_stamp = new_time_stamp;

            if (this._contract === undefined) {
                const contractFactory = await ethers.getContractFactory("StorePurchase");
                this._contract = contractFactory.attach(this.config.contracts.purchaseAddress) as StorePurchase;
            }

            const latestHeightContract = BigInt((await this._contract.getLastHeight()).toString());
            const latestHeightDatabase = await this.storage.selectLastHeight();

            if (latestHeightDatabase === undefined) return;

            let data: any = null;
            if (latestHeightDatabase > latestHeightContract) {
                data = await this.storage.selectBlockByHeight(latestHeightContract + 1n);
                if (data === undefined) {
                    logger.error(`Lost blocks exists in the database, not stored in the blockchain.`);
                }
            }

            if (data) {
                try {
                    await this._contract
                        .connect(this.publisherSigner)
                        .add(data.height, data.curBlock, data.prevBlock, data.merkleRoot, data.timestamp, data.CID);
                    logger.info(`Successful in adding blocks to the blockchain. Height: ${data.height}`);
                } catch (err) {
                    const msg = ResponseMessage.getEVMErrorMessage(err);
                    logger.error(`SendBlock : ${msg.error.message}`);
                }
            } else {
                logger.info(`This block is not ready.`);
            }

            // Delete blocks stored in the contract from the database
            await this.storage.deleteBlockByHeight(latestHeightContract);
        } catch (error) {
            logger.error(`Failed to execute the Send Block: ${error}`);
        }
    }
}
