/**
 *  Includes classes that store data in IPFS
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

// tslint:disable-next-line:no-var-requires
const IPFS = require("ipfs-mini");

import crypto from "crypto";
import URI from "urijs";

// tslint:disable-next-line:no-var-requires
const bs58 = require("bs58");

/**
 * Store data in IPFS.
 */
export class IPFSManager {
    private ipfs: any;
    private test: boolean;

    /**
     * Constructor
     * @param api_url URL of the API for IPFS
     */
    constructor(api_url: string) {
        const uri = URI(api_url);
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
     */
    public add(data: string | Buffer): Promise<string> {
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
