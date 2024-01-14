/**
 *  This tests the IPFSManager
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { IPFSManager } from "../../src/modules";

import * as assert from "assert";

describe("Test of IPFSManager", () => {
    const ipfs = new IPFSManager("http://localhost:5001");
    ipfs.setTest(true);

    it("Add Contents", async () => {
        const res = await ipfs.add("hello world!");
        assert.ok(res !== null);
    });
});
