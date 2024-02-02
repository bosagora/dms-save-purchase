/**
 *  Test of NewTransaction
 *
 *  Copyright:
 *      Copyright (c) 2024 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { hashFull, NewTransaction, PurchaseDetails, Utils } from "../src";

import { BigNumber } from "@ethersproject/bignumber";
import { Wallet } from "@ethersproject/wallet";

import * as assert from "assert";

describe("NewTransaction", () => {
    const signer1 = new Wallet("0xf6dda8e03f9dce37c081e5d178c1fda2ebdb90b5b099de1a555a658270d8c47d");
    const signer2 = new Wallet("0x023beec95e3e47cb5b56bb8b5e4357db4b8565aef61eaa661c11ebbac6a6c4e8");

    const phoneHash = Utils.getPhoneHash("8201012341234");
    // The test codes below compare with the values calculated in Agora.
    it("Test for hash value of NewTransaction data", async () => {
        const tx = new NewTransaction(
            "0",
            "12345678",
            BigInt(1668044556),
            BigNumber.from(123),
            BigNumber.from(123),
            "krw",
            "0x5f59d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
            "0xD10ADf251463A260242c216c8c7D3e736eBdB398",
            phoneHash,
            [new PurchaseDetails("PID001", BigNumber.from(123), BigNumber.from(300))],
            "0x4501F7aF010Cef3DcEaAfbc7Bfb2B39dE57df54d"
        );
        await tx.sign(signer1);

        assert.strictEqual(
            hashFull(tx).toString(),
            "0x76711573851cf7b495392a77180d01f7918c16a902ae059c6849a06c611844cd"
        );
    });

    it("Test for NewTransaction.clone()", async () => {
        const tx = new NewTransaction(
            "0",
            "12345678",
            BigInt(1668044556),
            BigNumber.from(123),
            BigNumber.from(123),
            "krw",
            "0x5f59d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
            "0xD10ADf251463A260242c216c8c7D3e736eBdB398",
            phoneHash,
            [new PurchaseDetails("PID001", BigNumber.from(123), BigNumber.from(300))],
            "0x4501F7aF010Cef3DcEaAfbc7Bfb2B39dE57df54d"
        );
        await tx.sign(signer1);

        const clone_tx = tx.clone();
        assert.deepStrictEqual(tx, clone_tx);
    });

    it("Test for NewTransaction.sign() & verify", async () => {
        const tx = new NewTransaction(
            BigInt(0),
            "12345678",
            BigInt(1668044556),
            BigNumber.from(123),
            BigNumber.from(123),
            "krw",
            "0x5f59d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
            "0xD10ADf251463A260242c216c8c7D3e736eBdB398",
            phoneHash,
            [new PurchaseDetails("PID001", BigNumber.from(123), BigNumber.from(300))],
            "0x4501F7aF010Cef3DcEaAfbc7Bfb2B39dE57df54d"
        );

        await tx.sign(signer1);
        assert.strictEqual(
            tx.signature,
            "0x83a011490a59cfccc1aeff52751d44a9f15cf8f2d2b360e32aceaa55372a4c2b523eeb527f5b89907b6b755e6b1ccb0024f7e5b43c15834e187a05ad5b7175f81b"
        );
        assert.ok(!tx.verify(signer2.address));
        assert.ok(tx.verify(signer1.address));
        assert.ok(tx.verify());

        await tx.sign(signer2);
        assert.strictEqual(
            tx.signature,
            "0x1be3709ec6d09ad5dc0f32e42436b7bc232287aa9c8e7459a89a90ab5c70058f4eab94ddb0c9adacc4ccd8ed7ecca55539f785d3e865121e1c84be8e6a06af791c"
        );
        assert.ok(!tx.verify(signer1.address));
        assert.ok(tx.verify(signer2.address));
        assert.ok(tx.verify());
    });
});
