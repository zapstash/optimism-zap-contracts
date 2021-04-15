// import { expect } from "../setup"
import { ethers } from "hardhat"
// import { BytesLike, ContractTransaction } from "ethers"
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
// import { Zap__factory } from "../../typechain"
import { Zap, Zap__factory } from "../typechain"

import * as zapUtil from "./zapUtil"
import * as addresses from "./addresses"

import {
  hexlify,
  hexZeroPad,
} from "ethers/lib/utils"
import { ContractTransaction } from "@ethersproject/contracts"

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


let provider;
let approvedSigner;
let ZapContract: Zap
const chain = "rinkeby"; // TODO: Configurable based off web3

export const mintByOwnerForOwner = (): Promise<ContractTransaction> => {
    return ZapContract.mintByOwnerForOwner(exampleIpfsHash, exampleSeriesTotal, hexZeroPad(hexlify(0), 4));
}

export const requestWalletAccess = async () => {
    if (typeof (window.ethereum) !== 'undefined') {
        provider = new ethers.providers.Web3Provider(window.ethereum)
    } else {
        provider = ethers.getDefaultProvider(); // use ethers.js underlying fallbacks
    }
    approvedSigner = provider.getSigner();
    ZapContract = Zap__factory.connect(addresses[chain].zapContract, approvedSigner);
}
