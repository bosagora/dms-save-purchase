import { Config } from "../common/Config";
import { IStorageManager } from "./IStorageManager";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Store data in IPFS.
 */
export class S3Manager implements IStorageManager {
    private test: boolean;
    private config: Config;
    private s3_client: S3Client;

    /**
     * Constructor
     */
    constructor(config: Config) {
        this.config = config;
        this.s3_client = new S3Client({
            region: this.config.node.s3_region,
            credentials: {
                accessKeyId: this.config.node.s3_access_key,
                secretAccessKey: this.config.node.s3_secret_key,
            },
        });
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
        return new Promise<string>((resolve, reject) => {
            const params = {
                Body: data,
                Bucket: this.config.node.s3_bucket,
                Key: cid,
            };
            const command = new PutObjectCommand(params);
            this.s3_client
                .send(command)
                .then(() => {
                    return resolve(cid);
                })
                .catch((reason) => {
                    console.error(reason);
                    return reject(new Error(reason));
                });
        });
    }
}
