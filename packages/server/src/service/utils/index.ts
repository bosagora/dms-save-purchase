import "@nomiclabs/hardhat-ethers";
import { Wallet } from "ethers";
import { ethers } from "hardhat";
import { RollUp } from "../../../typechain-types";
import { Config } from "../common/Config";

export class HardhatUtils {
    public static async deployRollupContract(config: Config, manager: Wallet): Promise<RollUp> {
        const provider = ethers.provider;
        const managerSigner = provider.getSigner(manager.address);
        const contractFactory = await ethers.getContractFactory("RollUp");
        const contract = (await contractFactory.connect(managerSigner).deploy()) as RollUp;
        await contract.deployed();
        config.contracts.rollup_address = contract.address;
        return contract;
    }
}
