import "@nomiclabs/hardhat-ethers";
import { Wallet } from "ethers";
import { ethers, upgrades, waffle } from "hardhat";
import { StorePurchase } from "../../../typechain-types";
import { Config } from "../common/Config";

export class HardhatUtils {
    public static async deployStorePurchaseContract(config: Config, manager: Wallet): Promise<StorePurchase> {
        const provider = waffle.provider;
        const managerSigner = provider.getSigner(manager.address);

        const contractFactory = await ethers.getContractFactory("StorePurchase");
        const contract = (await upgrades.deployProxy(contractFactory.connect(managerSigner), [], {
            initializer: "initialize",
            kind: "uups",
        })) as StorePurchase;
        await contract.deployed();
        await contract.deployTransaction.wait();
        config.contracts.purchaseAddress = contract.address;
        console.log(`Deployed to ${contract.address}`);
        return contract;
    }
}
