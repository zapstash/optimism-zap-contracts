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
// Reusable example data.
const chain = "rinkeby"; // TODO: Make this configurable based off web3
const bytes4ify = (givenNumber) => utils_1.hexZeroPad(utils_1.hexlify(givenNumber), 4);
const mintByOwnerForOwner = (zapContract, ipfsHash, seriesTotal, serialNumber) => {
    return zapContract.mintByOwnerForOwner(ipfsHash, bytes4ify(seriesTotal), bytes4ify(serialNumber));
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