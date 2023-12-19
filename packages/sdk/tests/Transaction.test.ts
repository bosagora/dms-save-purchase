/**
 *  Test of NewTransaction
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
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
            0,
            "12345678",
            1668044556,
            BigNumber.from(123),
            BigNumber.from(123),
            "krw",
            "0x5f59d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
            "0xD10ADf251463A260242c216c8c7D3e736eBdB398",
            phoneHash,
            [new PurchaseDetails("PID001", BigNumber.from(123), BigNumber.from(300))]
        );
        await tx.sign(signer1);

        assert.strictEqual(
            hashFull(tx).toString(),
            "0xb346df0114c44baed78b60ff2852056746ac1a985148fc45797291095d1aea3d"
        );
    });

    it("Test for NewTransaction.clone()", async () => {
        const tx = new NewTransaction(
            0,
            "12345678",
            1668044556,
            BigNumber.from(123),
            BigNumber.from(123),
            "krw",
            "0x5f59d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
            "0xD10ADf251463A260242c216c8c7D3e736eBdB398",
            phoneHash,
            [new PurchaseDetails("PID001", BigNumber.from(123), BigNumber.from(300))]
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
            BigNumber.from(123),
            "krw",
            "0x5f59d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
            "0xD10ADf251463A260242c216c8c7D3e736eBdB398",
            phoneHash,
            [new PurchaseDetails("PID001", BigNumber.from(123), BigNumber.from(300))]
        );

        await tx.sign(signer1);
        assert.strictEqual(
            tx.signature,
            "0x9a7563b88e70a5d20c68c729ecd2f8828c0fb85f4e4eacf7ca18fb8a0de911ca39c250b2132b40570a03f6ffaae7c80132a404d886c4dbb2c168fa4b26177adb1b"
        );
        assert.ok(!tx.verify(signer2.address));
        assert.ok(tx.verify(signer1.address));
        assert.ok(tx.verify());

        await tx.sign(signer2);
        assert.strictEqual(
            tx.signature,
            "0x2271aa25876273c73a922b14dfac72e646c3644b1033329836b942d199571333379215e378989ef63386a2f0ecda634ad040d5291f80dbac220416a38199c9921c"
        );
        assert.ok(!tx.verify(signer1.address));
        assert.ok(tx.verify(signer2.address));
        assert.ok(tx.verify());
    });
});
