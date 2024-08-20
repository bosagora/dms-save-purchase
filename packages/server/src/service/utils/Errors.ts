import { ContractUtils } from "./ContractUtils";

export class ResponseMessage {
    static messages: Map<string, string> = new Map([
        ["0000", "Success"],
        ["2001", "Failed to check the validity of parameters"],
        ["2002", "This is not a wallet address"],
        ["2003", "This is not a phone number format. International Standard"],
        ["2004", "totalAmount and sum of detailed purchase do not match"],
        ["2005", "Unregistered shop ID"],
        ["3001", "Height is incorrect"],
        ["3002", "The previous block hash is not valid"],
        ["3003", "Must be not more than last height"],
        ["3004", "The hash length is not valid"],
        ["3005", "No corresponding block hash key value"],
        ["3006", "Size are allowed from 1 to 32"],
        ["3050", "Sequence is different from the expected value"],
        ["3051", "The access key entered is not valid"],
        ["3072", "The shopId is invalid"],
    ]);

    public static getEVMErrorMessage(error: any): { code: number; error: any } {
        const code = ContractUtils.cacheEVMError(error);
        const message = ResponseMessage.messages.get(code);
        if (message !== undefined) {
            return { code: Number(code), error: { message } };
        }

        if (ContractUtils.isErrorOfEVM(error)) {
            const defaultCode = "5000";
            const defaultMessage = error.reason ? error.reason : ResponseMessage.messages.get(defaultCode);
            if (defaultMessage !== undefined) {
                return { code: Number(defaultCode), error: { message: defaultMessage } };
            }
        } else if (error instanceof Error && error.message) {
            return { code: 9000, error: { message: error.message.substring(0, 64) } };
        }
        return { code: 9000, error: { message: "Unknown Error" } };
    }

    public static getErrorMessage(code: string, additional?: any): { code: number; error: any } {
        const message = ResponseMessage.messages.get(code);
        if (message !== undefined) {
            return { code: Number(code), error: { message, ...additional } };
        }
        return { code: 9000, error: { message: "Unknown Error" } };
    }
}
