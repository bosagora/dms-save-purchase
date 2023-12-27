/**
 *  The router of dms-store-purchase-server
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import express from "express";
import { body, validationResult } from "express-validator";

import { CancelTransaction, NewTransaction, PurchaseDetails, TransactionType } from "dms-store-purchase-sdk";
import { Wallet } from "ethers";
import { WebService } from "../../modules";
import { Amount, BOACoin } from "../common/Amount";
import { Config } from "../common/Config";
import { logger } from "../common/Logger";
import { TransactionPool } from "../scheduler/TransactionPool";
import { DBTransaction, StorePurchaseStorage } from "../storage/StorePurchaseStorage";
import { ContractUtils } from "../utils/ContractUtils";
import { ResponseMessage } from "../utils/Errors";

import { BigNumber } from "@ethersproject/bignumber";
import { AddressZero } from "@ethersproject/constants";

import { PhoneNumberFormat, PhoneNumberUtil } from "google-libphonenumber";
import { HTTPClient } from "../utils/HTTPClient";
import { RelayClient } from "../relay/RelayClient";

// tslint:disable-next-line:no-var-requires
const URI = require("urijs");

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
    private static accessKey: string;

    /**
     * Sequence of the last received transaction
     * @private
     */
    private lastReceiveSequence: bigint;

    /**
     * The signer needed to save the block information
     */
    private _managerSigner: Wallet | undefined;

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

        StorePurchaseRouter.accessKey = config.setting.accessKey;
        this.lastReceiveSequence = -1n;
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
     * Returns the value if this._managerSigner is defined.
     * Otherwise, make signer
     */
    private get managerSigner(): Wallet {
        if (this._managerSigner === undefined) {
            this._managerSigner = new Wallet(this._config.contracts.managerKey);
        }
        return this._managerSigner;
    }

    public registerRoutes() {
        this.app.get("/", [], StorePurchaseRouter.getHealthStatus.bind(this));
        this.app.get("/v1/tx/sequence", [], this.getSequence.bind(this));
        this.app.post(
            "/v1/tx/purchase/new",
            [
                body("accessKey").exists(),
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
            [
                body("accessKey").exists(),
                body("purchaseId").exists().not().isEmpty(),
                body("timestamp").exists().isNumeric(),
            ],
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
            const sequence = await this.storage.getLastReceiveSequence();
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
        logger.http(`POST /v1/tx/purchase/new`);

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
        if (userPhone !== "") {
            const number = this._phoneUtil.parseAndKeepRawInput(userPhone, "ZZ");
            if (!this._phoneUtil.isValidNumber(number)) {
                return res.status(200).json(ResponseMessage.getErrorMessage("2003"));
            } else {
                userPhone = this._phoneUtil.format(number, PhoneNumberFormat.INTERNATIONAL);
            }
        }

        const accessKey: string = String(req.body.accessKey).trim();
        if (accessKey !== this._config.setting.accessKey) {
            return res.status(200).json(ResponseMessage.getErrorMessage("3051"));
        }

        try {
            if (this.lastReceiveSequence === -1n) {
                this.lastReceiveSequence = await this.storage.getLastReceiveSequence();
            }

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

            const userPhoneHash = ContractUtils.getPhoneHash(userPhone);
            const tx: NewTransaction = new NewTransaction(
                this.lastReceiveSequence + 1n,
                String(req.body.purchaseId).trim(),
                Number(req.body.timestamp),
                Amount.make(String(req.body.totalAmount).trim(), 18).value,
                Amount.make(String(req.body.cashAmount).trim(), 18).value,
                String(req.body.currency).trim(),
                String(req.body.shopId).trim(),
                userAccount,
                userPhoneHash,
                details,
                this.managerSigner.address
            );

            await tx.sign(this.managerSigner);

            await this.pool.add(DBTransaction.make(tx));
            await this.storage.setLastReceiveSequence(tx.sequence);
            this.lastReceiveSequence = tx.sequence;

            let loyalty = this.getLoyaltyInTransaction(tx);
            if (loyalty.gt(1)) {
                const client = new RelayClient(this._config);
                if (userAccount !== AddressZero) {
                    const result = await client.getBalanceOfAccount(userAccount);
                    if (result !== undefined) {
                        if (result.loyaltyType === 1) {
                            const value = await client.convertCurrency(
                                loyalty,
                                "point",
                                this._config.setting.tokenSymbol
                            );
                            if (value !== undefined) loyalty = value;
                        }
                        const unit = result.loyaltyType === 0 ? "포인트" : result.loyaltyType === 1 ? "토큰" : "";
                        const precision = result.loyaltyType === 0 ? 0 : 2;
                        const loyaltyAmount = new BOACoin(BigNumber.from(loyalty));
                        const currentBalance = new BOACoin(BigNumber.from(result.balance));
                        const contents =
                            `결제가 완료되는 8일 뒤에 ${loyaltyAmount.toDisplayString(
                                true,
                                precision
                            )} ${unit} 적립됩니다.` +
                            `현제 잔액은 ${currentBalance.toDisplayString(
                                true,
                                precision
                            )} ${unit} 입니다. 토큰은 시세에 따라서 다소 차이가 생길 수 있습니다.`;
                        if (this._config.setting.messageEnable)
                            await client.sendPushMessage(userAccount, 0, "로열티 적립", contents);
                        logger.info("[NOTIFICATION]" + contents);
                    }
                } else if (userPhone !== "") {
                    const result = await client.getBalanceOfPhone(userPhoneHash);
                    if (result !== undefined) {
                        const unit = "포인트";
                        const precision = 0;
                        const loyaltyAmount = new BOACoin(BigNumber.from(loyalty));
                        const currentBalance = new BOACoin(BigNumber.from(result.balance));
                        const contents =
                            `결제가 완료되는 8일 뒤에 ${loyaltyAmount.toDisplayString(
                                true,
                                precision
                            )} ${unit}가 적립됩니다.\n` +
                            `현제 잔액은 ${currentBalance.toDisplayString(true, precision)} ${unit} 입니다.`;
                        if (this._config.setting.messageEnable)
                            await client.sendSMSMessage(contents, "+82 10-9520-1803");
                        logger.info("[SMS]" + contents);
                    }
                }
            }
            return res.json(StorePurchaseRouter.makeResponseData(0, tx.toJSON()));
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
        const loyalty = sum.mul(tx.cashAmount).div(tx.totalAmount).div(10000);
        return loyalty;
    }

    private async getBalanceOfAccount(account: string): Promise<{ loyaltyType: number; balance: BigNumber }> {
        const client = new HTTPClient();
        const url = URI(this._config.setting.relayEndpoint)
            .directory("/v1/payment/user")
            .filename("balance")
            .addQuery("account", account)
            .toString();
        const response = await client.get(url);
        return { loyaltyType: response.data.data.loyaltyType, balance: BigNumber.from(response.data.data.balance) };
    }

    private async getBalanceOfPhone(phone: string): Promise<BigNumber> {
        const client = new HTTPClient();
        const url = URI(this._config.setting.relayEndpoint)
            .directory("/v1/payment/phone")
            .filename("balance")
            .addQuery("account", phone)
            .toString();
        const response = await client.get(url);
        return BigNumber.from(response.data.data.balance);
    }

    /**
     * POST /v1/tx/purchase/cancel
     * @private
     */
    private async postCancelPurchase(req: express.Request, res: express.Response) {
        logger.http(`POST /v1/tx/purchase/cancel`);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json(ResponseMessage.getErrorMessage("2001", { validation: errors.array() }));
        }

        const accessKey: string = String(req.body.accessKey).trim();
        if (accessKey !== this._config.setting.accessKey) {
            return res.status(200).json(ResponseMessage.getErrorMessage("3051"));
        }

        try {
            if (this.lastReceiveSequence === -1n) {
                this.lastReceiveSequence = await this.storage.getLastReceiveSequence();
            }

            const tx: CancelTransaction = new CancelTransaction(
                this.lastReceiveSequence + 1n,
                String(req.body.purchaseId).trim(),
                Number(req.body.timestamp),
                this.managerSigner.address
            );

            await tx.sign(this.managerSigner);

            await this.pool.add(DBTransaction.make(tx));
            await this.storage.setLastReceiveSequence(tx.sequence);
            this.lastReceiveSequence = tx.sequence;
            return res.json(StorePurchaseRouter.makeResponseData(0, tx.toJSON()));
        } catch (error) {
            logger.error("POST /v1/tx/purchase/cancel , " + error);
            return res.status(200).json(ResponseMessage.getErrorMessage("6000"));
        }
    }
}
