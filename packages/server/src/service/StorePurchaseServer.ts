/**
 *  The web server of Store Purchase Server
 *
 *  Copyright:
 *      Copyright (c) 2024 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import bodyParser from "body-parser";
import cors from "cors";
import { Scheduler } from "../modules/scheduler/Scheduler";
import { WebService } from "../modules/service/WebService";
import { Config } from "./common/Config";
import { StorePurchaseRouter } from "./routers/StorePurchaseRouter";
import { TransactionPool } from "./scheduler/TransactionPool";
import { StorePurchaseStorage } from "./storage/StorePurchaseStorage";

import { register } from "prom-client";
import { Metrics } from "./metrics/Metrics";

export class StorePurchaseServer extends WebService {
    /**
     * The collection of schedulers
     * @protected
     */
    protected schedules: Scheduler[] = [];

    /**
     * The configuration of the database
     * @private
     */
    private readonly config: Config;
    private readonly metrics: Metrics;

    public readonly router: StorePurchaseRouter;

    private readonly storage: StorePurchaseStorage;

    public readonly pool: TransactionPool;

    /**
     * Constructor
     * @param config Configuration
     * @param storage StorePurchase Storage
     * @param schedules Array of IScheduler
     */
    constructor(config: Config, storage: StorePurchaseStorage, schedules?: Scheduler[]) {
        super(config.server.port, config.server.address);
        register.clear();
        this.metrics = new Metrics();
        this.metrics.create("gauge", "status", "serve status");
        this.metrics.create("gauge", "block", "block number");
        this.metrics.create("gauge", "sequence", "transaction sequence");
        this.metrics.create("summary", "success", "request success");
        this.metrics.create("summary", "failure", "request failure");

        this.config = config;
        this.storage = storage;
        this.pool = new TransactionPool();
        this.pool.storage = storage;

        this.router = new StorePurchaseRouter(this, config, this.pool, this.storage, this.metrics);

        if (schedules) {
            schedules.forEach((m) => this.schedules.push(m));
            this.schedules.forEach((m) =>
                m.setOption({
                    config: this.config,
                    metrics: this.metrics,
                    router: this.router,
                    storage: this.storage,
                    pool: this.pool,
                })
            );
        }
    }

    /**
     * Setup and start the server
     */
    public async start(): Promise<void> {
        // parse application/x-www-form-urlencoded
        this.app.use(bodyParser.urlencoded({ extended: false, limit: "1mb" }));
        // parse application/json
        this.app.use(bodyParser.json({ limit: "1mb" }));
        this.app.use(
            cors({
                origin: "*",
                methods: "GET, POST, OPTIONS",
                allowedHeaders: "Content-Type, Authorization",
                credentials: true,
                preflightContinue: false,
            })
        );

        await this.router.registerRoutes();

        for (const m of this.schedules) await (m as Scheduler).start();

        return super.start();
    }

    public stop(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            for (const m of this.schedules) await m.stop();
            for (const m of this.schedules) await m.waitForStop();
            if (this.server != null) {
                this.server.close((err?) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else resolve();
        });
    }
}
