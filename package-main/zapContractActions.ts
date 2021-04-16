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

// const name: string = "Zap"
// const symbol: string = "ZAP"
// const version: string = "0.1.0"
// const chainId: number = 31337


// Reusable example data.
const exampleIpfsHash =
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
const exampleZapper = "0x0123456789abcdef0123456789abcdef01234567"
const exampleSerialNumber = hexZeroPad(hexlify(42), 4)
const exampleSeriesTotal = hexZeroPad(hexlify(420), 4)
const examplePublication = { ipfsHash: exampleIpfsHash, zapper: exampleZapper, seriesTotal: exampleSeriesTotal }
const exampleSeriesFingerprint = { ipfsHash: exampleIpfsHash, zapper: exampleZapper }

const chain = "rinkeby"; // TODO: Make this configurable based off web3

export const mintByOwnerForOwner = (zapContract): Promise<ContractTransaction> => {
    return zapContract.mintByOwnerForOwner(exampleIpfsHash, exampleSeriesTotal, hexZeroPad(hexlify(0), 4));
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
