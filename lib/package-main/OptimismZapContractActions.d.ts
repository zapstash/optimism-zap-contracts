import { BytesLike, ContractTransaction } from "ethers";
import { TypedDataDomain } from "@ethersproject/abstract-signer";
import { ZapMintIntentTypedData } from "./ZapData";
export declare const mintByOwnerForOwner: (zapContract: any, ipfsHash: BytesLike, seriesTotal: number, serialNumber: number) => Promise<ContractTransaction>;
export declare const getZapMintIntentTypedDataToSign: (typedDataDomain: TypedDataDomain, ipfsHash: BytesLike, zapper: BytesLike, seriesTotal: BytesLike, serialNumber: BytesLike) => ZapMintIntentTypedData;
export declare const requestWalletAccess: (window: any) => Promise<{
    provider: any;
    approvedSigner: any;
    zapContract: import("../typechain").OptimismZap;
}>;
