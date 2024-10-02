import { Config } from "../common/Config";
import { IStorageManager } from "./IStorageManager";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import axios, { AxiosInstance } from "axios";

/**
 * Store data in IPFS.
 */
export class S3Manager implements IStorageManager {
    private test: boolean;
    private config: Config;
    private s3_client: S3Client;
    private axios_client: AxiosInstance;

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
        this.axios_client = axios.create({
            baseURL: `https://${this.config.node.s3_bucket}.s3.${this.config.node.s3_region}.amazonaws.com`,
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
                .catch((reason: any) => {
                    return reject(reason);
                });
        });
    }

    public exists(cid: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.axios_client
                .get(cid)
                .then((response) => {
                    return resolve(true);
                })
                .catch((reason) => {
                    if (reason.response !== undefined && reason.response.status !== undefined) {
                        if (reason.response.status === 404) return resolve(false);
                        else return reject(reason);
                    } else return reject(reason);
                });
        });
    }
}
