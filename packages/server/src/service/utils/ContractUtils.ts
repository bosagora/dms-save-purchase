import { defaultAbiCoder } from "@ethersproject/abi";
import { keccak256 } from "@ethersproject/keccak256";

export class ContractUtils {
    /**
     * Convert Buffer into hexadecimal strings.
     * @param data The data
     */
    public static BufferToString(data: Buffer): string {
        return "0x" + data.toString("hex");
    }
    private static find1_message = "execution reverted:";
    private static find1_length = ContractUtils.find1_message.length;
    private static find2_message = "reverted with reason string";
    private static find2_length = ContractUtils.find2_message.length;
    public static cacheEVMError(root: any): string {
        const reasons: string[] = [];
        let error = root;
        while (error !== undefined) {
            if (error.reason) {
                const reason = String(error.reason);
                let idx = reason.indexOf(ContractUtils.find1_message);
                let message: string;
                if (idx >= 0) {
                    message = reason.substring(idx + ContractUtils.find1_length).trim();
                    reasons.push(message);
                }
                idx = reason.indexOf(ContractUtils.find2_message);
                if (idx >= 0) {
                    message = reason.substring(idx + ContractUtils.find2_length).trim();
                    reasons.push(message);
                }
            }
            error = error.error;
        }

        if (reasons.length > 0) {
            return reasons[0];
        }

        if (root.message) {
            return root.message;
        } else {
            return root.toString();
        }
    }

    public static isErrorOfEVM(error: any): boolean {
        while (error !== undefined) {
            if (error.reason) {
                return true;
            }
            error = error.error;
        }
        return false;
    }

    public static getPhoneHash(phone: string): string {
        const encodedResult = defaultAbiCoder.encode(["string", "string"], ["BOSagora Phone Number", phone]);
        return keccak256(encodedResult);
    }
}
