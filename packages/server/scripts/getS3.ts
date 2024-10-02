import * as dotenv from "dotenv";
import { ContractUtils } from "../src/service/utils/ContractUtils";
import { HTTPClient } from "../src/service/utils/HTTPClient";

import URI from "urijs";

import axios from "axios";

dotenv.config({ path: "env/.env" });

async function main() {
    const PURCHASE_STORAGE_ENDPOINT = `https://${process.env.NODE_S3_BUCKET}.s3.${process.env.NODE_S3_REGION}.amazonaws.com`;
    console.log(`STORE_PURCHASE_ENDPOINT : ${PURCHASE_STORAGE_ENDPOINT}`);

    const client = axios.create();
    const url = URI(PURCHASE_STORAGE_ENDPOINT)
        .filename("0x1035197ef87cdef2ffce17acf76e8745de9d521a47893e5df341dc02306fcab23")
        .toString();
    console.log(`URL : ${url}`);
    try {
        const response = await client.get(url);
        console.log(`status: ${JSON.stringify(response.status)}`);
        console.log(`RESULT: ${JSON.stringify(response.data)}`);
    } catch (reason: any) {
        if (reason.response !== undefined && reason.response.status !== undefined) {
            console.log(reason.response.status);
        }
    }

    await ContractUtils.delay(500);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
