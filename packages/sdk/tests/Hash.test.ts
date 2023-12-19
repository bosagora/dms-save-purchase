/**
 *  Test that create hash.
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { BigNumber } from "ethers";
import { Hash, hash, hashMulti, iota } from "../src";

import * as assert from "assert";
import { hashFull } from "../lib";

describe("Hash", () => {
    // Buffer has the same content. However, when printed with hex strings,
    // the order of output is different.
    // This was treated to be the same as D language.
    it("Test of reading and writing hex string", () => {
        // Read from hex string
        const h = new Hash("0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd2236713");

        // Check
        assert.strictEqual(h.toString(), "0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd2236713");
    });

    // The test codes below compare with the values calculated in Agora.
    it("Test of hash('abc')", () => {
        // Hash
        const h = hash(Buffer.from("abc"));

        // Check
        assert.strictEqual(h.toString(), "0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    });

    // The test codes below compare with the values calculated in Agora.
    it("Test of multi hash", () => {
        // Source 1 : "foo"
        const foo = hash(Buffer.from("foo"));

        // Source 2 : "bar"
        const bar = hash(Buffer.from("bar"));

        // Hash Multi
        const h = hashMulti(foo, bar);

        // Check
        assert.strictEqual(h.toString(), "0x92475004e70f41b94750f4a77bf7b430551113b25d3d57169eadca5692bb043d");

        // Source 3 : "boa"
        const boa = hash(Buffer.from("boa"));

        const h2 = hash(Buffer.concat([foo.data, bar.data, boa.data]));
        const h3 = hashMulti(foo, bar, boa);

        // Check
        assert.strictEqual(h3.toString(), h2.toString());
    });

    it("Test of Hash.equal", () => {
        const bytes1 = Buffer.from(iota(Hash.Width).map((m) => m));
        const bytes2 = Buffer.from(iota(Hash.Width).map((m) => m));
        const bytes3 = Buffer.from(iota(Hash.Width).map((m) => m));
        bytes3[Hash.Width - 1] = 0;

        const h1 = new Hash(bytes1);
        const h2 = new Hash(bytes2);
        const h3 = new Hash(bytes3);
        assert.strictEqual(Hash.equal(h1, h2), true);
        assert.strictEqual(Hash.equal(h1, h3), false);
    });

    it("Test of Hash.compare", () => {
        const bytes1 = Buffer.from(iota(Hash.Width).map((m) => m));
        const bytes2 = Buffer.from(iota(Hash.Width).map((m) => m));
        const bytes3 = Buffer.from(iota(Hash.Width).map((m) => m));
        bytes1[Hash.Width - 1] = 0;
        bytes2[Hash.Width - 1] = 1;
        bytes3[Hash.Width - 1] = 2;

        const h1 = new Hash(bytes1);
        const h2 = new Hash(bytes2);
        const h3 = new Hash(bytes3);
        assert.strictEqual(Hash.compare(h1, h2) < 0, true);
        assert.strictEqual(Hash.compare(h2, h3) < 0, true);
        assert.strictEqual(Hash.compare(h3, h1) > 0, true);
        assert.strictEqual(Hash.compare(h2, h1) > 0, true);
    });

    it("Test of Hash.Null(), Hash.isNull()", () => {
        let h = new Hash("0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd2236713");
        assert.strictEqual(h.isNull(), false);

        h = Hash.Null;
        assert.strictEqual(h.isNull(), true);
    });

    it("Test of multi hash of string", () => {
        const a = new Hash("0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd2236713");

        const test = "text";

        // Hash Multi
        const key = hashMulti(a, test);

        // Check
        assert.strictEqual(key.toString(), "0xbe9788916124ba14cd316a94c2bb2e8743196a78917518370d5725804b7f96cc");
    });

    it("Test of BigNumber's hash", () => {
        const value = BigNumber.from("9007199254740992");
        const bytes2 = Buffer.from("20000000000000", "hex");
        const h1 = hashFull(value);
        const h2 = hash(bytes2);
        assert.strictEqual(h1.toString(), h2.toString());
    });
});
