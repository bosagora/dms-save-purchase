import "@nomiclabs/hardhat-ethers";
import { Wallet } from "ethers";
import { ethers, upgrades, waffle } from "hardhat";
import { StorePurchase } from "../../../typechain-types";
import { Config } from "../common/Config";

import { NonceManager } from "@ethersproject/experimental";

export class HardhatUtils {
    public static async deployStorePurchaseContract(
        config: Config,
        deployer: Wallet,
        publisher: Wallet
    ): Promise<StorePurchase> {
        const provider = waffle.provider;
        const deploySigner = new NonceManager(deployer.connect(provider));

        const contractFactory = await ethers.getContractFactory("StorePurchase");
        const contract = (await upgrades.deployProxy(contractFactory.connect(deploySigner), [], {
            initializer: "initialize",
            kind: "uups",
        })) as StorePurchase;
        await contract.deployed();
        await contract.deployTransaction.wait();
        config.contracts.purchaseAddress = contract.address;
        console.log(`Deployed to ${contract.address}`);
        const tx2 = await contract.connect(deploySigner).transferOwnership(publisher.address);
        console.log(`Waiting for transferOwnership ${tx2.hash}`);
        await tx2.wait();
        return contract;
    }
}
