/**
 *  The class that defines the Validator.
 *
 *  Copyright:
 *      Copyright (c) 2024 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import Ajv from "ajv";
import { PurchaseDetails } from "../blockchain/data/PurchaseDetails";

/**
 * @ignore
 */
const ajv = new Ajv();

/**
 * Class for validating JSON data
 */
export class JSONValidator {
    /**
     * @ignore
     */
    private static schemas: Map<string, object> = new Map([
        [
            "Block",
            {
                title: "Block",
                type: "object",
                properties: {
                    header: {
                        type: "object",
                    },
                    txs: {
                        items: {
                            type: "object",
                        },
                        type: "array",
                    },
                    merkleTree: {
                        items: {
                            type: "string",
                        },
                        type: "array",
                    },
                },
                additionalProperties: false,
                required: ["header", "txs", "merkleTree"],
            },
        ],
        [
            "BlockHeader",
            {
                title: "BlockHeader",
                type: "object",
                properties: {
                    prevBlock: {
                        type: "string",
                    },
                    merkleRoot: {
                        type: "string",
                    },
                    height: {
                        type: "string",
                    },
                    timestamp: {
                        type: "string",
                    },
                },
                additionalProperties: false,
                required: ["prevBlock", "merkleRoot", "height", "timestamp"],
            },
        ],
        [
            "NewTransaction",
            {
                title: "NewTransaction",
                type: "object",
                properties: {
                    type: {
                        type: "number",
                    },
                    sequence: {
                        type: "string",
                    },
                    purchaseId: {
                        type: "string",
                    },
                    timestamp: {
                        type: "string",
                    },
                    waiting: {
                        type: "string",
                    },
                    totalAmount: {
                        type: "string",
                    },
                    cashAmount: {
                        type: "string",
                    },
                    currency: {
                        type: "string",
                    },
                    shopId: {
                        type: "string",
                    },
                    userAccount: {
                        type: "string",
                    },
                    userPhoneHash: {
                        type: "string",
                    },
                    details: {
                        items: {
                            type: "object",
                        },
                        type: "array",
                    },
                    sender: {
                        type: "string",
                    },
                    signer: {
                        type: "string",
                    },
                    signature: {
                        type: "string",
                    },
                },
                additionalProperties: false,
                required: [
                    "type",
                    "sequence",
                    "purchaseId",
                    "timestamp",
                    "totalAmount",
                    "cashAmount",
                    "currency",
                    "shopId",
                    "userAccount",
                    "userPhoneHash",
                    "details",
                    "sender",
                    "signer",
                    "signature",
                ],
            },
        ],
        [
            "CancelTransaction",
            {
                title: "CancelTransaction",
                type: "object",
                properties: {
                    type: {
                        type: "number",
                    },
                    sequence: {
                        type: "string",
                    },
                    purchaseId: {
                        type: "string",
                    },
                    timestamp: {
                        type: "string",
                    },
                    waiting: {
                        type: "string",
                    },
                    sender: {
                        type: "string",
                    },
                    signer: {
                        type: "string",
                    },
                    signature: {
                        type: "string",
                    },
                },
                additionalProperties: false,
                required: ["type", "sequence", "purchaseId", "timestamp", "sender", "signer", "signature"],
            },
        ],
        [
            "PurchaseDetails",
            {
                title: "PurchaseDetails",
                type: "object",
                properties: {
                    productId: {
                        type: "string",
                    },
                    amount: {
                        type: "string",
                    },
                    providePercent: {
                        type: "string",
                    },
                },
                additionalProperties: false,
                required: ["productId", "amount", "providePercent"],
            },
        ],
    ]);

    /**
     * The map of validation functions created to reuse -
     * an once created validation function.
     */
    private static validators = new Map<string, Ajv.ValidateFunction>();

    /**
     * Check the validity of a JSON data.
     * @param schema_name The JSON schema name
     * @param candidate The JSON data
     * @returns `true` if the JSON is valid, otherwise throw an `Error`
     */
    public static isValidOtherwiseThrow(schema_name: string, candidate: any) {
        const validator = this.buildValidator(schema_name);
        if (this.isValid(validator, candidate)) {
            return true;
        } else if (validator.errors !== undefined && validator.errors !== null && validator.errors.length > 0) {
            if (validator.errors.length === 1) {
                throw new Error(`Validation failed: ${schema_name} - ` + validator.errors[0].message);
            } else {
                const messages = [];
                for (const error of validator.errors) messages.push(error.message);
                throw new Error(`Validation failed: ${schema_name} - ` + messages.join("\n"));
            }
        } else {
            throw new Error(`Validation failed: ${schema_name}`);
        }
    }

    /**
     * Check the validity of a JSON data.
     * @param schema_name The JSON schema name
     * @param candidate The JSON data
     * @returns `true` if the JSON is valid, otherwise `false`
     */
    public static isValidOtherwiseNoThrow(schema_name: string, candidate: any) {
        const validator = this.buildValidator(schema_name);
        return this.isValid(validator, candidate);
    }

    /**
     * Create a validation function using the schema.
     * Return it if it has already been created.
     * @param name The JSON schema name
     * @returns The function of validation
     */
    private static buildValidator(name: string): Ajv.ValidateFunction {
        let validator = JSONValidator.validators.get(name);
        if (validator === undefined) {
            const schema = JSONValidator.schemas.get(name);
            if (schema !== undefined) {
                validator = ajv.compile(schema);
                JSONValidator.validators.set(name, validator);
            } else throw new Error(`Non-existent schema accessed: ${name}`);
        }
        return validator as Ajv.ValidateFunction;
    }

    /**
     * Check the validity of a JSON data.
     * @param validator The Function to validate JSON
     * @param candidate The JSON data
     * @returns `true` if the JSON is valid, otherwise `false`
     */
    private static isValid(validator: Ajv.ValidateFunction, candidate: any) {
        return validator(candidate) === true;
    }
}
