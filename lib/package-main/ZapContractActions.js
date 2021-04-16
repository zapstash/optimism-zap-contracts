"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestWalletAccess = exports.mintByOwnerForOwner = void 0;
// import { expect } from "../setup"
const ethers_1 = require("ethers");
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
const typechain_1 = require("../typechain");
const Addresses_1 = __importDefault(require("./Addresses"));
const utils_1 = require("ethers/lib/utils");
// const name: string = "Zap"
// const symbol: string = "ZAP"
// const version: string = "0.1.0"
// const chainId: number = 31337
// Reusable example data.
const exampleIpfsHash = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const exampleZapper = "0x0123456789abcdef0123456789abcdef01234567";
const exampleSerialNumber = utils_1.hexZeroPad(utils_1.hexlify(42), 4);
const exampleSeriesTotal = utils_1.hexZeroPad(utils_1.hexlify(420), 4);
const examplePublication = { ipfsHash: exampleIpfsHash, zapper: exampleZapper, seriesTotal: exampleSeriesTotal };
const exampleSeriesFingerprint = { ipfsHash: exampleIpfsHash, zapper: exampleZapper };
const chain = "rinkeby"; // TODO: Make this configurable based off web3
const mintByOwnerForOwner = (zapContract) => {
    return zapContract.mintByOwnerForOwner(exampleIpfsHash, exampleSeriesTotal, utils_1.hexZeroPad(utils_1.hexlify(0), 4));
};
exports.mintByOwnerForOwner = mintByOwnerForOwner;
const requestWalletAccess = async (window) => {
    let provider;
    if (typeof (window.ethereum) !== 'undefined') {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        provider = new ethers_1.providers.Web3Provider(window.ethereum);
    }
    else {
        provider = ethers_1.getDefaultProvider(); // use ethers.js underlying fallbacks
    }
    const approvedSigner = provider.getSigner();
    const zapContract = typechain_1.Zap__factory.connect(Addresses_1.default[chain].ZapContract, approvedSigner);
    return {
        provider,
        approvedSigner,
        zapContract
    };
};
exports.requestWalletAccess = requestWalletAccess;
//# sourceMappingURL=ZapContractActions.js.map