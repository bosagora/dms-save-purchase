import { ContractUtils } from "../src/service/utils/ContractUtils";
import { HTTPClient } from "../src/service/utils/HTTPClient";

import URI from "urijs";

import * as fs from "fs";

export interface IShopData {
    shopId: string;
    name: string;
    currency: string;
    providePercent: number;
    address: string;
    privateKey: string;
}

export interface IUserData {
    idx: number;
    phone: string;
    address: string;
    privateKey: string;
}

export interface INewPurchaseDetails {
    productId: string;
    amount: number;
    providePercent: number;
}

export interface INewPurchaseData {
    purchaseId: string;
    timestamp: string;
    totalAmount: number;
    cashAmount: number;
    currency: string;
    shopId: string;
    waiting: number;
    userAccount: string;
    userPhone: string;
    details: INewPurchaseDetails[];
}

let purchaseSequence = 0;
function getPurchaseId(): string {
    const res = "P" + new Date().getTime().toString().padStart(10, "0") + purchaseSequence.toString().padStart(5, "0");
    purchaseSequence++;
    return res;
}

async function main() {
    const STORE_PURCHASE_ENDPOINT = process.env.SERVER_URL || "";
    const ACCESS_KEY = process.env.ACCESS_KEY || "";
    const shops: IShopData[] = [];
    const users: IUserData[] = [];

    console.log(`STORE_PURCHASE_ENDPOINT : ${STORE_PURCHASE_ENDPOINT}`);
    console.log(`ACCESS_KEY : ${ACCESS_KEY}`);
    console.log(`CURRENCY : ${process.env.CURRENCY}`);

    console.log("데이타를 로딩합니다.");
    users.push(...(JSON.parse(fs.readFileSync("src/client/data/users.json", "utf8")) as IUserData[]));
    users.push(...(JSON.parse(fs.readFileSync("src/client/data/users_mobile.json", "utf8")) as IUserData[]));
    shops.push(...(JSON.parse(fs.readFileSync("src/client/data/shops.json", "utf8")) as IShopData[]));

    const makeTransactions = async (userIndex: number): Promise<INewPurchaseData> => {
        const purchaseId = getPurchaseId();
        const details: INewPurchaseDetails[] = [
            {
                productId: "2020051310000000",
                amount: 100_000_000,
                providePercent: 10,
            },
        ];
        let totalAmount: number = 0;
        for (const elem of details) {
            totalAmount += elem.amount;
        }
        const cashAmount = totalAmount;

        const shopIndex = Math.floor(Math.random() * shops.length);

        const res: INewPurchaseData = {
            purchaseId,
            timestamp: ContractUtils.getTimeStamp().toString(),
            totalAmount,
            cashAmount,
            currency: process.env.CURRENCY || "krw",
            shopId: shops[shopIndex].shopId,
            waiting: 10,
            userAccount: users[userIndex].address,
            userPhone: "",
            details,
        };
        return res;
    };

    for (let userIndex = 0; userIndex < users.length; userIndex++) {
        const tx = await makeTransactions(userIndex);
        console.log(`purchaseId: ${tx.purchaseId}, userAccount: ${tx.userAccount}, point: ${tx.totalAmount / 10}`);
        const client = new HTTPClient({
            headers: {
                Authorization: ACCESS_KEY,
            },
        });
        const url = URI(STORE_PURCHASE_ENDPOINT).directory("/v1/tx/purchase").filename("new").toString();
        const response = await client.post(url, tx);

        console.log(`RESULT: ${response.data.code}`);

        await ContractUtils.delay(500);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
