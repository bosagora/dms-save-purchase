/**
 *  The router of dms-store-purchase-server
 *
 *  Copyright:
 *      Copyright (c) 2024 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import express from "express";
import { body, validationResult } from "express-validator";

import { CancelTransaction, NewTransaction, PurchaseDetails } from "acc-save-purchase-sdk";
import { Wallet } from "ethers";
import { WebService } from "../../modules";
import { Amount, BOACoin } from "../common/Amount";
import { Config, IAccessKeyItem } from "../common/Config";
import { logger } from "../common/Logger";
import { TransactionPool } from "../scheduler/TransactionPool";
import { DBTransaction, StorePurchaseStorage } from "../storage/StorePurchaseStorage";
import { ContractUtils } from "../utils/ContractUtils";
import { ResponseMessage } from "../utils/Errors";

import { BigNumber } from "@ethersproject/bignumber";
import { AddressZero } from "@ethersproject/constants";

import { PhoneNumberFormat, PhoneNumberUtil } from "google-libphonenumber";
import { Metrics } from "../metrics/Metrics";
import { ISystemInfo, RelayClient } from "../relay/RelayClient";

import moment from "moment-timezone";

import * as hre from "hardhat";

import { Tspec, TspecDocsMiddleware } from "tspec";

interface ILoyaltyResponse {
    loyaltyValue: BigNumber;
    loyaltyPoint: BigNumber;
    account: {
        accountType: string;
        account: string;
        currentBalance: BigNumber;
        loyaltyToBeProvided: BigNumber;
    };
}

export class StorePurchaseRouter {
    /**
     *
     * @private
     */
    private _web_service: WebService;

    /**
     * The configuration of the database
     * @private
     */
    private readonly _config: Config;
    private readonly _metrics: Metrics;

    /**
     * The transaction pool
     * @private
     */
    private readonly pool: TransactionPool;

    /**
     * The storage instance
     * @private
     */
    private readonly storage: StorePurchaseStorage;
    /**
     * Authorization pass key
     * @private
     */
    private accessKey: IAccessKeyItem[];

    /**
     * The signer needed to save the block information
     */
    private _publisherSigner: Wallet | undefined;

    private _phoneUtil: PhoneNumberUtil;

    private systemInfo: ISystemInfo | undefined;

    /**
     *
     * @param service  WebService
     * @param config Configuration
     * @param pool TransactionPool
     * @param storage RollupStorage
     * @param metrics Metrics
     */
    constructor(
        service: WebService,
        config: Config,
        pool: TransactionPool,
        storage: StorePurchaseStorage,
        metrics: Metrics
    ) {
        this._phoneUtil = PhoneNumberUtil.getInstance();
        this._web_service = service;
        this._config = config;
        this._metrics = metrics;
        this.pool = pool;
        this.storage = storage;

        this.accessKey = config.setting.accessKey.map((m) => {
            return {
                key: m.key,
                sender: m.sender,
                waiting: m.waiting,
            };
        });
    }

    private get app(): express.Application {
        return this._web_service.app;
    }

    /**
     * Make the response data
     * @param code      The result code
     * @param data      The result data
     * @param error     The error
     * @private
     */
    private static makeResponseData(code: number, data: any, error?: any): any {
        return {
            code,
            data,
            error,
        };
    }

    /**
     * Returns the value if this.publisherSigner is defined.
     * Otherwise, make signer
     */
    private get publisherSigner(): Wallet {
        if (this._publisherSigner === undefined) {
            this._publisherSigner = new Wallet(this._config.contracts.publisherKey);
        }
        return this._publisherSigner;
    }

    public async registerRoutes() {
        this.app.get("/", [], StorePurchaseRouter.getHealthStatus.bind(this));
        this.app.get("/v1/tx/sequence", [], this.getSequence.bind(this));
        this.app.post(
            "/v1/tx/purchase/new",
            [
                body("purchaseId").exists().not().isEmpty(),
                body("timestamp").exists().isNumeric(),
                body("totalAmount").exists().trim().isNumeric(),
                body("cashAmount").exists().trim().isNumeric(),
                body("currency").exists().not().isEmpty(),
                body("shopId")
                    .exists()
                    .trim()
                    .matches(/^(0x)[0-9a-f]{64}$/i),
                body("userAccount").exists(),
                body("userPhone").exists(),
                body("details").exists().isArray({ min: 1 }),
            ],
            this.postNewPurchase.bind(this)
        );
        this.app.post(
            "/v1/tx/purchase/cancel",
            [body("purchaseId").exists().not().isEmpty(), body("timestamp").exists().isNumeric()],
            this.postCancelPurchase.bind(this)
        );
        this.app.get("/metrics", [], this.getMetrics.bind(this));
        this.app.use("/docs", await TspecDocsMiddleware());
    }

    private static async getHealthStatus(req: express.Request, res: express.Response) {
        return res.status(200).json("OK");
    }

    /**
     * GET /tx/sequence
     * @private
     */
    private async getSequence(req: express.Request, res: express.Response) {
        logger.http(`GET /v1/tx/sequence`);

        try {
            const sequence = await this.storage.getLastSequence();
            return res.status(200).json(StorePurchaseRouter.makeResponseData(0, { sequence }));
        } catch (error) {
            logger.error("GET /v1/tx/sequence , " + error);
            return res.status(200).json(ResponseMessage.getErrorMessage("6000"));
        }
    }

    private getLoyaltyInTransaction(
        cashAmount: BigNumber,
        totalAmount: BigNumber,
        details: PurchaseDetails[]
    ): BigNumber {
        if (totalAmount.eq(0)) return BigNumber.from(0);
        if (cashAmount.eq(0)) return BigNumber.from(0);
        let sum: BigNumber = BigNumber.from(0);
        for (const elem of details) {
            sum = sum.add(elem.amount.mul(elem.providePercent));
        }
        const loyalty = ContractUtils.zeroGWEI(sum.mul(cashAmount).div(totalAmount).div(10000));
        return loyalty;
    }

    /**
     * POST /v1/tx/purchase/new
     * @private
     */
    private async postNewPurchase(req: express.Request, res: express.Response) {
        logger.http(`POST /v1/tx/purchase/new ${req.ip}:${JSON.stringify(req.body)}`);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json(ResponseMessage.getErrorMessage("2001", { validation: errors.array() }));
        }

        const shopId = String(req.body.shopId).trim();
        if (shopId.substring(0, 6) !== this._config.setting.allowedShopIdPrefix) {
            return res.status(200).json(ResponseMessage.getErrorMessage("3072"));
        }

        let userAccount = String(req.body.userAccount).trim();
        if (userAccount !== "") {
            const eth = /^(0x)[0-9a-f]{40}$/i;
            if (!eth.test(userAccount)) {
                return res.status(200).json(ResponseMessage.getErrorMessage("2002"));
            }
        } else {
            userAccount = AddressZero;
        }

        let userPhone = String(req.body.userPhone).trim();
        try {
            if (userPhone !== "") {
                const number = this._phoneUtil.parseAndKeepRawInput(userPhone, "ZZ");
                if (!this._phoneUtil.isValidNumber(number)) {
                    return res.status(200).json(ResponseMessage.getErrorMessage("2003"));
                } else {
                    userPhone = this._phoneUtil.format(number, PhoneNumberFormat.INTERNATIONAL);
                }
            }
        } catch (error) {
            return res.status(200).json(ResponseMessage.getErrorMessage("2003"));
        }

        let accessKey = req.get("Authorization");
        if (accessKey === undefined) accessKey = String(req.body.accessKey).trim();
        const accessKeyItem = this.accessKey.find((m) => m.key === accessKey);
        if (accessKeyItem === undefined) {
            return res.status(200).json(ResponseMessage.getErrorMessage("3051"));
        }

        try {
            const details: PurchaseDetails[] = [];
            for (const elem of req.body.details) {
                if (elem.productId !== undefined && elem.amount !== undefined && elem.providePercent !== undefined) {
                    details.push(
                        new PurchaseDetails(
                            elem.productId,
                            Amount.make(String(elem.amount).trim(), 18).value,
                            BigNumber.from(Math.floor(Number(elem.providePercent) * 100))
                        )
                    );
                }
            }
            const client = new RelayClient(this._config);
            if (this.systemInfo === undefined) this.systemInfo = await client.getSystemInfo();
            const shopInfo = await client.getShopInfo(shopId);
            if (shopInfo !== undefined) {
                if (shopInfo.status !== 1) {
                    return res.status(200).json(ResponseMessage.getErrorMessage("2005"));
                }
            }

            const totalAmount = Amount.make(String(req.body.totalAmount).trim(), 18).value;
            const cashAmount = Amount.make(String(req.body.cashAmount).trim(), 18).value;
            const sum = details.reduce((previous, current) => previous.add(current.amount), BigNumber.from(0));
            if (!totalAmount.eq(sum)) {
                return res.status(200).json(ResponseMessage.getErrorMessage("2004"));
            }
            const purchaseId = String(req.body.purchaseId).trim();
            const userPhoneHash = ContractUtils.getPhoneHash(userPhone);
            const nextSequence = await this.storage.getNextSequence();
            const currency = String(req.body.currency).trim();
            const waiting = req.body.waiting !== undefined ? Number(req.body.waiting) : accessKeyItem.waiting;
            const loyaltyValue = this.getLoyaltyInTransaction(cashAmount, totalAmount, details);
            const message = ContractUtils.getNewPurchaseDataMessage(
                purchaseId,
                cashAmount,
                loyaltyValue,
                currency,
                shopId,
                userAccount,
                userPhoneHash,
                accessKeyItem.sender,
                hre.network.config.chainId
            );
            const purchaseSignature = await ContractUtils.signMessage(this.publisherSigner, message);
            const tx: NewTransaction = new NewTransaction(
                nextSequence,
                purchaseId,
                BigInt(req.body.timestamp),
                BigInt(waiting),
                totalAmount,
                cashAmount,
                loyaltyValue,
                currency,
                shopId,
                userAccount,
                userPhoneHash,
                details,
                accessKeyItem.sender,
                purchaseSignature,
                this.publisherSigner.address
            );
            await tx.sign(this.publisherSigner);
            await this.pool.add(DBTransaction.make(tx));
            logger.http(`POST /v1/tx/purchase/new transaction: ${JSON.stringify(tx)}`);

            let loyaltyResponse: ILoyaltyResponse | undefined;

            const loyaltyPoint = await client.convertCurrency(loyaltyValue, currency, "point");
            if (loyaltyPoint !== undefined) {
                if (userAccount !== AddressZero) {
                    const result = await client.getBalanceOfAccount(userAccount);

                    if (result !== undefined) {
                        loyaltyResponse = {
                            loyaltyValue,
                            loyaltyPoint,
                            account: {
                                accountType: "address",
                                account: userAccount,
                                currentBalance: BigNumber.from(result.balance),
                                loyaltyToBeProvided: loyaltyPoint,
                            },
                        };
                    }
                } else if (userPhone !== "") {
                    const result = await client.getBalanceOfPhoneHash(userPhoneHash);

                    if (result !== undefined) {
                        if (result.account !== undefined && result.account !== AddressZero) {
                            userAccount = result.account;
                            loyaltyResponse = {
                                loyaltyValue,
                                loyaltyPoint,
                                account: {
                                    accountType: "address",
                                    account: userAccount,
                                    currentBalance: BigNumber.from(result.balance),
                                    loyaltyToBeProvided: loyaltyPoint,
                                },
                            };
                        } else {
                            loyaltyResponse = {
                                loyaltyValue,
                                loyaltyPoint,
                                account: {
                                    accountType: "phone",
                                    account: AddressZero,
                                    currentBalance: BigNumber.from(result.balance),
                                    loyaltyToBeProvided: loyaltyPoint,
                                },
                            };
                        }
                    }
                }

                if (loyaltyResponse) {
                    if (loyaltyResponse.loyaltyValue.gte(1)) {
                        const time = moment(new Date(new Date().getTime() + waiting * 1000))
                            .tz(this._config.setting.timezone)
                            .format();
                        if (loyaltyResponse.account.accountType === "address") {
                            const mobileInfo = await client.getMobileInfo(loyaltyResponse.account.account);
                            const precision = this.systemInfo !== undefined ? this.systemInfo.point.precision : 2;
                            const language =
                                mobileInfo !== undefined
                                    ? mobileInfo.language
                                    : this.systemInfo !== undefined
                                    ? this.systemInfo.language
                                    : "ko";
                            const loyaltyToBeProvided = new BOACoin(
                                BigNumber.from(loyaltyResponse.account.loyaltyToBeProvided)
                            );
                            const currentBalance = new BOACoin(BigNumber.from(loyaltyResponse.account.currentBalance));
                            let contents;
                            if (language === "ko") {
                                contents =
                                    `제공될 일시: ${time}\n` +
                                    `제공될 포인트의 량: ${loyaltyToBeProvided.toDisplayString(true, precision)}\n` +
                                    `현재 포인트 잔고: ${currentBalance.toDisplayString(true, precision)}`;
                            } else {
                                contents =
                                    `Time to be provided: ${time}\n` +
                                    `Amount to be provided: ${loyaltyToBeProvided.toDisplayString(
                                        true,
                                        precision
                                    )} POINT\n` +
                                    `Current balance: ${currentBalance.toDisplayString(true, precision)} POINT`;
                            }
                            if (this._config.setting.messageEnable)
                                await client.sendPushMessage(userAccount, 0, "Loyalty provided", contents, "provide");
                            logger.info(`[NOTIFICATION] ${userAccount} ${contents}`);
                        } else {
                            const precision = this.systemInfo !== undefined ? this.systemInfo.point.precision : 2;
                            const language = this.systemInfo !== undefined ? this.systemInfo.language : "ko";
                            const loyaltyToBeProvided = new BOACoin(
                                BigNumber.from(loyaltyResponse.account.loyaltyToBeProvided)
                            );
                            const currentBalance = new BOACoin(BigNumber.from(loyaltyResponse.account.currentBalance));
                            let contents;
                            if (language === "ko") {
                                contents =
                                    `제공될 일시: ${time}\n` +
                                    `제공될 포인트의 량: ${loyaltyToBeProvided.toDisplayString(
                                        true,
                                        precision
                                    )}  (1 POINT = 1 PHP)\n` +
                                    `현재 포인트 잔고: ${currentBalance.toDisplayString(true, precision)}`;
                            } else {
                                contents =
                                    `Time to be provided: ${time}\n` +
                                    `Amount to be provided: ${loyaltyToBeProvided.toDisplayString(
                                        true,
                                        precision
                                    )} POINT (1 POINT = 1 PHP)\n` +
                                    `Current balance: ${currentBalance.toDisplayString(true, precision)} POINT`;
                            }
                            if (this._config.setting.messageEnable) await client.sendSMSMessage(contents, userPhone);
                            logger.info(`[SMS] ${userPhone} ${contents}`);
                        }
                    }

                    await client.sendNewStorePurchase(
                        tx.purchaseId,
                        tx.timestamp.toString(),
                        tx.waiting.toString(),
                        tx.userAccount,
                        tx.userPhoneHash,
                        tx.shopId,
                        loyaltyValue.toString(),
                        tx.currency
                    );

                    return res.json(
                        StorePurchaseRouter.makeResponseData(0, {
                            tx: tx.toJSON(),
                            loyalty: {
                                loyaltyValue: loyaltyResponse.loyaltyValue.toString(),
                                loyaltyPoint: loyaltyResponse.loyaltyPoint.toString(),
                                account: {
                                    accountType: loyaltyResponse.account.accountType,
                                    account: loyaltyResponse.account.account,
                                    currentBalance: loyaltyResponse.account.currentBalance.toString(),
                                    loyaltyToBeProvided: loyaltyResponse.account.loyaltyToBeProvided.toString(),
                                },
                            },
                        })
                    );
                } else {
                    this._metrics.add("success", 1);
                    return res.json(
                        StorePurchaseRouter.makeResponseData(0, {
                            tx: tx.toJSON(),
                            res: { loyalty: loyaltyPoint.toString() },
                        })
                    );
                }
            } else {
                this._metrics.add("success", 1);
                return res.json(
                    StorePurchaseRouter.makeResponseData(0, {
                        tx: tx.toJSON(),
                    })
                );
            }
        } catch (error) {
            logger.error("POST /v1/tx/purchase/new , " + error);
            this._metrics.add("failure", 1);
            return res.status(200).json(ResponseMessage.getErrorMessage("6000"));
        }
    }

    /**
     * POST /v1/tx/purchase/cancel
     * @private
     */
    private async postCancelPurchase(req: express.Request, res: express.Response) {
        logger.http(`POST /v1/tx/purchase/cancel ${req.ip}:${JSON.stringify(req.body)}`);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json(ResponseMessage.getErrorMessage("2001", { validation: errors.array() }));
        }

        let accessKey = req.get("Authorization");
        if (accessKey === undefined) accessKey = String(req.body.accessKey).trim();
        const accessKeyItem = this.accessKey.find((m) => m.key === accessKey);
        if (accessKeyItem === undefined) {
            return res.status(200).json(ResponseMessage.getErrorMessage("3051"));
        }
        const waiting = req.body.waiting !== undefined ? Number(req.body.waiting) : accessKeyItem.waiting;

        try {
            const purchaseId = String(req.body.purchaseId).trim();
            const nextSequence = await this.storage.getNextSequence();
            const message = ContractUtils.getCancelPurchaseDataMessage(
                purchaseId,
                accessKeyItem.sender,
                hre.network.config.chainId
            );
            const purchaseSignature = await ContractUtils.signMessage(this.publisherSigner, message);

            const tx: CancelTransaction = new CancelTransaction(
                nextSequence,
                purchaseId,
                BigInt(req.body.timestamp),
                BigInt(waiting),
                accessKeyItem.sender,
                purchaseSignature,
                this.publisherSigner.address
            );

            await tx.sign(this.publisherSigner);

            await this.pool.add(DBTransaction.make(tx));

            const client = new RelayClient(this._config);
            await client.sendCancelStorePurchase(String(req.body.purchaseId).trim());

            this._metrics.add("success", 1);
            return res.json(StorePurchaseRouter.makeResponseData(0, { tx: tx.toJSON() }));
        } catch (error) {
            logger.error("POST /v1/tx/purchase/cancel , " + error);
            this._metrics.add("failure", 1);
            return res.status(200).json(ResponseMessage.getErrorMessage("6000"));
        }
    }

    /**
     * GET /metrics
     * @private
     */
    private async getMetrics(req: express.Request, res: express.Response) {
        res.set("Content-Type", this._metrics.contentType());
        this._metrics.add("status", 1);
        res.end(await this._metrics.metrics());
    }
}
