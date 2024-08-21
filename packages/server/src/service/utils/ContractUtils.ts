// tslint:disable-next-line:no-implicit-dependencies
import { defaultAbiCoder } from "@ethersproject/abi";
// tslint:disable-next-line:no-implicit-dependencies
import { Signer } from "@ethersproject/abstract-signer";
// tslint:disable-next-line:no-implicit-dependencies
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
// tslint:disable-next-line:no-implicit-dependencies
import { arrayify, BytesLike } from "@ethersproject/bytes";
// tslint:disable-next-line:no-implicit-dependencies
import { keccak256 } from "@ethersproject/keccak256";
// tslint:disable-next-line:no-implicit-dependencies
import { verifyMessage } from "@ethersproject/wallet";

import * as hre from "hardhat";

export class ContractUtils {
    /**
     * Convert Buffer into hexadecimal strings.
     * @param data The data
     */
    public static BufferToString(data: Buffer): string {
        return "0x" + data.toString("hex");
    }

    public static getTimeStamp(): number {
        return Math.floor(new Date().getTime() / 1000);
    }

    public static getTimeStamp10(): number {
        return Math.floor(new Date().getTime() / 10000) * 10;
    }

    public static delay(interval: number): Promise<void> {
        return new Promise<void>((resolve, _) => {
            setTimeout(resolve, interval);
        });
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

    public static zeroGWEI(value: BigNumber): BigNumber {
        return value.div(1000000000).mul(1000000000);
    }

    public static getNewPurchaseDataMessage(
        purchaseId: string,
        amount: BigNumberish,
        loyalty: BigNumberish,
        currency: string,
        shopId: BytesLike,
        account: string,
        phone: BytesLike,
        sender: string,
        chainId?: BigNumberish
    ): Uint8Array {
        const encodedResult = defaultAbiCoder.encode(
            ["string", "uint256", "uint256", "string", "bytes32", "address", "bytes32", "address", "uint256"],
            [
                purchaseId,
                amount,
                loyalty,
                currency,
                shopId,
                account,
                phone,
                sender,
                chainId ? chainId : hre.ethers.provider.network.chainId,
            ]
        );
        return arrayify(keccak256(encodedResult));
    }

    public static getCancelPurchaseDataMessage(purchaseId: string, sender: string, chainId?: BigNumberish): Uint8Array {
        const encodedResult = defaultAbiCoder.encode(
            ["string", "address", "uint256"],
            [purchaseId, sender, chainId ? chainId : hre.ethers.provider.network.chainId]
        );
        return arrayify(keccak256(encodedResult));
    }

    public static async signMessage(signer: Signer, message: Uint8Array): Promise<string> {
        return signer.signMessage(message);
    }

    public static verifyMessage(account: string, message: Uint8Array, signature: string): boolean {
        let res: string;
        try {
            res = verifyMessage(message, signature);
        } catch (error) {
            return false;
        }
        return res.toLowerCase() === account.toLowerCase();
    }
}

(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};
