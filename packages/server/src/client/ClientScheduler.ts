// @ts-ignore
import crypto from "crypto";
import { Wallet } from "ethers";
import { Transaction, Utils } from "rollup-pm-sdk";
import { Scheduler } from "../modules";
import { Amount } from "../service/common/Amount";
import { logger } from "../service/common/Logger";
import { RollupClient } from "./Client";

export class RollupClientScheduler extends Scheduler {
    private client: RollupClient;
    private oldTimeStamp: number;
    private lastSequence: number = -1;
    private readonly signer: Wallet;
    private users: string[];
    private readonly minInterval: number;
    private readonly maxInterval: number;
    private randInterval: number;
    private blockInterval: number;

    constructor() {
        super(1);
        this.maxInterval = Number(process.env.MAXINTERVAL || "500");
        this.minInterval = Number(process.env.MININTERVAL || "5");
        this.blockInterval = Number(process.env.BLOCK_INTERVAL || "600");

        this.randInterval = 10;
        this.signer = new Wallet(process.env.SIGNER_PRIVATE_KEY || "");
        this.client = new RollupClient();
        this.oldTimeStamp = Utils.getTimeStamp();
        this.users = [
            "2022010100001",
            "2022010100002",
            "2022010100003",
            "2022010100004",
            "2022010100005",
            "2022010100006",
            "2022010100007",
            "2022010100008",
            "2022010100009",
            "2022010100010",
            "2022010200001",
            "2022010300002",
            "2022010400003",
            "2022010500004",
            "2022010600005",
            "2022010700006",
            "2022010800007",
            "2022010900008",
            "2022011000009",
            "2022011100010",
        ];
    }

    public async onStart() {
        const sequence = await this.client.getSequence();
        if (sequence >= -1) this.lastSequence = sequence;
    }

    protected override async work() {
        try {
            const newTimeStamp = Utils.getTimeStamp();

            let old_period = Math.floor(this.oldTimeStamp / this.randInterval);
            let new_period = Math.floor(newTimeStamp / this.randInterval);

            if (old_period === new_period) return;

            old_period = Math.floor(this.oldTimeStamp / 600);
            new_period = Math.floor(newTimeStamp / 600);

            if (old_period !== new_period) {
                const factor = 600 / this.blockInterval;
                this.randInterval = Math.floor(
                    (Math.log(this.minInterval + Math.random() * (this.maxInterval - this.minInterval)) * 80 - 250) /
                        factor
                );
                if (this.randInterval < 5) this.randInterval = 5;
                console.log(`interval : ${this.randInterval}`);
            }

            this.oldTimeStamp = newTimeStamp;

            const tx = await this.makeTransactions();
            console.log(`sequence : ${tx.sequence}`);
            const res = await this.client.sendTransaction(tx);
            if (res === 200) {
                this.lastSequence++;
            } else {
                const sequence = await this.client.getSequence();
                if (sequence >= -1) this.lastSequence = sequence;
            }
        } catch (error) {
            logger.error(`Failed to execute the node scheduler: ${error}`);
        }
    }

    private async makeTransactions(): Promise<Transaction> {
        const trade_id = "91313" + new Date().getTime().toString();
        const status = Math.random() <= 0.8 ? "0" : "1";
        const amount = Amount.make((Math.floor(Math.random() * 100000) / 10000).toString(), 18).value;
        const user_id = this.users[Math.floor(Math.random() * this.users.length)];
        const exchange_user_id = crypto.createHash("sha256").update(user_id, "utf8").digest().toString("hex");
        const exchange_id = "a5c19fed89739383";
        const tx = new Transaction(
            this.lastSequence + 1,
            trade_id,
            user_id,
            status,
            amount,
            Utils.getTimeStamp(),
            exchange_user_id,
            exchange_id
        );
        await tx.sign(this.signer);
        return tx;
    }
}
