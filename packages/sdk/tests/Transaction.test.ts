/**
 *  Test of NewTransaction
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { hashFull, NewTransaction, Utils } from "../src";

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
            0,
            "12345678",
            1668044556,
            BigNumber.from(123),
            "krw",
            "0x5f59d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
            0,
            "0xD10ADf251463A260242c216c8c7D3e736eBdB398",
            phoneHash
        );
        await tx.sign(signer1);

        assert.strictEqual(
            hashFull(tx).toString(),
            "0xb8221e814dfe74506cbcff156996d7587ddc2feb524b2f123f201e025c858729"
        );
    });

    it("Test for NewTransaction.clone()", async () => {
        const tx = new NewTransaction(
            0,
            "12345678",
            1668044556,
            BigNumber.from(123),
            "krw",
            "0x5f59d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
            0,
            "0xD10ADf251463A260242c216c8c7D3e736eBdB398",
            phoneHash
        );
        await tx.sign(signer1);

        const clone_tx = tx.clone();
        assert.deepStrictEqual(tx, clone_tx);
    });

    it("Test for NewTransaction.sign() & verify", async () => {
        const tx = new NewTransaction(
            0,
            "12345678",
            1668044556,
            BigNumber.from(123),
            "krw",
            "0x5f59d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
            0,
            "0xD10ADf251463A260242c216c8c7D3e736eBdB398",
            phoneHash
        );

        await tx.sign(signer1);
        assert.strictEqual(
            tx.signature,
            "0x0a6a4cf59d1c1a94f700789a5f92d227baa281d606e8531110806741f7d2b1c62e22c7fb4ae8208bc9566e5c505bfbf50b7cc65349885aefa4cad04f01c15a491b"
        );
        assert.ok(!tx.verify(signer2.address));
        assert.ok(tx.verify(signer1.address));
        assert.ok(tx.verify());

        await tx.sign(signer2);
        assert.strictEqual(
            tx.signature,
            "0x76f214210a7df440cdbe09a3345464fa526b42915cd12c70b36fee6004a3de6776cae0ce42e0c9bfc08a5ffe9ad706c854d32ab186420587578260ab39ceab491c"
        );
        assert.ok(!tx.verify(signer1.address));
        assert.ok(tx.verify(signer2.address));
        assert.ok(tx.verify());
    });
});
