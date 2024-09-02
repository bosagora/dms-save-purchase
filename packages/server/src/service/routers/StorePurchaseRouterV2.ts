import express from "express";
import { body, validationResult } from "express-validator";

import { CancelTransaction, NewTransaction, PurchaseDetails } from "acc-save-purchase-sdk";
import { Wallet } from "ethers";
import { WebService } from "../../modules";
import { BOACoin } from "../common/Amount";
import { Config, IAccessKeyItem } from "../common/Config";
import { logger } from "../common/Logger";
import { TransactionPool } from "../scheduler/TransactionPool";
import { DBTransaction, StorePurchaseStorage } from "../storage/StorePurchaseStorage";
import { ContractUtils } from "../utils/ContractUtils";
import { ResponseMessage } from "../utils/Errors";
import { Validation } from "../validation";
import { getLoyaltyInTransaction, ILoyaltyResponse } from "./Common";

import { BigNumber } from "@ethersproject/bignumber";
import { AddressZero } from "@ethersproject/constants";

import { PhoneNumberUtil } from "google-libphonenumber";
import { Metrics } from "../metrics/Metrics";
import { ISystemInfo, RelayClient } from "../relay/RelayClient";

import moment from "moment-timezone";

import * as hre from "hardhat";

export class StorePurchaseRouterV2 {
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
        this.app.post(
            "/v2/tx/purchase/new",
            [
                body("purchase.purchaseId").exists().notEmpty(),
                body("purchase.cashAmount").exists().trim().custom(Validation.isAmount),
                body("purchase.loyalty").exists().trim().custom(Validation.isAmount),
                body("purchase.currency").exists().notEmpty(),
                body("purchase.shopId")
                    .exists()
                    .trim()
                    .matches(/^(0x)[0-9a-f]{64}$/i),
                body("purchase.userAccount").exists(),
                body("purchase.userPhoneHash").exists(),
                body("purchase.sender").exists().trim().isEthereumAddress(),
                body("purchase.purchaseSignature")
                    .exists()
                    .trim()
                    .matches(/^(0x)[0-9a-f]{130}$/i),
                body("others.totalAmount").exists().trim().custom(Validation.isAmount),
                body("others.timestamp").exists().trim().isNumeric(),
                body("others.waiting").exists().trim().isNumeric(),
                body("details").exists().isArray({ min: 1 }),
                body("details.*.amount").custom(Validation.isAmount),
                body("details.*.providePercent").custom(Validation.isAmount),
            ],
            this.postNewPurchaseV2.bind(this)
        );
        this.app.post(
            "/v2/tx/purchase/cancel",
            [
                body("purchase.purchaseId").exists().notEmpty(),
                body("purchase.sender").exists().trim().isEthereumAddress(),
                body("purchase.purchaseSignature")
                    .exists()
                    .trim()
                    .matches(/^(0x)[0-9a-f]{130}$/i),
                body("others.timestamp").exists().trim().isNumeric(),
                body("others.waiting").exists().trim().isNumeric(),
            ],
            this.postCancelPurchaseV2.bind(this)
        );
    }

    /**
     * POST /v2/tx/purchase/new
     * @private
     */
    private async postNewPurchaseV2(req: express.Request, res: express.Response) {
        logger.http(`POST /v2/tx/purchase/new ${req.ip}:${JSON.stringify(req.body)}`);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json(ResponseMessage.getErrorMessage("2001", { validation: errors.array() }));
        }

        const shopId = String(req.body.purchase.shopId).trim();
        if (shopId.substring(0, 6) !== this._config.setting.allowedShopIdPrefix) {
            return res.status(200).json(ResponseMessage.getErrorMessage("3072"));
        }

        try {
            const client = new RelayClient(this._config);
            let userAccount = String(req.body.purchase.userAccount).trim();
            const userPhoneHash = String(req.body.purchase.userPhoneHash).trim();
            const purchaseId = String(req.body.purchase.purchaseId).trim();
            const cashAmount = BigNumber.from(req.body.purchase.cashAmount);
            const currency = String(req.body.purchase.currency).trim();
            const loyaltyValue = BigNumber.from(req.body.purchase.loyalty);
            const sender = String(req.body.purchase.sender).trim();
            const purchaseSignature = String(req.body.purchase.purchaseSignature).trim();

            const message = ContractUtils.getNewPurchaseDataMessage(
                purchaseId,
                cashAmount,
                loyaltyValue,
                currency,
                shopId,
                userAccount,
                userPhoneHash,
                sender,
                hre.network.config.chainId
            );

            const collector = ContractUtils.getAddressOfSigner(message, purchaseSignature);
            console.log(`signerAddress: ${collector}`);
            if (!this._config.setting.isCollector(sender, collector)) {
                console.log("Failed to validate signature");
                return res.status(200).json(ResponseMessage.getErrorMessage("2011"));
            }
            const delegate = this._config.setting.getDelegate(sender);
            if (delegate === undefined) {
                console.log("Failed to validate signature");
                return res.status(200).json(ResponseMessage.getErrorMessage("2011"));
            }
            console.log(`delegate: ${delegate.address}`);
            const newPurchaseSignature =
                delegate.address !== collector ? await ContractUtils.signMessage(delegate, message) : purchaseSignature;

            const details: PurchaseDetails[] = [];
            for (const elem of req.body.details) {
                if (elem.productId !== undefined && elem.amount !== undefined && elem.providePercent !== undefined) {
                    details.push(
                        new PurchaseDetails(
                            elem.productId,
                            BigNumber.from(elem.amount),
                            BigNumber.from(elem.providePercent)
                        )
                    );
                }
            }
            if (this.systemInfo === undefined) this.systemInfo = await client.getSystemInfo();

            const shopInfo = await client.getShopInfo(shopId);
            if (shopInfo !== undefined) {
                if (shopInfo.status !== 1) {
                    return res.status(200).json(ResponseMessage.getErrorMessage("2005"));
                }
            }

            const totalAmount = BigNumber.from(req.body.others.totalAmount);
            const sum = details.reduce((previous, current) => previous.add(current.amount), BigNumber.from(0));
            if (!totalAmount.eq(sum)) {
                return res.status(200).json(ResponseMessage.getErrorMessage("2004"));
            }
            const nextSequence = await this.storage.getNextSequence();
            const timestamp = BigInt(String(req.body.others.timestamp).trim());
            const waiting = BigInt(String(req.body.others.waiting).trim());
            const loyaltyCalculated = getLoyaltyInTransaction(cashAmount, totalAmount, details);

            if (!loyaltyCalculated.eq(loyaltyValue)) {
                return res.status(200).json(ResponseMessage.getErrorMessage("2012"));
            }
            const tx: NewTransaction = new NewTransaction(
                nextSequence,
                purchaseId,
                timestamp,
                waiting,
                totalAmount,
                cashAmount,
                loyaltyValue,
                currency,
                shopId,
                userAccount,
                userPhoneHash,
                details,
                sender,
                newPurchaseSignature,
                this.publisherSigner.address
            );
            await tx.sign(this.publisherSigner);
            await this.pool.add(DBTransaction.make(tx));
            logger.http(`POST /v2/tx/purchase/new transaction: ${JSON.stringify(tx)}`);

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
                } else if (userPhoneHash !== "") {
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
                        const time = moment(new Date(new Date().getTime() + Number(waiting) * 1000))
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
                            if (this._config.setting.messageEnable)
                                await client.sendSMSMessage(contents, userPhoneHash);
                            logger.info(`[SMS] ${userPhoneHash} ${contents}`);
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
                        StorePurchaseRouterV2.makeResponseData(0, {
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
                        StorePurchaseRouterV2.makeResponseData(0, {
                            tx: tx.toJSON(),
                            res: { loyalty: loyaltyPoint.toString() },
                        })
                    );
                }
            } else {
                this._metrics.add("success", 1);
                return res.json(
                    StorePurchaseRouterV2.makeResponseData(0, {
                        tx: tx.toJSON(),
                    })
                );
            }
        } catch (error) {
            logger.error("POST /v2/tx/purchase/new , " + error);
            this._metrics.add("failure", 1);
            return res.status(200).json(ResponseMessage.getErrorMessage("6000"));
        }
    }

    /**
     * POST /v2/tx/purchase/cancel
     * @private
     */
    private async postCancelPurchaseV2(req: express.Request, res: express.Response) {
        logger.http(`POST /v1/tx/purchase/cancel ${req.ip}:${JSON.stringify(req.body)}`);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json(ResponseMessage.getErrorMessage("2001", { validation: errors.array() }));
        }

        try {
            const client = new RelayClient(this._config);
            const purchaseId = String(req.body.purchase.purchaseId).trim();
            const sender = String(req.body.purchase.sender).trim();
            const message = ContractUtils.getCancelPurchaseDataMessage(purchaseId, sender, hre.network.config.chainId);
            const purchaseSignature = String(req.body.purchase.purchaseSignature).trim();

            const collector = ContractUtils.getAddressOfSigner(message, purchaseSignature);
            if (!this._config.setting.isCollector(sender, collector)) {
                return res.status(200).json(ResponseMessage.getErrorMessage("2011"));
            }

            const purchaseSigner = this._config.setting.getPurchaseSigner(sender);
            if (purchaseSigner === undefined) {
                return res.status(200).json(ResponseMessage.getErrorMessage("2011"));
            }
            const delegate = this._config.setting.getDelegate(sender);
            if (delegate === undefined) {
                return res.status(200).json(ResponseMessage.getErrorMessage("2011"));
            }
            const newPurchaseSignature =
                delegate.address !== collector ? await ContractUtils.signMessage(delegate, message) : purchaseSignature;

            const timestamp = BigInt(String(req.body.others.timestamp).trim());
            const waiting = BigInt(String(req.body.others.waiting).trim());
            const nextSequence = await this.storage.getNextSequence();
            const tx: CancelTransaction = new CancelTransaction(
                nextSequence,
                purchaseId,
                timestamp,
                waiting,
                sender,
                newPurchaseSignature,
                this.publisherSigner.address
            );

            await tx.sign(this.publisherSigner);
            await this.pool.add(DBTransaction.make(tx));
            await client.sendCancelStorePurchase(String(req.body.purchaseId).trim());
            this._metrics.add("success", 1);
            return res.json(StorePurchaseRouterV2.makeResponseData(0, { tx: tx.toJSON() }));
        } catch (error) {
            logger.error("POST /v2/tx/purchase/cancel , " + error);
            this._metrics.add("failure", 1);
            return res.status(200).json(ResponseMessage.getErrorMessage("6000"));
        }
    }
}
