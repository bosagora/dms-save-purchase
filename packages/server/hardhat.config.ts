import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-web3";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

import * as dotenv from "dotenv";
import { Wallet } from "ethers";

dotenv.config({ path: "env/.env" });

import { HardhatAccount } from "./src/HardhatAccount";

function getAccounts() {
    const accounts: string[] = [];
    const reg_bytes64: RegExp = /^(0x)[0-9a-f]{64}$/i;

    if (
        process.env.MANAGER_KEY !== undefined &&
        process.env.MANAGER_KEY.trim() !== "" &&
        reg_bytes64.test(process.env.MANAGER_KEY)
    ) {
        accounts.push(process.env.MANAGER_KEY);
    } else {
        process.env.MANAGER_KEY = Wallet.createRandom().privateKey;
        accounts.push(process.env.MANAGER_KEY);
    }

    while (accounts.length < 50) {
        accounts.push(Wallet.createRandom().privateKey);
    }

    if (HardhatAccount.keys.length === 0) {
        for (const account of accounts) {
            HardhatAccount.keys.push(account);
        }
    }

    return accounts;
}

function getTestAccounts() {
    const defaultBalance = "2000000000000000000000000";
    const acc = getAccounts();
    return acc.map((m) => {
        return {
            privateKey: m,
            balance: defaultBalance,
        };
    });
}

const config = {
    solidity: {
        compilers: [
            {
                version: "0.8.2",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 2000,
                    },
                },
            },
        ],
    },
    networks: {
        hardhat: {
            accounts: getTestAccounts(),
            gas: 2100000,
            gasPrice: 8000000000,
        },
        main_net: {
            url: process.env.MAIN_NET_URL || "",
            chainId: 2151,
            accounts: getAccounts(),
        },
        test_net: {
            url: process.env.TEST_NET_URL || "",
            chainId: 2019,
            accounts: getAccounts(),
        },
        production_net: {
            url: process.env.PRODUCTION_NET_URL || "",
            chainId: Number(process.env.PRODUCTION_CHAIN_ID || "2151"),
            accounts: getAccounts(),
        },
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS !== undefined,
        currency: "USD",
    },
};

export default config;
