import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { handleNetworkError } from "./ErrorTypes";
import { StorePurchaseServer } from "../../src/service/StorePurchaseServer";

export class TestRollupServer extends StorePurchaseServer {}

/**
 * This is a client for testing.
 * Test codes can easily access error messages received from the server.
 */
export class TestClient {
    private client: AxiosInstance;

    constructor(config?: AxiosRequestConfig) {
        this.client = axios.create(config);
    }

    public get(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
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

    public delete(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        return new Promise<AxiosResponse>((resolve, reject) => {
            this.client
                .delete(url, config)
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

    public post(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
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

    public put(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        return new Promise<AxiosResponse>((resolve, reject) => {
            this.client
                .put(url, data, config)
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
}

export function delay(interval: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        setTimeout(resolve, interval);
    });
}
