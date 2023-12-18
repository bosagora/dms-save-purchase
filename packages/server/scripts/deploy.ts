// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

import { NonceManager } from "@ethersproject/experimental";
import { Wallet } from "ethers";
import { ethers } from "hardhat";
import { GasPriceManager } from "../src/service/contract/GasPriceManager";
import { RollUp } from "../typechain-types";

async function main() {
    const contractFactory = await ethers.getContractFactory("RollUp");
    const provider = ethers.provider;
    const manager = new Wallet(process.env.MANAGER_KEY || "");
    const managerSigner = new NonceManager(new GasPriceManager(provider.getSigner(manager.address)));
    const contract = (await contractFactory.connect(managerSigner).deploy()) as RollUp;
    await contract.deployed();

    console.log("deployed to (address) :", contract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
