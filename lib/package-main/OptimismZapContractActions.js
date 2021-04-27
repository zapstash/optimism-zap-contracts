"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestWalletAccess = exports.getZapMintIntentTypedDataToSign = exports.mintByOwnerForOwner = void 0;
// import { expect } from "../setup"
const ethers_1 = require("ethers");
const HashUtils = __importStar(require("./HashUtils"));
const Addresses_1 = __importDefault(require("./Addresses"));
const utils_1 = require("ethers/lib/utils");
const OptimismZap__factory_1 = require("../typechain/factories/OptimismZap__factory");
// Reusable example data.
const chain = "kovanOptimism"; // TODO: Make this configurable based off web3
const bytes4ify = (givenNumber) => utils_1.hexZeroPad(utils_1.hexlify(givenNumber), 4);
const mintByOwnerForOwner = (zapContract, ipfsHash, seriesTotal, serialNumber) => {
    return zapContract.mintByOwnerForOwner(ipfsHash, bytes4ify(seriesTotal), bytes4ify(serialNumber));
};
exports.mintByOwnerForOwner = mintByOwnerForOwner;
const getZapMintIntentTypedDataToSign = (typedDataDomain, ipfsHash, zapper, seriesTotal, serialNumber) => {
    return {
        typedDataDomain,
        types: { ZapMintIntent: HashUtils.ZapMintIntent },
        zapMintIntent: {
            mintIntent: HashUtils.MINT_INTENT_STATEMENT,
            ipfsHash,
            zapper,
            seriesTotal,
            serialNumber,
        },
    };
};
exports.getZapMintIntentTypedDataToSign = getZapMintIntentTypedDataToSign;
const requestWalletAccess = async (window) => {
    let provider;
    if (typeof (window.ethereum) !== "undefined") {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        provider = new ethers_1.providers.Web3Provider(window.ethereum);
    }
    else {
        provider = ethers_1.getDefaultProvider(); // use ethers.js underlying fallbacks
    }
    const approvedSigner = provider.getSigner();
    const zapContract = OptimismZap__factory_1.OptimismZap__factory.connect(Addresses_1.default[chain].OptimismZapContract, approvedSigner);
    return {
        provider,
        approvedSigner,
        zapContract,
    };
};
exports.requestWalletAccess = requestWalletAccess;
//# sourceMappingURL=OptimismZapContractActions.js.map