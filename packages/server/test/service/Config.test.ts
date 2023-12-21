import { Config } from "../../src/service/common/Config";

import * as assert from "assert";
import path from "path";

import { PhoneNumberFormat, PhoneNumberUtil } from "google-libphonenumber";

describe("Test of Config", () => {
    it("Test parsing the settings of a string", async () => {
        const config: Config = new Config();
        config.readFromFile(path.resolve("test", "service", "config.test.yaml"));
        assert.strictEqual(config.server.address, "127.0.0.1");
        assert.strictEqual(config.server.port.toString(), "3000");
        assert.strictEqual(config.logging.level, "debug");

        assert.strictEqual(config.scheduler.enable, true);
        assert.strictEqual(config.scheduler.items.length, 2);
        assert.strictEqual(config.scheduler.items[0].name, "node");
        assert.strictEqual(config.scheduler.items[0].enable, true);
        assert.strictEqual(config.scheduler.items[0].expression, "*/1 * * * * *");

        assert.strictEqual(config.node.interval, 10);
        assert.strictEqual(config.node.max_txs, 8);
        assert.strictEqual(config.node.send_interval, 12);

        assert.strictEqual(config.node.ipfs_api_url, "http://localhost:5001");
        assert.strictEqual(config.node.ipfs_gateway_url, "http://localhost:8080");
        assert.strictEqual(config.node.ipfs_test, true);

        assert.strictEqual(config.database.path, ":memory:");

        assert.strictEqual(config.contracts.purchaseAddress, "0x0000000000000000000000000000000000000000");

        assert.strictEqual(
            config.authorization.accessKey,
            "9812176e565a007a84c5d2fc4cf842b12eb26dbc7568b4e40fc4f2418f2c8f54"
        );
    });
    it("Test Phone Number", async () => {
        const phoneUtil = PhoneNumberUtil.getInstance();
        const number = phoneUtil.parseAndKeepRawInput("+82 10-1000-2000", "ZZ");
        console.log(phoneUtil.isValidNumber(number));
        console.log(phoneUtil.getRegionCodeForNumber(number));
        console.log(phoneUtil.format(number, PhoneNumberFormat.INTERNATIONAL));
        console.log(phoneUtil.format(number, PhoneNumberFormat.NATIONAL));
    });
});
