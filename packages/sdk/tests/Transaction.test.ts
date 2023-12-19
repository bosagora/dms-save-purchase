/**
 *  Test of Transaction
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { BigNumber, Wallet } from "ethers";
import { hashFull, Transaction } from "../src";

import * as assert from "assert";

describe("Transaction", () => {
    const signer1 = new Wallet("0xf6dda8e03f9dce37c081e5d178c1fda2ebdb90b5b099de1a555a658270d8c47d");
    const signer2 = new Wallet("0x023beec95e3e47cb5b56bb8b5e4357db4b8565aef61eaa661c11ebbac6a6c4e8");

    // The test codes below compare with the values calculated in Agora.
    it("Test for hash value of transaction data", async () => {
        const tx = new Transaction(
            0,
            "12345678",
            "0x064c9Fc53d5936792845ca58778a52317fCf47F2",
            "0",
            BigNumber.from(123),
            1668044556,
            "997DE626B2D417F0361D61C09EB907A57226DB5B",
            "a5c19fed89739383"
        );
        await tx.sign(signer1);

        assert.strictEqual(
            hashFull(tx).toString(),
            "0x107d8f927dd6e97d9956ac9084b26d31863f2e9616eff58b4446c17ecd4887d9"
        );
    });

    it("Test for Transaction.clone()", async () => {
        const tx = new Transaction(
            0,
            "12345678",
            "0x064c9Fc53d5936792845ca58778a52317fCf47F2",
            "0",
            BigNumber.from(123),
            1668044556,
            "997DE626B2D417F0361D61C09EB907A57226DB5B",
            "a5c19fed89739383"
        );
        await tx.sign(signer1);

        const clone_tx = tx.clone();
        assert.deepStrictEqual(tx, clone_tx);
    });

    it("Test for Transaction.sign() & verify", async () => {
        const tx = new Transaction(
            0,
            "12345678",
            "0x064c9Fc53d5936792845ca58778a52317fCf47F2",
            "0",
            BigNumber.from(123),
            1668044556,
            "997DE626B2D417F0361D61C09EB907A57226DB5B",
            "a5c19fed89739383"
        );

        await tx.sign(signer1);
        assert.strictEqual(
            tx.signature,
            "0xaf88593fa8cea1ae157b30990840ee07a6f3c140971c109f8cbaa698891002bb58775821da126ef10fdd1013a833505f54ca1155d163b177bb490665d0b7af051b"
        );
        assert.ok(!tx.verify(signer2.address));
        assert.ok(tx.verify(signer1.address));
        assert.ok(tx.verify());

        await tx.sign(signer2);
        assert.strictEqual(
            tx.signature,
            "0x336674a6e4be13c074908c33ab48cbf8460ea08319e5eea09a32dd7f64f4ed757761b6045485dec0dabf99bfe04da62af3bc2de5e67b0ad8417b05e14b72714e1b"
        );
        assert.ok(!tx.verify(signer1.address));
        assert.ok(tx.verify(signer2.address));
        assert.ok(tx.verify());
    });
});
