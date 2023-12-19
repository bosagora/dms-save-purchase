/**
 *  Test of Transaction
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { hashFull, Transaction, Utils } from "../dist";

import { BigNumber } from "@ethersproject/bignumber";
import { Wallet } from "@ethersproject/wallet";

import * as assert from "assert";

describe("Transaction", () => {
    const signer1 = new Wallet("0xf6dda8e03f9dce37c081e5d178c1fda2ebdb90b5b099de1a555a658270d8c47d");
    const signer2 = new Wallet("0x023beec95e3e47cb5b56bb8b5e4357db4b8565aef61eaa661c11ebbac6a6c4e8");

    const phoneHash = Utils.getPhoneHash("8201012341234");
    // The test codes below compare with the values calculated in Agora.
    it("Test for hash value of transaction data", async () => {
        const tx = new Transaction(
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
            "0xa1108f176e3abeb39f6c364900e86ddae1021a49590f664f842254beab183385"
        );
    });

    it("Test for Transaction.clone()", async () => {
        const tx = new Transaction(
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

    it("Test for Transaction.sign() & verify", async () => {
        const tx = new Transaction(
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
            "0x492dcb82a785e8e88e08be4f3e1987d2f38f658b6c5d5c84eb3e0ab929ae265f018ace6c4c0411987c7a2a094df968e9d10ea51bf49a1c31680dd1c7565b18b41b"
        );
        assert.ok(!tx.verify(signer2.address));
        assert.ok(tx.verify(signer1.address));
        assert.ok(tx.verify());

        await tx.sign(signer2);
        assert.strictEqual(
            tx.signature,
            "0xb50251841eda1ccdac90426d956db7d6e6b542d4b21416096a68fbdc011d2bb774c89603b4d64046542bb35e3b8969c9210d2cfb8e3bcb29a42a843007173ce21b"
        );
        assert.ok(!tx.verify(signer1.address));
        assert.ok(tx.verify(signer2.address));
        assert.ok(tx.verify());
    });
});
