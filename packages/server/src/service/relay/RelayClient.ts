import { Config } from "../common/Config";
import { HTTPClient } from "../utils/HTTPClient";

// @ts-ignore
import URI from "urijs";

import { BigNumber } from "@ethersproject/bignumber";

import { logger } from "../common/Logger";

export interface IRelayBalance {
    account?: string;
    loyaltyType: number;
    balance: BigNumber;
}

export interface IShopInfo {
    shopId: string;
    name: string;
    currency: string;
    status: number;
    account: string;
    providedAmount: string;
    usedAmount: string;
    settledAmount: string;
    withdrawnAmount: string;
}

export class RelayClient {
    private readonly config: Config;
    private client: HTTPClient;

    constructor(config: Config) {
        this.config = config;
        this.client = new HTTPClient({
            headers: {
                Authorization: this.config.setting.relayAccessKey,
            },
        });
    }

    public async getBalanceOfAccount(account: string): Promise<IRelayBalance | undefined> {
        const url = URI(this.config.setting.relayEndpoint)
            .directory("/v1/ledger/balance/account")
            .filename(account)
            .toString();
        try {
            const response = await this.client.get(url);
            if (response.data.code !== 0) {
                logger.error(
                    `릴레이서버에서 지갑주소의 잔고를 조회하는데 실패했습니다.-[${response.data.code}-${response.data?.error?.message}]`
                );
                return undefined;
            }
            return {
                account: response.data.data.account,
                loyaltyType: response.data.data.loyaltyType,
                balance:
                    response.data.data.loyaltyType === 0
                        ? BigNumber.from(response.data.data.point.balance)
                        : BigNumber.from(response.data.data.token.balance),
            };
        } catch (error) {
            logger.error(`릴레이서버에서 지갑주소의 잔고를 조회하는데 실패했습니다.-[${error}]`);
            return undefined;
        }
    }

    public async getBalanceOfPhoneHash(phoneHash: string): Promise<IRelayBalance | undefined> {
        const url = URI(this.config.setting.relayEndpoint)
            .directory("/v1/ledger/balance/phoneHash")
            .filename(phoneHash)
            .toString();
        try {
            const response = await this.client.get(url);
            if (response.data.code !== 0) {
                logger.error(
                    `릴레이서버에서 잔고를 조회하는데 실패했습니다.-[${response.data.code}-${response.data?.error?.message}]`
                );
                return undefined;
            }
            return {
                account: response.data.data.account,
                loyaltyType: response.data.data.loyaltyType,
                balance:
                    response.data.data.loyaltyType === 0
                        ? BigNumber.from(response.data.data.point.balance)
                        : BigNumber.from(response.data.data.token.balance),
            };
        } catch (error) {
            logger.error(`릴레이서버에서 잔고를 조회하는데 실패했습니다.-[${error}]`);
        }
    }

    public async convertCurrency(amount: BigNumber, from: string, to: string): Promise<BigNumber | undefined> {
        const url = URI(this.config.setting.relayEndpoint)
            .directory("/v1/currency")
            .filename("convert")
            .addQuery("amount", amount.toString())
            .addQuery("from", from)
            .addQuery("to", to)
            .toString();
        try {
            const response = await this.client.get(url);
            if (response.data.code !== 0) {
                logger.error(
                    `릴레이서버에서 환률변환을 실패했습니다.-[${response.data.code}-${response.data?.error?.message}]`
                );
                return undefined;
            }
            return BigNumber.from(response.data.data.amount);
        } catch (error) {
            logger.error(`릴레이서버에서 환률변환을 실패했습니다.-[${error}]`);
        }
    }

    public async getShopInfo(shopId: string): Promise<IShopInfo | undefined> {
        const url = URI(this.config.setting.relayEndpoint).directory("/v1/shop/info").filename(shopId).toString();
        try {
            const response = await this.client.get(url);
            if (response.data.code !== 0) {
                logger.error(
                    `릴레이서버에서 상점정보요청에 실패했습니다.-[${response.data.code}-${response.data?.error?.message}]`
                );
                return undefined;
            }
            return response.data.data;
        } catch (error) {
            logger.error(`릴레이서버에서 상점정보요청에 실패했습니다.-[${error}]`);
        }
    }

    public async sendPushMessage(
        account: string,
        type: number,
        title: string,
        contents: string,
        contentType: string
    ): Promise<boolean> {
        const url = URI(this.config.setting.relayEndpoint).directory("/v1/mobile").filename("send").toString();
        const params = {
            account,
            type,
            title,
            contents,
            contentType,
        };

        try {
            const response = await this.client.post(url, params);
            if (response.data.code !== 0) {
                logger.error(
                    `릴레이서버로 푸쉬메세지를 전달하는데 실패하였습니다.-[${response.data.code}-${response.data?.error?.message}]`
                );
                return false;
            }
            return true;
        } catch (error) {
            logger.error(`릴레이서버로 푸쉬메세지를 전달하는데 실패하였습니다.-[${error}]`);
            return false;
        }
    }

    public async sendSMSMessage(msg: string, receiver: string): Promise<boolean> {
        const url = URI(this.config.setting.smsEndpoint).filename("send").toString();
        const params = {
            msg,
            sender: this.config.setting.smsSender,
            receiver,
        };

        const client = new HTTPClient({
            headers: {
                Authorization: this.config.setting.smsAccessKey,
            },
        });
        try {
            const response = await client.post(url, params);
            if (response.data.code !== 200) {
                logger.error(
                    `SMS 메세지를 전달하는데 실패하였습니다.-[${response.data.code}-${response.data?.error?.message}]`
                );
                return false;
            }
            return true;
        } catch (error) {
            logger.error(`SMS 메세지를 전달하는데 실패하였습니다.-[${error}]`);
            return false;
        }
    }

    public async sendNewStorePurchase(
        purchaseId: string,
        timestamp: string,
        waiting: string,
        account: string,
        phone: string,
        shopId: string,
        loyaltyValue: string,
        currency: string
    ): Promise<boolean> {
        const url = URI(this.config.setting.relayEndpoint).directory("v1/purchase").filename("save").toString();
        const params = {
            purchaseId,
            timestamp,
            waiting,
            account,
            phone,
            shopId,
            loyaltyValue,
            currency,
        };

        try {
            const response = await this.client.post(url, params);
            if (response.data.code !== 0) {
                logger.error(
                    `릴레이서버로 신규 구매정보를 전달하는데 실패하였습니다.-[${response.data.code}-${response.data?.error?.message}]`
                );
                return false;
            }
            return true;
        } catch (error) {
            logger.error(`릴레이서버로 신규 구매정보를 전달하는데 실패하였습니다.-[${error}]`);
            return false;
        }
    }

    public async sendCancelStorePurchase(purchaseId: string): Promise<boolean> {
        const url = URI(this.config.setting.relayEndpoint).directory("v1/purchase").filename("cancel").toString();
        const params = {
            purchaseId,
        };

        try {
            const response = await this.client.post(url, params);
            if (response.data.code !== 0) {
                logger.error(
                    `릴레이서버로 취소 구매정보를 전달하는데 실패하였습니다.-[${response.data.code}-${response.data?.error?.message}]`
                );
                return false;
            }
            return true;
        } catch (error) {
            logger.error(`릴레이서버로 취소 구매정보를 전달하는데 실패하였습니다.-[${error}]`);
            return false;
        }
    }
}
