import { BigNumber } from "@ethersproject/bignumber";
import { SmartBuffer } from "smart-buffer";
import { JSONValidator } from "../../utils/JSONValidator";
import { hashPart } from "../common/Hash";

export interface IPurchaseDetails {
    productId: string;
    amount: BigNumber;
    providePercent: BigNumber;
}

export class PurchaseDetails implements IPurchaseDetails {
    public productId: string;
    public amount: BigNumber;
    public providePercent: BigNumber;

    /**
     * Constructor
     */
    constructor(productId: string, amount: BigNumber, providePercent: BigNumber) {
        this.productId = productId;
        this.amount = BigNumber.from(amount);
        this.providePercent = BigNumber.from(providePercent);
    }

    /**
     * The reviver parameter to give to `JSON.parse`
     *
     * This function allows to perform any necessary conversion,
     * as well as validation of the final object.
     *
     * @param key   Name of the field being parsed
     * @param value The value associated with `key`
     * @returns A new instance of `Transaction` if `key == ""`, `value` otherwise.
     */
    public static reviver(key: string, value: any): any {
        if (key !== "") return value;

        JSONValidator.isValidOtherwiseThrow("PurchaseDetails", value);

        return new PurchaseDetails(value.productId, BigNumber.from(value.amount), BigNumber.from(value.providePercent));
    }

    /**
     * Collects data to create a hash.
     * @param buffer The buffer where collected data is stored
     */
    public computeHash(buffer: SmartBuffer) {
        hashPart(this.productId, buffer);
        hashPart(this.amount, buffer);
        hashPart(this.providePercent, buffer);
    }

    /**
     * Converts this object to its JSON representation
     */
    public toJSON(): any {
        return {
            productId: this.productId,
            amount: this.amount.toString(),
            providePercent: this.providePercent.toString(),
        };
    }

    /**
     * Creates and returns a copy of this object.
     */
    public clone(): PurchaseDetails {
        return new PurchaseDetails(this.productId, this.amount, this.providePercent);
    }
}
