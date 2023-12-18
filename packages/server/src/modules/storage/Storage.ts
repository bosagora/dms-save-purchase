/**
 *  The superclass of storages.
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import mkdirp from "mkdirp";
import path from "path";
import sqlite3, { Database } from "sqlite3";
import { IDatabaseConfig } from "../../service/common/Config";

/**
 * The superclass of storages.
 */
export class Storage {
    protected database: Database;

    constructor(config: IDatabaseConfig, callback: (err: Error | null) => void) {
        mkdirp.sync(path.dirname(config.path));
        this.database = new sqlite3.Database(
            config.path,
            sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE,
            (err: Error | null) => {
                if (err) callback(err);
                this.createTables()
                    .then(() => {
                        callback(null);
                    })
                    .catch((e) => {
                        callback(e);
                    });
            }
        );
    }

    public close(callback?: (err: Error | null) => void) {
        this.database.close(callback);
    }

    public getDatabase(): Database {
        return this.database;
    }

    /**
     * Creates tables.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public createTables(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            resolve();
        });
    }

    public run(sql: string, params: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.database.run(sql, params, (err) => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }
}
