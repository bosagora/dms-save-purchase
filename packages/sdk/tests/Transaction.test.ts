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
            BigNumber.from(123),
            "krw",
            "0x5f59d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
            "0xD10ADf251463A260242c216c8c7D3e736eBdB398",
            phoneHash
        );
        await tx.sign(signer1);

        assert.strictEqual(
            hashFull(tx).toString(),
            "0x50df4e617c399f7eb57131062bafe29b23bf1be570b0d228690b90465368638f"
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
            BigNumber.from(123),
            "krw",
            "0x5f59d6b480ff5a30044dcd7fe3b28c69b6d0d725ca469d1b685b57dfc1055d7f",
            "0xD10ADf251463A260242c216c8c7D3e736eBdB398",
            phoneHash
        );

        await tx.sign(signer1);
        assert.strictEqual(
            tx.signature,
            "0xdaa7176bde7a36d71f829ce558981a7fbfc9f0cba36774a5ec1cf7bcc935c99e64928f6baa9e0e92a5c82bd16ce57c54ccb66741db837cc8c82621d2af4a75821c"
        );
        assert.ok(!tx.verify(signer2.address));
        assert.ok(tx.verify(signer1.address));
        assert.ok(tx.verify());

        await tx.sign(signer2);
        assert.strictEqual(
            tx.signature,
            "0x29567bb513eef159a5ffd77abf5d1c84b1912b792c5718fde03bcaa1bbf9a9ff1f191b1b890e93de8010bc77c594308b78e094cbf55e5acbabd0f9a309a189001b"
        );
        assert.ok(!tx.verify(signer1.address));
        assert.ok(tx.verify(signer2.address));
        assert.ok(tx.verify());
    });
});
