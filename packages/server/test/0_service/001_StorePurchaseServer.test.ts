import { HardhatAccount } from "../../src/HardhatAccount";
import { Scheduler } from "../../src/modules";
import { Config } from "../../src/service/common/Config";
import { LastBlockInfo } from "../../src/service/scheduler/LastBlockInfo";
import { Node } from "../../src/service/scheduler/Node";
import { SendBlock } from "../../src/service/scheduler/SendBlock";
import { StorePurchaseStorage } from "../../src/service/storage/StorePurchaseStorage";
import { StorePurchaseServer } from "../../src/service/StorePurchaseServer";
import { HardhatUtils } from "../../src/service/utils";
import { StorePurchase } from "../../typechain-types";
import { delay, TestClient } from "../helper/Utility";

import { Utils } from "dms-save-purchase-sdk";

import * as assert from "assert";
import { Wallet } from "ethers";
import { waffle } from "hardhat";
import * as path from "path";
import URI from "urijs";
import { URL } from "url";

describe("Test of StorePurchase Server", function () {
    this.timeout(1000 * 60);

    const config = new Config();
    let server: StorePurchaseServer;
    let storage: StorePurchaseStorage;
    let serverURL: string;
    let contract: StorePurchase;
    const schedulers: Scheduler[] = [];
    let accessKey: string;

    const MAX_TX_IN_BLOCK = 8;
    const BLOCK_INTERVAL = 3;
    const SEND_INTERVAL = 1;

    let client: TestClient;
    let sendURL: string;

    const deployer = new Wallet(HardhatAccount.keys[0], waffle.provider);
    const publisher = new Wallet(HardhatAccount.keys[1], waffle.provider);

    before("Load Config", () => {
        config.readFromFile(path.resolve("config", "config_test.yaml"));
        config.server.port = 9595;
        serverURL = new URL(`http://127.0.0.1:${config.server.port}`).toString();
    });

    before("Deploy Contract", async () => {
        contract = await HardhatUtils.deployStorePurchaseContract(config, deployer, publisher);
    });

    before("Create Storage", async () => {
        storage = await StorePurchaseStorage.make(config.database);
    });

    before("Init Scheduler's Config", () => {
        config.node.interval = BLOCK_INTERVAL;
        config.node.max_txs = MAX_TX_IN_BLOCK;
        config.node.ipfs_test = true;
        config.node.send_interval = SEND_INTERVAL;

        accessKey = config.setting.accessKey[0].key;
    });

    before("Create Schedulers", () => {
        schedulers.push(new Node("*/1 * * * * *"));
        schedulers.push(new SendBlock("*/1 * * * * *"));
    });

    before("Create Test Server", () => {
        server = new StorePurchaseServer(config, storage, schedulers);
    });

    before("Start Test Server", async () => {
        await storage.clearTestDB();
        await server.start();
    });

    after("Stop Test Server", async () => {
        await server.stop();
        await storage.dropTestDB();
    });

    before("Create Client", async () => {
        sendURL = URI(serverURL).directory("/v1/tx/purchase").filename("new").toString();
        client = new TestClient();
    });

    let numTx: number = 0;
    const makeMultiTransactions = async (count: number): Promise<any[]> => {
        const txs: any[] = [];

        for (let idx = 0; idx < count; idx++) {
            const tx = {
                purchaseId: "TX" + numTx.toString().padStart(10, "0"),
                timestamp: Utils.getTimeStampBigInt().toString(),
                totalAmount: 10000,
                cashAmount: 10000,
                currency: "krw",
                shopId: "0x0001d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
                userAccount: "",
                userPhone: "",
                details: [
                    {
                        productId: "PID001",
                        amount: 10000,
                        providePercent: 3.25,
                    },
                ],
            };
            txs.push(tx);
            numTx++;
        }

        return txs;
    };

    context("Step 1", () => {
        it("Send transactions", async () => {
            const txs = await makeMultiTransactions(MAX_TX_IN_BLOCK);
            for (const tx of txs) {
                const res = await client.post(sendURL, { accessKey, ...tx });
                assert.strictEqual(res.data.code, 0);
            }
        });

        it("Delay", async () => {
            await delay(2 * BLOCK_INTERVAL * 1000);
        });

        it("Check the height of the last block", async () => {
            const last_height_storage = await storage.selectLastHeight();
            assert.strictEqual(last_height_storage, 1n);

            const last_height_contract = await contract.getLastHeight();
            assert.strictEqual(last_height_contract.toString(), "1");
        });
    });

    context("Step 2", () => {
        it("Send transactions", async () => {
            const txs = await makeMultiTransactions(MAX_TX_IN_BLOCK);
            for (const tx of txs) {
                const res = await client.post(sendURL, { accessKey, ...tx });
                assert.strictEqual(res.data.code, 0);
            }
        });

        it("Delay", async () => {
            await delay(2 * BLOCK_INTERVAL * 1000);
        });

        it("Check the height of the last block", async () => {
            const last_height_storage = await storage.selectLastHeight();
            assert.strictEqual(last_height_storage, 2n);

            const last_height_contract = await contract.getLastHeight();
            assert.strictEqual(last_height_contract.toString(), "2");
        });
    });

    context("Restart Server", () => {
        it("Stop Test Server", async () => {
            await server.stop();
        });

        schedulers.length = 0;
        it("Create Schedulers", () => {
            schedulers.push(new Node("*/1 * * * * *"));
            schedulers.push(new SendBlock("*/1 * * * * *"));
        });

        it("Create Test Server", async () => {
            server = new StorePurchaseServer(config, storage, schedulers);
        });

        it("Start Test Server", async () => {
            await server.start();
        });

        it("Check the height of the last block", async () => {
            const res = await LastBlockInfo.getInfo(storage, contract);
            assert.ok(res !== undefined);
            assert.strictEqual(res.height, 2n);
        });
    });

    context("Step 3", () => {
        it("Send transactions", async () => {
            const txs = await makeMultiTransactions(MAX_TX_IN_BLOCK);
            for (const tx of txs) {
                const res = await client.post(sendURL, { accessKey, ...tx });
                assert.strictEqual(res.data.code, 0);
            }
        });

        it("Delay", async () => {
            await delay(2 * BLOCK_INTERVAL * 1000);
        });

        it("Check the height of the last block", async () => {
            const last_height_storage = await storage.selectLastHeight();
            assert.strictEqual(last_height_storage, 3n);

            const last_height_contract = await contract.getLastHeight();
            assert.strictEqual(last_height_contract.toString(), "3");
        });

        it("Check that the blocks stored in the contract have been deleted from the database", async () => {
            const res = await storage.selectBlockByHeight(3n);
            assert.notStrictEqual(res, undefined);
        });
    });
});
