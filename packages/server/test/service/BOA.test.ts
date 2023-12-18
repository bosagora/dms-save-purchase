import { Amount, BOACoin } from "../../src/service/common/Amount";

import { BigNumber } from "ethers";

import assert from "assert";

describe("BOA", () => {
    it("Test of Amount", () => {
        assert.deepStrictEqual(Amount.make("1", 0).toString(), "1");
        assert.deepStrictEqual(Amount.make("1", 1).toString(), "10");
        assert.deepStrictEqual(new Amount(BigNumber.from(1), 0).toString(), "1");
        assert.deepStrictEqual(new Amount(BigNumber.from(1), 1).toString(), "1");
    });

    it("Test of BOACoin", () => {
        assert.deepStrictEqual(BOACoin.make("1").toString(), "1000000000000000000");
        assert.deepStrictEqual(new BOACoin(BigNumber.from(1)).toString(), "1");
        assert.deepStrictEqual(BOACoin.make("1").toBOAString(), "1.000000000000000000");
        assert.deepStrictEqual(BOACoin.make("10").toBOAString(), "10.000000000000000000");
    });
});
