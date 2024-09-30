import { Config } from "../common/Config";
import { IStorageManager } from "./IStorageManager";

// tslint:disable-next-line:no-var-requires
const IPFS = require("ipfs-mini");

import crypto from "crypto";
import URI from "urijs";

// tslint:disable-next-line:no-var-requires
const bs58 = require("bs58");

/**
 * Store data in IPFS.
 */
export class IPFSManager implements IStorageManager {
    private ipfs: any;
    private test: boolean;
    private config: Config;

    /**
     * Constructor
     */
    constructor(config: Config) {
        this.config = config;
        const uri = URI(config.node.ipfs_api_url);
        this.ipfs = new IPFS({ host: uri.hostname(), port: uri.port(), protocol: uri.protocol() });
        this.test = false;
    }

    /**
     * Specifies whether to use it for testing.
     * @param value
     */
    public setTest(value: boolean) {
        this.test = value;
    }

    /**
     * Store data in IPFS.
     * @param data Data to be stored.
     * @param cid
     */
    public add(data: string | Buffer, cid: string): Promise<string> {
        if (this.test) {
            return new Promise<string>((resolve, reject) => {
                crypto.randomBytes(32, (err, buf) => {
                    if (err === null) {
                        return resolve(bs58.encode(buf));
                    } else {
                        return reject(err);
                    }
                });
            });
        }
        return new Promise<string>((resolve, reject) => {
            this.ipfs.add(data, (err: any, result: string) => {
                if (err === null) {
                    return resolve(result);
                } else {
                    return reject(new Error(err));
                }
            });
        });
    }
}
