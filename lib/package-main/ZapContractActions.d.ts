import { ContractTransaction } from "ethers";
import { Zap } from "../typechain";
export declare const mintByOwnerForOwner: (zapContract: any) => Promise<ContractTransaction>;
export declare const requestWalletAccess: (window: any) => Promise<{
    provider: any;
    approvedSigner: any;
    zapContract: Zap;
}>;
