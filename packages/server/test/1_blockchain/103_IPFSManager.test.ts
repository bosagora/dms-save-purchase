/**
 *  This tests the IPFSManager
 *
 *  Copyright:
 *      Copyright (c) 2024 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { IPFSManager } from "../../src/modules";

import * as assert from "assert";
import { Config } from "../../src/service/common/Config";

import path from "path";

describe("Test of IPFSManager", () => {
    const config = new Config();
    config.readFromFile(path.resolve(process.cwd(), "config/config_test.yaml"));
    const ipfs = new IPFSManager(config);
    ipfs.setTest(true);

    it("Add Contents", async () => {
        const res = await ipfs.add("hello world!", "");
        assert.ok(res !== null);
    });
});
