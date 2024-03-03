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

import { CancelTransaction, NewTransaction, PurchaseDetails } from "dms-store-purchase-sdk";
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
import { RelayClient } from "../relay/RelayClient";

interface ILoyaltyResponse {
    loyaltyValue: BigNumber;
    loyaltyPoint: BigNumber;
    account: {
        accountType: string;
        account: string;
        loyaltyType: number;
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

    /**
     *
     * @param service  WebService
     * @param config Configuration
     * @param pool TransactionPool
     * @param storage RollupStorage
     */
    constructor(service: WebService, config: Config, pool: TransactionPool, storage: StorePurchaseStorage) {
        this._phoneUtil = PhoneNumberUtil.getInstance();
        this._web_service = service;
        this._config = config;
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

    public registerRoutes() {
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
            const shopId = String(req.body.shopId).trim();
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
            const userPhoneHash = ContractUtils.getPhoneHash(userPhone);
            const nextSequence = await this.storage.getNextSequence();
            const currency = String(req.body.currency).trim();
            const waiting = req.body.waiting !== undefined ? Number(req.body.waiting) : accessKeyItem.waiting;
            const tx: NewTransaction = new NewTransaction(
                nextSequence,
                String(req.body.purchaseId).trim(),
                BigInt(req.body.timestamp),
                BigInt(waiting),
                totalAmount,
                cashAmount,
                currency,
                shopId,
                userAccount,
                userPhoneHash,
                details,
                accessKeyItem.sender,
                this.publisherSigner.address
            );
            await tx.sign(this.publisherSigner);
            await this.pool.add(DBTransaction.make(tx));
            logger.http(`POST /v1/tx/purchase/new transaction: ${JSON.stringify(tx)}`);

            let loyaltyResponse: ILoyaltyResponse | undefined;

            const loyaltyValue = this.getLoyaltyInTransaction(tx);
            let loyaltyPoint: BigNumber | undefined;
            if (currency === "krw") {
                loyaltyPoint = loyaltyValue;
            } else {
                loyaltyPoint = await client.convertCurrency(loyaltyValue, currency, "point");
            }

            if (loyaltyPoint !== undefined) {
                if (userAccount !== AddressZero) {
                    const result = await client.getBalanceOfAccount(userAccount);
                    if (result !== undefined) {
                        let loyalty: BigNumber = loyaltyPoint;
                        if (result.loyaltyType === 1) {
                            const value = await client.convertCurrency(
                                loyaltyPoint,
                                "point",
                                this._config.setting.tokenSymbol
                            );
                            if (value !== undefined) loyalty = value;
                            else {
                                result.loyaltyType = 1;
                                loyalty = loyaltyPoint;
                            }
                        }
                        loyaltyResponse = {
                            loyaltyValue,
                            loyaltyPoint,
                            account: {
                                accountType: "address",
                                account: userAccount,
                                loyaltyType: result.loyaltyType,
                                currentBalance: BigNumber.from(result.balance),
                                loyaltyToBeProvided: loyalty,
                            },
                        };
                    }
                } else if (userPhone !== "") {
                    const result = await client.getBalanceOfPhone(userPhoneHash);
                    if (result !== undefined) {
                        if (result.account !== undefined) {
                            userAccount = result.account;
                            let loyalty: BigNumber = loyaltyPoint;
                            if (result.loyaltyType === 1) {
                                const value = await client.convertCurrency(
                                    loyaltyPoint,
                                    "point",
                                    this._config.setting.tokenSymbol
                                );
                                if (value !== undefined) loyalty = value;
                                else {
                                    result.loyaltyType = 1;
                                    loyalty = loyaltyPoint;
                                }
                            }
                            loyaltyResponse = {
                                loyaltyValue,
                                loyaltyPoint,
                                account: {
                                    accountType: "address",
                                    account: userAccount,
                                    loyaltyType: result.loyaltyType,
                                    currentBalance: BigNumber.from(result.balance),
                                    loyaltyToBeProvided: loyalty,
                                },
                            };
                        } else {
                            loyaltyResponse = {
                                loyaltyValue,
                                loyaltyPoint,
                                account: {
                                    accountType: "phone",
                                    account: userPhoneHash,
                                    loyaltyType: 0,
                                    currentBalance: BigNumber.from(result.balance),
                                    loyaltyToBeProvided: loyaltyPoint,
                                },
                            };
                        }
                    }
                }

                if (loyaltyResponse) {
                    if (loyaltyResponse.loyaltyValue.gte(1)) {
                        if (loyaltyResponse.account.accountType === "address") {
                            const unit =
                                loyaltyResponse.account.loyaltyType === 0
                                    ? "POINT"
                                    : loyaltyResponse.account.loyaltyType === 1
                                    ? "TOKEN"
                                    : "";
                            const precision = loyaltyResponse.account.loyaltyType === 0 ? 0 : 2;
                            const loyaltyAmount = new BOACoin(
                                BigNumber.from(loyaltyResponse.account.loyaltyToBeProvided)
                            );
                            const currentBalance = new BOACoin(BigNumber.from(loyaltyResponse.account.currentBalance));
                            const contents =
                                `결제가 완료되는 8일 뒤에 ${loyaltyAmount.toDisplayString(
                                    true,
                                    precision
                                )} ${unit} 적립됩니다.` +
                                `현재 잔액은 ${currentBalance.toDisplayString(
                                    true,
                                    precision
                                )} ${unit} 입니다. 토큰은 시세에 따라서 다소 차이가 생길 수 있습니다.`;
                            if (this._config.setting.messageEnable)
                                await client.sendPushMessage(userAccount, 0, "로열티 적립", contents, "provide");
                            logger.info("[NOTIFICATION]" + contents);
                        } else {
                            const unit = "POINT";
                            const precision = 0;
                            const loyaltyToBeProvided = new BOACoin(
                                BigNumber.from(loyaltyResponse.account.loyaltyToBeProvided)
                            );
                            const currentBalance = new BOACoin(BigNumber.from(loyaltyResponse.account.currentBalance));
                            const contents =
                                `결제가 완료되는 8일 뒤에 ${loyaltyToBeProvided.toDisplayString(
                                    true,
                                    precision
                                )} ${unit}가 적립됩니다.\n` +
                                `현재 잔액은 ${currentBalance.toDisplayString(true, precision)} ${unit} 입니다.`;
                            if (this._config.setting.messageEnable) await client.sendSMSMessage(contents, userPhone);
                            logger.info("[SMS]" + contents);
                        }
                    }

                    await client.sendNewStorePurchase(
                        tx.purchaseId,
                        tx.timestamp.toString(),
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
                                    loyaltyType: loyaltyResponse.account.loyaltyType,
                                    currentBalance: loyaltyResponse.account.currentBalance.toString(),
                                    loyaltyToBeProvided: loyaltyResponse.account.loyaltyToBeProvided.toString(),
                                },
                            },
                        })
                    );
                } else {
                    return res.json(
                        StorePurchaseRouter.makeResponseData(0, {
                            tx: tx.toJSON(),
                            res: { loyalty: loyaltyPoint.toString() },
                        })
                    );
                }
            } else {
                return res.json(
                    StorePurchaseRouter.makeResponseData(0, {
                        tx: tx.toJSON(),
                    })
                );
            }
        } catch (error) {
            logger.error("POST /v1/tx/purchase/new , " + error);
            return res.status(200).json(ResponseMessage.getErrorMessage("6000"));
        }
    }

    private getLoyaltyInTransaction(tx: NewTransaction): BigNumber {
        if (tx.totalAmount.eq(0)) return BigNumber.from(0);
        if (tx.cashAmount.eq(0)) return BigNumber.from(0);
        let sum: BigNumber = BigNumber.from(0);
        for (const elem of tx.details) {
            sum = sum.add(elem.amount.mul(elem.providePercent));
        }
        const loyalty = ContractUtils.zeroGWEI(sum.mul(tx.cashAmount).div(tx.totalAmount).div(10000));
        return loyalty;
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
            const nextSequence = await this.storage.getNextSequence();

            const tx: CancelTransaction = new CancelTransaction(
                nextSequence,
                String(req.body.purchaseId).trim(),
                BigInt(req.body.timestamp),
                BigInt(waiting),
                this.publisherSigner.address,
                accessKeyItem.sender
            );

            await tx.sign(this.publisherSigner);

            await this.pool.add(DBTransaction.make(tx));

            const client = new RelayClient(this._config);
            await client.sendCancelStorePurchase(String(req.body.purchaseId).trim());

            return res.json(StorePurchaseRouter.makeResponseData(0, { tx: tx.toJSON() }));
        } catch (error) {
            logger.error("POST /v1/tx/purchase/cancel , " + error);
            return res.status(200).json(ResponseMessage.getErrorMessage("6000"));
        }
    }
}
