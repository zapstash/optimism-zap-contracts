// import { expect } from "../setup"
import { BytesLike, ContractTransaction, providers, getDefaultProvider, Signer } from 'ethers';
import * as HashUtils from "./HashUtils"
import Addresses from "./Addresses"
import {
  hexlify,
  hexZeroPad,
} from "ethers/lib/utils"
import { TypedDataDomain } from '@ethersproject/abstract-signer'
import { OptimismZap__factory } from '../typechain/factories/OptimismZap__factory';
import { ZapMintIntentTypedData } from "./ZapData"

// Reusable example data.
const chain = "optimism"; // TODO: Make this configurable based off web3

const bytes4ify = (givenNumber) => hexZeroPad(hexlify(givenNumber), 4)

export const mintByOwnerForOwner = (zapContract, ipfsHash:BytesLike, seriesTotal: number, serialNumber:number): Promise<ContractTransaction> => {
    return zapContract.mintByOwnerForOwner(ipfsHash, bytes4ify(seriesTotal), bytes4ify(serialNumber));
}

export const getZapMintIntentTypedDataToSign = (typedDataDomain: TypedDataDomain, ipfsHash: BytesLike, zapper: BytesLike, seriesTotal: BytesLike, serialNumber: BytesLike): ZapMintIntentTypedData => {
    return {
        typedDataDomain,
        types: { ZapMintIntent: HashUtils.ZapMintIntent },
        zapMintIntent: {
            mintIntent: HashUtils.MINT_INTENT_STATEMENT,
            ipfsHash,
            zapper,
            seriesTotal,
            serialNumber,
        }
    }
}

export const requestWalletAccess = async (window) => {
    let provider;
    if (typeof (window.ethereum) !== 'undefined') {
        await window.ethereum.request({ method: 'eth_requestAccounts' })
        provider = new providers.Web3Provider(window.ethereum)
    } else {
        provider = getDefaultProvider(); // use ethers.js underlying fallbacks
    }
    const approvedSigner = provider.getSigner();
    const zapContract = OptimismZap__factory.connect(Addresses.optimism.OptimismZapContract, approvedSigner);

    return {
        provider,
        approvedSigner,
        zapContract
    }
}

