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

import { CancelTransaction, NewTransaction, PurchaseDetails } from "dms-store-purchase-sdk";
import { Wallet } from "ethers";
import { WebService } from "../../modules";
import { Amount } from "../common/Amount";
import { Config } from "../common/Config";
import { logger } from "../common/Logger";
import { TransactionPool } from "../scheduler/TransactionPool";
import { DBTransaction, StorePurchaseStorage } from "../storage/StorePurchaseStorage";
import { ContractUtils } from "../utils/ContractUtils";
import { ResponseMessage } from "../utils/Errors";

import { BigNumber } from "@ethersproject/bignumber";

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
    private lastReceiveSequence: number;

    /**
     * The signer needed to save the block information
     */
    private _managerSigner: Wallet | undefined;

    /**
     *
     * @param service  WebService
     * @param config Configuration
     * @param pool TransactionPool
     * @param storage RollupStorage
     */
    constructor(service: WebService, config: Config, pool: TransactionPool, storage: StorePurchaseStorage) {
        this._web_service = service;
        this._config = config;
        this.pool = pool;
        this.storage = storage;

        StorePurchaseRouter.accessKey = config.authorization.accessKey;
        this.lastReceiveSequence = -1;
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
                body("sequence").exists().isNumeric(),
                body("purchaseId").exists().not().isEmpty(),
                body("timestamp").exists().isNumeric(),
                body("totalAmount").exists().trim().isNumeric(),
                body("cashAmount").exists().trim().isNumeric(),
                body("currency").exists().not().isEmpty(),
                body("shopId")
                    .exists()
                    .trim()
                    .matches(/^(0x)[0-9a-f]{64}$/i),
                body("userAccount").custom(async (value) => {
                    if (value === undefined) {
                        throw new Error("Not Assigned User Account");
                    } else if (value !== "") {
                        const eth = /^(0x)[0-9a-f]{40}$/i;
                        if (!eth.test(value)) {
                            throw new Error("Not Invalid User Account");
                        }
                    }
                }),
                body("userPhone").exists(),
                body("details").exists().isArray({ min: 1 }),
            ],
            this.postNewPurchase.bind(this)
        );
        this.app.post(
            "/v1/tx/purchase/cancel",
            [
                body("accessKey").exists().withMessage("Authentication Error"),
                body("sequence").exists().isNumeric(),
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
        //
        // if (req.body.userAccount !== undefined && String(req.body.userAccount).trim() !== "") {
        //     body("userAccount").isEthereumAddress();
        // }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json(ResponseMessage.getErrorMessage("2001", { validation: errors.array() }));
        }

        try {
            const accessKey: string = String(req.body.accessKey).trim();
            if (accessKey !== this._config.authorization.accessKey) {
                return res.status(200).json(ResponseMessage.getErrorMessage("3051"));
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

            const tx: NewTransaction = new NewTransaction(
                Number(req.body.sequence),
                String(req.body.purchaseId).trim(),
                Number(req.body.timestamp),
                Amount.make(String(req.body.totalAmount).trim(), 18).value,
                Amount.make(String(req.body.cashAmount).trim(), 18).value,
                String(req.body.currency).trim(),
                String(req.body.shopId).trim(),
                String(req.body.userAccount).trim(),
                ContractUtils.getPhoneHash(String(req.body.userPhone).trim()),
                details,
                this.managerSigner.address
            );

            await tx.sign(this.managerSigner);

            if (this.lastReceiveSequence === -1) {
                this.lastReceiveSequence = await this.storage.getLastReceiveSequence();
            }

            if (this.lastReceiveSequence + 1 !== tx.sequence) {
                return res.status(200).json(ResponseMessage.getErrorMessage("3050"));
            }

            await this.pool.add(DBTransaction.make(tx));
            await this.storage.setLastReceiveSequence(tx.sequence);
            this.lastReceiveSequence = tx.sequence;
            return res.json(StorePurchaseRouter.makeResponseData(0, tx.toJSON()));
        } catch (error) {
            logger.error("POST /v1/tx/purchase/new , " + error);
            return res.status(200).json(ResponseMessage.getErrorMessage("6000"));
        }
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

        try {
            const accessKey: string = String(req.body.accessKey).trim();
            if (accessKey !== this._config.authorization.accessKey) {
                return res.status(200).json(ResponseMessage.getErrorMessage("3051"));
            }

            const tx: CancelTransaction = new CancelTransaction(
                Number(req.body.sequence),
                String(req.body.purchaseId).trim(),
                Number(req.body.timestamp),
                this.managerSigner.address
            );

            await tx.sign(this.managerSigner);

            if (this.lastReceiveSequence === -1) {
                this.lastReceiveSequence = await this.storage.getLastReceiveSequence();
            }

            if (this.lastReceiveSequence + 1 !== tx.sequence) {
                return res.status(200).json(ResponseMessage.getErrorMessage("3050"));
            }

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
