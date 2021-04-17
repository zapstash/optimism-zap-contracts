// import { expect } from "../setup"
import { BytesLike, ContractTransaction, providers, getDefaultProvider } from "ethers"
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { Zap, Zap__factory } from "../typechain"

import * as HashUtils from "./HashUtils"
import Addresses from "./Addresses"

import {
  hexlify,
  hexZeroPad,
} from "ethers/lib/utils"


// Reusable example data.

const chain = "rinkeby"; // TODO: Make this configurable based off web3

const bytes4ify = (givenNumber) => hexZeroPad(hexlify(givenNumber), 4)

export const mintByOwnerForOwner = (zapContract, ipfsHash, seriesTotal, serialNumber): Promise<ContractTransaction> => {
    return zapContract.mintByOwnerForOwner(ipfsHash, bytes4ify(seriesTotal), bytes4ify(serialNumber));
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
    const zapContract = Zap__factory.connect(Addresses[chain].ZapContract, approvedSigner);

    return {
        provider,
        approvedSigner,
        zapContract
    }
}

