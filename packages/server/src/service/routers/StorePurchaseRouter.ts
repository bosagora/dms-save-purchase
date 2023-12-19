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

import { Transaction } from "dms-store-purchase-sdk";
import { BigNumber } from "ethers";
import { WebService } from "../../modules/service/WebService";
import { Config } from "../common/Config";
import { logger } from "../common/Logger";
import { TransactionPool } from "../scheduler/TransactionPool";
import { DBTransaction, StorePurchaseStorage } from "../storage/StorePurchaseStorage";
import { Validation } from "../validation";

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

    private isAuth(req: express.Request, res: express.Response, next: any) {
        const authHeader = req.get("Authorization");
        if (!authHeader && StorePurchaseRouter.accessKey !== authHeader) {
            return res.status(401).json(
                StorePurchaseRouter.makeResponseData(401, undefined, {
                    msg: "Authentication Error",
                })
            );
        }
        next();
    }

    private isValidate(req: express.Request, res: express.Response, next: any) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const e = errors.array({ onlyFirstError: true });
            if (e.length) {
                return res.status(400).json(StorePurchaseRouter.makeResponseData(400, undefined, e[0]));
            } else {
                return res.status(400).json(
                    StorePurchaseRouter.makeResponseData(400, undefined, {
                        validation: errors.array(),
                        msg: "Failed to check the validity of parameters.",
                    })
                );
            }
        }
        next();
    }

    public registerRoutes() {
        this.app.get("/", [], StorePurchaseRouter.getHealthStatus.bind(this));
        this.app.get("/v1/tx/sequence", [], this.getSequence.bind(this));
        this.app.post(
            "/v1/tx/record",
            [
                this.isAuth,
                body("sequence")
                    .exists()
                    .withMessage("sequence is a required value")
                    .not()
                    .isEmpty()
                    .withMessage("sequence is a required value")
                    .isNumeric()
                    .withMessage("sequence can only be numbers")
                    .bail(),
                body("purchaseId")
                    .exists()
                    .withMessage("purchaseId is a required value")
                    .not()
                    .isEmpty()
                    .withMessage("purchaseId is a required value")
                    .bail(),
                body("timestamp")
                    .exists()
                    .withMessage("timestamp is a required value")
                    .not()
                    .isEmpty()
                    .withMessage("timestamp is a required value")
                    .isNumeric()
                    .withMessage("timestamp can only be numbers")
                    .bail(),
                body("amount")
                    .exists()
                    .withMessage("amount is a required value")
                    .not()
                    .isEmpty()
                    .withMessage("amount is a required value")
                    .custom(Validation.isAmount)
                    .withMessage("amount can only be numbers type string")
                    .bail(),
                body("currency")
                    .exists()
                    .withMessage("currency is a required value")
                    .not()
                    .isEmpty()
                    .withMessage("currency is a required value")
                    .bail(),
                body("shopId")
                    .exists()
                    .withMessage("shopId is a required value")
                    .not()
                    .isEmpty()
                    .withMessage("shopId is a required value")
                    .bail(),
                body("method")
                    .exists()
                    .withMessage("method is a required value")
                    .not()
                    .isEmpty()
                    .withMessage("method is a required value")
                    .isIn(["0", "1"])
                    .withMessage(`method input type error ,Enter "0" for charge or "1" for discharge`)
                    .bail(),
                body("userAccount")
                    .exists()
                    .withMessage("userAccount is a required value")
                    .not()
                    .isEmpty()
                    .withMessage("userAccount is a required value")
                    .bail(),
                body("userPhone")
                    .exists()
                    .withMessage("userPhone is a required value")
                    .not()
                    .isEmpty()
                    .withMessage("userPhone is a required value")
                    .bail(),
                body("signer")
                    .exists()
                    .withMessage("signer is a required value")
                    .not()
                    .isEmpty()
                    .withMessage("signer is a required value")
                    .bail(),
                body("signature")
                    .exists()
                    .withMessage("signature is a required value")
                    .not()
                    .isEmpty()
                    .withMessage("signature is a required value")
                    .bail(),
                this.isValidate,
            ],
            this.postTransactionRecord.bind(this)
        );
    }

    private static async getHealthStatus(req: express.Request, res: express.Response) {
        return res.json("OK");
    }

    /**
     * GET /tx/sequence
     * @private
     */
    private async getSequence(req: express.Request, res: express.Response) {
        logger.http(`GET /tx/sequence`);

        try {
            const sequence = await this.storage.getLastReceiveSequence();
            return res.json(StorePurchaseRouter.makeResponseData(200, { sequence }));
        } catch (error) {
            logger.error("GET /tx/sequence , " + error);
            return res.status(500).json(
                StorePurchaseRouter.makeResponseData(500, undefined, {
                    msg: "Failed to transaction record.",
                })
            );
        }
    }

    /**
     * POST /tx/record
     * @private
     */
    private async postTransactionRecord(req: express.Request, res: express.Response) {
        logger.http(`POST /tx/record`);

        try {
            const tx: Transaction = new Transaction(
                Number(req.body.sequence),
                req.body.purchaseId,
                Number(req.body.timestamp),
                BigNumber.from(req.body.amount),
                req.body.currency,
                req.body.shopId,
                Number(req.body.method),
                req.body.userAccount,
                req.body.userPhoneHash,
                req.body.signer,
                req.body.signature
            );

            if (!tx.verify(tx.signer)) {
                return res.status(400).json(
                    StorePurchaseRouter.makeResponseData(400, undefined, {
                        param: "signature",
                        msg: "The signature value entered is not valid.",
                    })
                );
            }

            if (this.lastReceiveSequence === -1) {
                this.lastReceiveSequence = await this.storage.getLastReceiveSequence();
            }

            if (this.lastReceiveSequence + 1 !== tx.sequence) {
                return res.status(417).json(
                    StorePurchaseRouter.makeResponseData(417, undefined, {
                        param: "sequence",
                        expected: this.lastReceiveSequence + 1,
                        actual: tx.sequence,
                        msg: "sequence is different from the expected value",
                    })
                );
            }

            await this.pool.add(DBTransaction.make(tx));
            await this.storage.setLastReceiveSequence(tx.sequence);
            this.lastReceiveSequence = tx.sequence;
            return res.json(StorePurchaseRouter.makeResponseData(200, "SUCCESS"));
        } catch (error) {
            logger.error("POST /tx/record , " + error);
            return res.status(500).json(
                StorePurchaseRouter.makeResponseData(500, undefined, {
                    msg: "Failed to transaction record.",
                })
            );
        }
    }
}
