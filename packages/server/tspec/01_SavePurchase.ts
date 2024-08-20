import { Tspec } from "tspec";
import { ResultCode, TransactionType } from "./types";

export type SavePurchaseApiSpec = Tspec.DefineApiSpec<{
    tags: ["Save Purchase"];
    paths: {
        "/v2/tx/purchase/new": {
            post: {
                summary: "Save New Purchase";
                body: {
                    purchase: {
                        /**
                         * ID of Purchase
                         * @example "P00000000000203"
                         */
                        purchaseId: string;
                        /**
                         * Cash Amount to be used for payment (info. decimals are 18)
                         * @example "100000000000000000000"
                         */
                        cashAmount: string;
                        /**
                         * Loyalty to be received from the purchase of the product
                         * @example "1000000000000000000"
                         */
                        loyalty: string;
                        /**
                         * Currency symbol for amount to be used for payment
                         * @example "php"
                         */
                        currency: string;
                        /**
                         * ID of shop
                         * @example "0x00011936a68f7c26797fa2ab64d444ea82c2fb1af36cdea6d4ff845da635f287"
                         */
                        shopId: string;
                        /**
                         * Wallet address of user
                         * @example "0x5A3Fc8990417b3e6ddCdAE0E8039E798A609Ef84"
                         */
                        userAccount: string;
                        /**
                         * Phone number hash
                         * @example "0xF48F4BF6C8B5B285F0D9EB5D52623EE14B6F2B5980E87FAC89E4B968995FAE2B"
                         */
                        userPhoneHash: string;
                        /**
                         * The wallet address of the loyalty point provider
                         * @example "0x5A3Fc8990417b3e6ddCdAE0E8039E798A609Ef84"
                         */
                        sender: string;
                        /**
                         * Signature of a loyalty point provider or assistant
                         * @example "0x020d671b80fbd20466d8cb65cef79a24e3bca3fdf82e9dd89d78e7a4c4c045bd72944c20bb1d839e76ee6bb69fed61f64376c37799598b40b8c49148f3cdd88a1b"
                         */
                        purchaseSignature: string;
                    };
                    others: {
                        /**
                         * Total Amount ( Point + Cash ) to be used for payment (info. decimals are 18)
                         * @example "100000000000000000000"
                         */
                        totalAmount: string;
                        /**
                         * Time the purchase occurred
                         * @example 1722948039
                         */
                        timestamp: string;
                        /**
                         * Hold time (seconds) until loyalty point is provided
                         * @example 3600
                         */
                        waiting: string;
                    };
                    details: {
                        /**
                         * ID of Product
                         * @example "2020051310000000"
                         */
                        productId: string;
                        /**
                         * Amount used to purchase the product
                         * @example "10000000000000000000000"
                         */
                        amount: string;
                        /**
                         * Loyalty received from the purchase of the product 1% == 100 (% of the purchase amount)
                         * @example "1000"
                         */
                        providePercent: string;
                    }[];
                };
                responses: {
                    200: {
                        /**
                         * Result Code
                         * @example 0
                         */
                        code: ResultCode;

                        data: {
                            tx: {
                                /**
                                 * Type of purchase transaction (0 : New, 1 : Cancel)
                                 * @example 0
                                 */
                                type: TransactionType;
                                /**
                                 * Serial number of the purchase transaction
                                 * @example "100"
                                 */
                                sequence: string;
                                /**
                                 * ID of Purchase
                                 * @example "P00000000000203"
                                 */
                                purchaseId: string;
                                /**
                                 * Time the purchase occurred
                                 * @example "1722945138"
                                 */
                                timestamp: string;
                                /**
                                 * Hold time (seconds) until loyalty point is provided
                                 * @example 3600
                                 */
                                waiting: string;
                                /**
                                 * Total Amount ( Point + Cash ) to be used for payment (info. decimals are 18)
                                 * @example "100000000000000000000"
                                 */
                                totalAmount: string;
                                /**
                                 * Cash Amount to be used for payment (info. decimals are 18)
                                 * @example "100000000000000000000"
                                 */
                                cashAmount: string;
                                /**
                                 * Loyalty to be received from the purchase of the product
                                 * @example "1000000000000000000"
                                 */
                                loyalty: string;
                                /**
                                 * Currency symbol for amount to be used for payment
                                 * @example "php"
                                 */
                                currency: string;
                                /**
                                 * ID of shop
                                 * @example "0x00011936a68f7c26797fa2ab64d444ea82c2fb1af36cdea6d4ff845da635f287"
                                 */
                                shopId: string;
                                /**
                                 * Wallet address of user
                                 * @example "0x5A3Fc8990417b3e6ddCdAE0E8039E798A609Ef84"
                                 */
                                userAccount: string;
                                /**
                                 * Phone number hash
                                 * @example "0xF48F4BF6C8B5B285F0D9EB5D52623EE14B6F2B5980E87FAC89E4B968995FAE2B"
                                 */
                                userPhoneHash: string;
                                /**
                                 * The wallet address of the loyalty point provider
                                 * @example "0x5A3Fc8990417b3e6ddCdAE0E8039E798A609Ef84"
                                 */
                                sender: string;
                                /**
                                 * Signature of a loyalty point provider or assistant
                                 * @example "0x020d671b80fbd20466d8cb65cef79a24e3bca3fdf82e9dd89d78e7a4c4c045bd72944c20bb1d839e76ee6bb69fed61f64376c37799598b40b8c49148f3cdd88a1b"
                                 */
                                purchaseSignature: string;
                                /**
                                 * The wallet address of the person who saves the purchase data
                                 * @example "0x5A3Fc8990417b3e6ddCdAE0E8039E798A609Ef84"
                                 */
                                signer: string;
                                /**
                                 * The signature of the person who saves the purchase data
                                 * @example "0x020d671b80fbd20466d8cb65cef79a24e3bca3fdf82e9dd89d78e7a4c4c045bd72944c20bb1d839e76ee6bb69fed61f64376c37799598b40b8c49148f3cdd88a1b"
                                 */
                                signature: string;
                                details: {
                                    /**
                                     * ID of product
                                     * @example "2020051310000000"
                                     */
                                    productId: string;
                                    /**
                                     * Amount used to purchase the product
                                     * @example "10000000000000000000000"
                                     */
                                    amount: string;
                                    /**
                                     * Loyalty received from the purchase of the product (% of the purchase amount)
                                     * @example "1000"
                                     */
                                    providePercent: string;
                                }[];
                            };
                            loyalty: {
                                /**
                                 * Value at base exchange rate for loyalties to be received
                                 * @example "100000000000000000000"
                                 */
                                loyaltyValue: string;
                                /**
                                 * Amount of loyalty points you will receive
                                 * @example "100000000000000000000"
                                 */
                                loyaltyPoint: string;
                                account: {
                                    /**
                                     * Type of account ( "address", "phone" )
                                     * @example "address"
                                     */
                                    accountType: string;
                                    /**
                                     * Wallet address of user
                                     * @example "0x5A3Fc8990417b3e6ddCdAE0E8039E798A609Ef84"
                                     */
                                    account: string;
                                    /**
                                     * Current Balance
                                     * @example "100000000000000000000"
                                     */
                                    currentBalance: string;
                                    /**
                                     * Loyalty to be received
                                     * @example "10000000000000000000"
                                     */
                                    loyaltyToBeProvided: string;
                                };
                            };
                        };

                        error?: {
                            /**
                             * Error Message
                             * @example "Failed to check the validity of parameters"
                             */
                            message: string;
                        };
                    };
                };
            };
        };

        "/v2/tx/purchase/cancel": {
            post: {
                summary: "Save Cancel Purchase";
                body: {
                    purchase: {
                        /**
                         * ID of Purchase
                         * @example "P00000000000203"
                         */
                        purchaseId: string;
                        /**
                         * The wallet address of the loyalty point provider
                         * @example "0x5A3Fc8990417b3e6ddCdAE0E8039E798A609Ef84"
                         */
                        sender: string;
                        /**
                         * Signature of a loyalty point provider or assistant
                         * @example "0x020d671b80fbd20466d8cb65cef79a24e3bca3fdf82e9dd89d78e7a4c4c045bd72944c20bb1d839e76ee6bb69fed61f64376c37799598b40b8c49148f3cdd88a1b"
                         */
                        purchaseSignature: string;
                    };
                    others: {
                        /**
                         * Time the purchase occurred
                         * @example 1722948039
                         */
                        timestamp: string;
                        /**
                         * Hold time (seconds) until loyalty point is provided
                         * @example 3600
                         */
                        waiting: string;
                    };
                };
                responses: {
                    200: {
                        /**
                         * Result Code
                         * @example 0
                         */
                        code: ResultCode;

                        data: {
                            tx: {
                                /**
                                 * Type of purchase transaction (0 : New, 1 : Cancel)
                                 * @example 1
                                 */
                                type: TransactionType;
                                /**
                                 * Serial number of the purchase transaction
                                 * @example "100"
                                 */
                                sequence: string;
                                /**
                                 * ID of Purchase
                                 * @example "P00000000000203"
                                 */
                                purchaseId: string;
                                /**
                                 * Time the purchase occurred
                                 * @example "1722945138"
                                 */
                                timestamp: string;
                                /**
                                 * Hold time (seconds) until loyalty point is provided
                                 * @example 3600
                                 */
                                waiting: string;
                                /**
                                 * The wallet address of the loyalty point provider
                                 * @example "0x5A3Fc8990417b3e6ddCdAE0E8039E798A609Ef84"
                                 */
                                sender: string;
                                /**
                                 * Signature of a loyalty point provider or assistant
                                 * @example "0x020d671b80fbd20466d8cb65cef79a24e3bca3fdf82e9dd89d78e7a4c4c045bd72944c20bb1d839e76ee6bb69fed61f64376c37799598b40b8c49148f3cdd88a1b"
                                 */
                                purchaseSignature: string;
                                /**
                                 * The wallet address of the person who saves the purchase data
                                 * @example "0x5A3Fc8990417b3e6ddCdAE0E8039E798A609Ef84"
                                 */
                                signer: string;
                                /**
                                 * The signature of the person who saves the purchase data
                                 * @example "0x020d671b80fbd20466d8cb65cef79a24e3bca3fdf82e9dd89d78e7a4c4c045bd72944c20bb1d839e76ee6bb69fed61f64376c37799598b40b8c49148f3cdd88a1b"
                                 */
                                signature: string;
                            };
                        };

                        error?: {
                            /**
                             * Error Message
                             * @example "Failed to check the validity of parameters"
                             */
                            message: string;
                        };
                    };
                };
            };
        };
    };
}>;
