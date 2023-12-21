/**
 *  Contains functions that fetch information from the last block
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { Hash } from "dms-store-purchase-sdk";
import { ethers } from "hardhat";
import { StorePurchase } from "../../../typechain-types";
import { Config } from "../common/Config";
import { StorePurchaseStorage } from "../storage/StorePurchaseStorage";

/**
 * Height and hash of the last block
 */
export interface ILastBlockInfo {
    height: bigint;
    hash: Hash;
}

/**
 * Functions that fetch information from the last block
 */
export class LastBlockInfo {
    /**
     * Returns the information of the last block stored in the database
     * @param storage instance of RollupStorage
     */
    public static async getInfoByStorage(storage: StorePurchaseStorage): Promise<ILastBlockInfo | undefined> {
        try {
            const db_last_height = await storage.selectLastHeight();
            if (db_last_height !== null) {
                const db_block = await storage.selectBlockByHeight(db_last_height);
                return { height: db_block.height, hash: new Hash(db_block.curBlock) };
            }
            return undefined;
        } catch (error) {
            return undefined;
        }
    }

    /**
     * Returns the information of the last block stored in the contract
     * @param op instance of StorePurchase contract or Config
     */
    public static async getInfoByContract(op: StorePurchase | Config): Promise<ILastBlockInfo | undefined> {
        try {
            let contract: StorePurchase;
            if (op instanceof Config) {
                const contractFactory = await ethers.getContractFactory("StorePurchase");
                contract = contractFactory.attach(op.contracts.purchaseAddress) as StorePurchase;
            } else {
                contract = op;
            }
            const last_height_bn = await contract.getLastHeight();
            const last_height: bigint = BigInt(last_height_bn.toString());

            const res = await contract.getByHeight(last_height_bn);
            const last_hash = res[1];
            return { height: last_height, hash: new Hash(last_hash) };
        } catch (error) {
            return undefined;
        }
    }

    /**
     * Returns information from the last block of a database or smart contract
     * @param storage instance of RollupStorage
     * @param contract instance of StorePurchase contract
     */
    public static async getInfo(
        storage: StorePurchaseStorage,
        contract: StorePurchase | Config
    ): Promise<ILastBlockInfo | undefined> {
        const info_storage = await LastBlockInfo.getInfoByStorage(storage);
        const info_contract = await LastBlockInfo.getInfoByContract(contract);

        if (info_contract === undefined) return info_storage;
        if (info_storage === undefined) return info_contract;

        if (info_contract.height >= info_storage.height) return info_contract;
        else return info_storage;
    }
}
