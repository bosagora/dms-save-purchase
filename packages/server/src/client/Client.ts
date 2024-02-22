import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
// @ts-ignore
import URI from "urijs";
import { handleNetworkError } from "../modules/network/ErrorTypes";
import { ICancelPurchaseData, INewPurchaseData } from "./types/index";

export class StorePurchaseClient {
    private readonly accessKey: string;
    private serverURL: string;
    private client: AxiosInstance;

    constructor() {
        this.accessKey = process.env.ACCESS_KEY || "";
        this.serverURL = process.env.SERVER_URL || "";
        this.client = axios.create({
            headers: {
                Authorization: this.accessKey,
            },
        });
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
                    if (
                        res.status === 200 &&
                        res.data !== undefined &&
                        res.data.data !== undefined &&
                        res.data.data.sequence !== undefined
                    ) {
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

    public sendTransaction(tx: INewPurchaseData): Promise<number> {
        const url = URI(this.serverURL).directory("/v1/tx/purchase").filename("new").toString();
        const sendTx = tx;
        return new Promise<number>((resolve, reject) => {
            this.client
                .post(url, sendTx)
                .then((res) => {
                    console.log("Response:", JSON.stringify(res.data));
                    return resolve(res.status);
                })
                .catch((reason) => {
                    return resolve(-1);
                });
        });
    }

    public sendCancelTransaction(tx: ICancelPurchaseData): Promise<number> {
        const url = URI(this.serverURL).directory("/v1/tx/purchase").filename("cancel").toString();
        const sendTx = tx;
        return new Promise<number>((resolve, reject) => {
            this.client
                .post(url, sendTx)
                .then((res) => {
                    console.log("Response:", JSON.stringify(res.data));
                    return resolve(res.status);
                })
                .catch((reason) => {
                    return resolve(-1);
                });
        });
    }
}
