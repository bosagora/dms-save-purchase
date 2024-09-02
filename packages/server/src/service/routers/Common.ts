import { BigNumber } from "@ethersproject/bignumber";
import { PurchaseDetails } from "acc-save-purchase-sdk";
import { ContractUtils } from "../utils/ContractUtils";

export interface ILoyaltyResponse {
    loyaltyValue: BigNumber;
    loyaltyPoint: BigNumber;
    account: {
        accountType: string;
        account: string;
        currentBalance: BigNumber;
        loyaltyToBeProvided: BigNumber;
    };
}

export function getLoyaltyInTransaction(
    cashAmount: BigNumber,
    totalAmount: BigNumber,
    details: PurchaseDetails[]
): BigNumber {
    if (totalAmount.eq(0)) return BigNumber.from(0);
    if (cashAmount.eq(0)) return BigNumber.from(0);
    let sum: BigNumber = BigNumber.from(0);
    for (const elem of details) {
        sum = sum.add(elem.amount.mul(elem.providePercent));
    }
    return ContractUtils.zeroGWEI(sum.mul(cashAmount).div(totalAmount).div(10000));
}
