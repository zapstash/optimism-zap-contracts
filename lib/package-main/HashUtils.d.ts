import { BytesLike } from "ethers";
export declare const MINT_INTENT_STATEMENT = "I intend to mint this Zap NFT.";
export declare const MINT_INTENT_STATEMENT_HASH: string;
export declare const ZAP_MINT_INTENT_TYPE = "ZapMintIntent(string mintIntent,bytes32 ipfsHash,address zapper,bytes4 seriesTotal,bytes4 serialNumber)";
export declare const ZAP_MINT_INTENT_TYPE_HASH: string;
export declare const ZAP_DATA_TYPE = "ZapData(bytes32 ipfsHash,address zapper,bytes4 seriesTotal,bytes4 serialNumber)";
export declare const ZAP_DATA_TYPE_HASH: string;
export declare const SERIES_PUBLICATION_TYPE = "SeriesPublication(bytes32 ipfsHash,address zapper,bytes4 seriesTotal)";
export declare const SERIES_PUBLICATION_TYPE_HASH: string;
export declare const SERIES_FINGERPRINT_TYPE = "SeriesFingerprint(bytes32 ipfsHash,address zapper)";
export declare const SERIES_FINGERPRINT_TYPE_HASH: string;
export declare const EIP712Domain: {
    name: string;
    type: string;
}[];
export declare const ZapMintIntent: {
    name: string;
    type: string;
}[];
export declare const ZapData: {
    name: string;
    type: string;
}[];
export declare const SeriesPublication: {
    name: string;
    type: string;
}[];
export declare const SeriesFingerprint: {
    name: string;
    type: string;
}[];
export declare function eip712HashZapMintIntent(name: string, version: string, chainId: number, contractAddress: string, ipfsHash: BytesLike, zapper: BytesLike, seriesTotal: BytesLike, serialNumber: BytesLike): BytesLike;
export declare function eip712HashZapData(name: string, version: string, chainId: number, contractAddress: string, ipfsHash: BytesLike, zapper: BytesLike, seriesTotal: BytesLike, serialNumber: BytesLike): BytesLike;
export declare function eip712HashSeriesPublication(name: string, version: string, chainId: number, contractAddress: string, ipfsHash: BytesLike, zapper: BytesLike, seriesTotal: BytesLike): BytesLike;
export declare function eip712HashSeriesFingerprint(name: string, version: string, chainId: number, contractAddress: string, ipfsHash: BytesLike, zapper: BytesLike): BytesLike;
