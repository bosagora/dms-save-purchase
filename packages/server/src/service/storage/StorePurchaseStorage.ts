import {
    Block,
    BlockHeader,
    CancelTransaction,
    Hash,
    hashFull,
    NewTransaction,
    Transaction,
    TransactionType,
    Utils,
} from "acc-save-purchase-sdk";
import { IDatabaseConfig } from "../common/Config";
import { Storage } from "./Storage";

import MybatisMapper from "mybatis-mapper";

import path from "path";

/**
 * The class that inserts and reads the ledger into the database.
 */
export class StorePurchaseStorage extends Storage {
    constructor(config: IDatabaseConfig) {
        super(config);
    }

    public async initialize() {
        await super.initialize();
        MybatisMapper.createMapper([path.resolve(Utils.getInitCWD(), "src/service/storage/mapper/table.xml")]);
        MybatisMapper.createMapper([path.resolve(Utils.getInitCWD(), "src/service/storage/mapper/blocks.xml")]);
        MybatisMapper.createMapper([path.resolve(Utils.getInitCWD(), "src/service/storage/mapper/transactions.xml")]);
        await this.createTables();
    }

    public static async make(config: IDatabaseConfig): Promise<StorePurchaseStorage> {
        const storage = new StorePurchaseStorage(config);
        await storage.initialize();
        return storage;
    }

    public createTables(): Promise<any> {
        return this.queryForMapper("table", "create_table", {});
    }

    public async clearTestDB(): Promise<any> {
        await this.queryForMapper("table", "clear_table", {});
    }

    public async dropTestDB(): Promise<any> {
        await this.queryForMapper("table", "drop_table", {});
    }

    public async insertBlock(block: Block, CID: string) {
        if (block?.header === undefined) throw new Error("The data is not available.");
        if (CID.length <= 0) throw new Error("The CID is not valid.");

        const cur_hash: Hash = hashFull(block.header);
        const header: BlockHeader = block.header;
        await this.queryForMapper("blocks", "post", {
            height: header.height.toString(),
            curBlock: cur_hash.toString(),
            prevBlock: header.prevBlock.toString(),
            merkleRoot: header.merkleRoot.toString(),
            timestamp: header.timestamp.toString(),
            CID,
        });
    }

    public async deleteBlockByHeight(height: bigint) {
        await this.queryForMapper("blocks", "deleteByHeight", { height: height.toString() });
    }

    public async insertTx(txs: DBTransaction[]): Promise<boolean> {
        if (txs.length < 1) throw new Error("The data is not available.");

        await this.queryForMapper("transactions", "post", {
            txs: txs.map((m) => {
                return {
                    sequence: m.sequence,
                    contents: m.contents,
                    hash: m.hash,
                };
            }) as any,
        });

        return true;
    }

    public async selectTxByLength(length: number): Promise<DBTransaction[]> {
        const res = await this.queryForMapper("transactions", "getList", { length });
        return res.rows.map((m: any) => new DBTransaction(m.sequence, m.contents.replace(/[\\]/gi, ""), m.hash));
    }

    public async selectTxByHash(hash: string): Promise<DBTransaction | undefined> {
        const res = await this.queryForMapper("transactions", "get", { hash });
        return res.rows.length === 0
            ? undefined
            : new DBTransaction(res.rows[0].sequence, res.rows[0].contents.replace(/[\\]/gi, ""), res.rows[0].hash);
    }

    public async deleteTxByHash(hash: string): Promise<boolean> {
        await this.queryForMapper("transactions", "delete", { hash });
        return true;
    }

    public async selectTxsLength(): Promise<number> {
        const res = await this.queryForMapper("transactions", "length", {});
        return res.rows.length === 0 ? 0 : Number(res.rows[0].count);
    }

    public async selectLastHeight(): Promise<bigint | undefined> {
        const res = await this.queryForMapper("blocks", "getLatestHeight", {});
        return res.rows.length === 0 ? undefined : BigInt(res.rows[0].height);
    }

    public async selectBlockByHeight(height: bigint): Promise<any> {
        const res = await this.queryForMapper("blocks", "getByHeight", { height: height.toString() });
        return res.rows.length === 0 ? undefined : res.rows[0];
    }

    public async getLastSequence(): Promise<bigint> {
        const res = await this.queryForMapper("transactions", "getLastSequence", {});
        return res.rows.length === 0 ? BigInt(0) : BigInt(res.rows[0].value);
    }

    public async getNextSequence(): Promise<bigint> {
        const res = await this.queryForMapper("transactions", "getNextSequence", {});
        return res.rows.length === 0 ? BigInt(0) : BigInt(res.rows[0].value);
    }

    public async clear() {
        await this.queryForMapper("table", "clear_table", {});
    }
}

export class DBTransaction {
    public hash: string;
    public sequence: bigint;
    public contents: string;

    constructor(sequence: bigint | string | number, contents: string, hash?: string) {
        this.sequence = BigInt(sequence);
        this.contents = contents;
        if (hash !== undefined) this.hash = hash;
        else this.hash = "";
    }

    public static make(tx: Transaction): DBTransaction {
        return { sequence: BigInt(tx.sequence), contents: JSON.stringify(tx.toJSON()), hash: hashFull(tx).toString() };
    }

    public static converterTxArray(dbTx: DBTransaction[]): Transaction[] {
        const txs: Transaction[] = [];

        for (const row of dbTx) {
            const object = JSON.parse(row.contents);
            if (object.type === TransactionType.NEW) txs.push(NewTransaction.reviver("", object));
            else if (object.type === TransactionType.CANCEL) txs.push(CancelTransaction.reviver("", object));
        }

        return txs;
    }
}
