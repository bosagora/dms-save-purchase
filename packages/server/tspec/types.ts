/**
 * ResultCode</br>
 * 0: Success</br>
 * 2001: Failed to check the validity of parameters</br>
 * 2002: This is not a wallet address</br>
 * 2003: This is not a phone number format. International Standard (+82 10-1000-2000)</br>
 * 2004: totalAmount and sum of detailed purchase do not match</br>
 * 2005: Unregistered shop ID</br>
 * 3001: Height is incorrect</br>
 * 3002: The previous block hash is not valid</br>
 * 3003: Must be not more than last height</br>
 * 3004: The hash length is not valid</br>
 * 3005: No corresponding block hash key value</br>
 * 3006: Size are allowed from 1 to 32</br>
 * 3050: Sequence is different from the expected value</br>
 * 3051: The access key entered is not valid</br>
 * 3072: The shopId is invalid</br>
 */
export enum ResultCode {
    CODE0000 = 0,
    CODE2001 = 2001,
    CODE2002 = 2002,
    CODE2003 = 2003,
    CODE2004 = 2004,
    CODE2005 = 2005,
    CODE3001 = 3001,
    CODE3002 = 3002,
    CODE3003 = 3003,
    CODE3004 = 3004,
    CODE3005 = 3005,
    CODE3006 = 3006,
    CODE3050 = 3050,
    CODE3051 = 3051,
    CODE3072 = 3072,
}

/**
 * TransactionType</br>
 * 0: New Payment</br>
 * 1: Cancel Payment</br>
 */
export enum TransactionType {
    NEW = 0,
    CANCEL = 1,
}
