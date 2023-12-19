import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { Transaction } from "dms-store-purchase-sdk";
// @ts-ignore
import URI from "urijs";
import { handleNetworkError } from "../modules/network/ErrorTypes";

export class RollupClient {
    private readonly token: string;
    private serverURL: string;
    private client: AxiosInstance;

    constructor() {
        this.token = process.env.ACCESS_SECRET || "";
        this.serverURL = process.env.SERVER_URL || "";
        this.client = axios.create({ headers: { Authorization: this.token } });
    }

    private get(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        return new Promise<AxiosResponse>((resolve, reject) => {
            this.client
                .get(url, config)
                .then((response: AxiosResponse) => {
                    resolve(response);
                })
                .catch((reason: any) => {
                    if (reason.response !== undefined && reason.response.status !== undefined) {
                        resolve(reason.response);
                    } else {
                        reject(handleNetworkError(reason));
                    }
                });
        });
    }

    private post(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        return new Promise<AxiosResponse>((resolve, reject) => {
            this.client
                .post(url, data, config)
                .then((response: AxiosResponse) => {
                    resolve(response);
                })
                .catch((reason: any) => {
                    if (reason.response !== undefined && reason.response.status !== undefined) {
                        resolve(reason.response);
                    } else {
                        reject(handleNetworkError(reason));
                    }
                });
        });
    }

    public getSequence(): Promise<number> {
        const url = URI(this.serverURL).directory("v1/tx/sequence").toString();
        return new Promise<number>((resolve, reject) => {
            this.client
                .get(url)
                .then((res) => {
                    if (res.status === 200 && res.data && res.data.data && res.data.data.sequence) {
                        return resolve(res.data.data.sequence);
                    } else {
                        return resolve(-2);
                    }
                })
                .catch((reason) => {
                    return resolve(-2);
                });
        });
    }

    public sendTransaction(tx: Transaction): Promise<number> {
        const url = URI(this.serverURL).directory("v1/tx/record").toString();
        const sendTx = tx.toJSON();
        return new Promise<number>((resolve, reject) => {
            this.client
                .post(url, sendTx)
                .then((res) => {
                    return resolve(res.status);
                })
                .catch((reason) => {
                    return resolve(-1);
                });
        });
    }
}
