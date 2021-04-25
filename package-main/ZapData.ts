import { BytesLike } from '@ethersproject/bytes';
import { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer'

export type ZapMintIntentTypedData = {
    typedDataDomain: TypedDataDomain;
    types: Record<string, TypedDataField[]>;
    zapMintIntent: ZapMintIntentData;
}

export type ZapMintIntentData = {
    mintIntent: string;
    ipfsHash: BytesLike;
    zapper: BytesLike;
    seriesTotal: BytesLike;
    serialNumber: BytesLike;
};
