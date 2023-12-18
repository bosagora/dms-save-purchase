/**
 *  Contains functions that fetch information from the last block
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { ethers } from "hardhat";
import { Hash } from "rollup-pm-sdk";
import { RollUp } from "../../../typechain-types";
import { Config } from "../common/Config";
import { uint64max } from "../common/Utils";
import { RollupStorage } from "../storage/RollupStorage";

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
    public static async getInfoByStorage(storage: RollupStorage): Promise<ILastBlockInfo | undefined> {
        try {
            const db_last_height = await storage.selectLastHeight();
            if (db_last_height !== null) {
                const db_block = await storage.selectBlockByHeight(db_last_height);
                return { height: db_block.height, hash: new Hash(db_block.cur_block) };
            }
            return undefined;
        } catch (error) {
            return undefined;
        }
    }

    /**
     * Returns the information of the last block stored in the contract
     * @param op instance of RollUp contract or Config
     */
    public static async getInfoByContract(op: RollUp | Config): Promise<ILastBlockInfo | undefined> {
        try {
            let contract: RollUp;
            if (op instanceof Config) {
                const contractFactory = await ethers.getContractFactory("RollUp");
                contract = contractFactory.attach(op.contracts.rollup_address) as RollUp;
            } else {
                contract = op;
            }
            const last_height_bn = await contract.getLastHeight();
            if (last_height_bn.toString() === uint64max) return undefined;
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
     * @param contract instance of RollUp contract
     */
    public static async getInfo(
        storage: RollupStorage,
        contract: RollUp | Config
    ): Promise<ILastBlockInfo | undefined> {
        const info_storage = await LastBlockInfo.getInfoByStorage(storage);
        const info_contract = await LastBlockInfo.getInfoByContract(contract);

        if (info_contract === undefined) return info_storage;
        if (info_storage === undefined) return info_contract;

        if (info_contract.height >= info_storage.height) return info_contract;
        else return info_storage;
    }
}
