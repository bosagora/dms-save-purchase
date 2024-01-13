/**
 *  Main of Remote Wallet Server
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { Wallet } from "ethers";
import { HardhatAccount } from "./HardhatAccount";
import { Scheduler } from "./modules/scheduler/Scheduler";
import { Config } from "./service/common/Config";
import { logger, Logger } from "./service/common/Logger";
import { Node } from "./service/scheduler/Node";
import { SendBlock } from "./service/scheduler/SendBlock";
import { StorePurchaseStorage } from "./service/storage/StorePurchaseStorage";
import { StorePurchaseServer } from "./service/StorePurchaseServer";
import { HardhatUtils } from "./service/utils";

import { ethers } from "hardhat";

let server: StorePurchaseServer;

async function main() {
    // Create with the arguments and read from file
    const config = Config.createWithArgument();

    logger.transports.forEach((tp) => {
        tp.level = config.logging.level;
    });

    logger.info(`address: ${config.server.address}`);
    logger.info(`port: ${config.server.port}`);

    const schedulers: Scheduler[] = [];
    if (config.scheduler.enable) {
        let scheduler = config.scheduler.getScheduler("node");
        if (scheduler && scheduler.enable) {
            schedulers.push(new Node(scheduler.expression));
        }
        scheduler = config.scheduler.getScheduler("send_block");
        if (scheduler && scheduler.enable) {
            schedulers.push(new SendBlock(scheduler.expression));
        }
    }

    const storage = await StorePurchaseStorage.make(config.database);

    if (process.env.NODE_ENV !== "production") {
        const deployer = new Wallet(HardhatAccount.keys[0], ethers.provider);
        const publisher = new Wallet(HardhatAccount.keys[1], ethers.provider);

        await HardhatUtils.deployStorePurchaseContract(config, deployer, publisher);
    }

    server = new StorePurchaseServer(config, storage, schedulers);
    return server.start().catch((error: any) => {
        // handle specific listen errors with friendly messages
        switch (error.code) {
            case "EACCES":
                logger.error(`${config.server.port} requires elevated privileges`);
                break;
            case "EADDRINUSE":
                logger.error(`Port ${config.server.port} is already in use`);
                break;
            default:
                logger.error(`An error occurred while starting the server: ${error.stack}`);
        }
        process.exit(1);
    });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

process.on("SIGINT", () => {
    server.stop().then(() => {
        process.exit(0);
    });
});
