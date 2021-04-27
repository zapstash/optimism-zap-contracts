"use strict";
// Credit: domainSeparator function & EIP712DomainStructDef (originally EIP712Domain) taken from @openzeppelin/contracts repo
Object.defineProperty(exports, "__esModule", { value: true });
exports.eip712HashSeriesFingerprint = exports.eip712HashSeriesPublication = exports.eip712HashZapData = exports.eip712HashZapMintIntent = exports.SeriesFingerprint = exports.SeriesPublication = exports.ZapData = exports.ZapMintIntent = exports.EIP712Domain = exports.SERIES_FINGERPRINT_TYPE_HASH = exports.SERIES_FINGERPRINT_TYPE = exports.SERIES_PUBLICATION_TYPE_HASH = exports.SERIES_PUBLICATION_TYPE = exports.ZAP_DATA_TYPE_HASH = exports.ZAP_DATA_TYPE = exports.ZAP_MINT_INTENT_TYPE_HASH = exports.ZAP_MINT_INTENT_TYPE = exports.MINT_INTENT_STATEMENT_HASH = exports.MINT_INTENT_STATEMENT = void 0;
const eth_sig_util_1 = require("eth-sig-util");
const utils_1 = require("ethers/lib/utils");
exports.MINT_INTENT_STATEMENT = "I intend to mint this Zap NFT.";
exports.MINT_INTENT_STATEMENT_HASH = utils_1.solidityKeccak256(["string"], [exports.MINT_INTENT_STATEMENT]);
exports.ZAP_MINT_INTENT_TYPE = "ZapMintIntent(string mintIntent,bytes32 ipfsHash,address zapper,bytes4 seriesTotal,bytes4 serialNumber)";
exports.ZAP_MINT_INTENT_TYPE_HASH = utils_1.solidityKeccak256(["string"], [exports.ZAP_MINT_INTENT_TYPE]);
exports.ZAP_DATA_TYPE = "ZapData(bytes32 ipfsHash,address zapper,bytes4 seriesTotal,bytes4 serialNumber)";
exports.ZAP_DATA_TYPE_HASH = utils_1.solidityKeccak256(["string"], [exports.ZAP_DATA_TYPE]);
exports.SERIES_PUBLICATION_TYPE = "SeriesPublication(bytes32 ipfsHash,address zapper,bytes4 seriesTotal)";
exports.SERIES_PUBLICATION_TYPE_HASH = utils_1.solidityKeccak256(["string"], [exports.SERIES_PUBLICATION_TYPE]);
exports.SERIES_FINGERPRINT_TYPE = "SeriesFingerprint(bytes32 ipfsHash,address zapper)";
exports.SERIES_FINGERPRINT_TYPE_HASH = utils_1.solidityKeccak256(["string"], [exports.SERIES_FINGERPRINT_TYPE]);
exports.EIP712Domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
];
exports.ZapMintIntent = [
    { name: "mintIntent", type: "string" },
    { name: "ipfsHash", type: "bytes32" },
    { name: "zapper", type: "address" },
    { name: "seriesTotal", type: "bytes4" },
    { name: "serialNumber", type: "bytes4" },
];
exports.ZapData = [
    { name: "ipfsHash", type: "bytes32" },
    { name: "zapper", type: "address" },
    { name: "seriesTotal", type: "bytes4" },
    { name: "serialNumber", type: "bytes4" },
];
exports.SeriesPublication = [
    { name: "ipfsHash", type: "bytes32" },
    { name: "zapper", type: "address" },
    { name: "seriesTotal", type: "bytes4" },
];
exports.SeriesFingerprint = [
    { name: "ipfsHash", type: "bytes32" },
    { name: "zapper", type: "address" },
];
function eip712HashZapMintIntent(name, version, chainId, contractAddress, ipfsHash, zapper, seriesTotal, serialNumber) {
    // This is confusing, but `TypedDataUtils.sign` just hashes according to the EIP712 spec, it doesn't actually sign anything.
    return eth_sig_util_1.TypedDataUtils.sign({
        types: {
            EIP712Domain: exports.EIP712Domain,
            ZapMintIntent: exports.ZapMintIntent,
        },
        domain: { name, version, chainId, verifyingContract: contractAddress },
        primaryType: "ZapMintIntent",
        message: {
            mintIntent: exports.MINT_INTENT_STATEMENT,
            ipfsHash,
            zapper,
            seriesTotal,
            serialNumber,
        },
    });
}
exports.eip712HashZapMintIntent = eip712HashZapMintIntent;
function eip712HashZapData(name, version, chainId, contractAddress, ipfsHash, zapper, seriesTotal, serialNumber) {
    // This is confusing, but `TypedDataUtils.sign` just hashes according to the EIP712 spec, it doesn't actually sign anything.
    return eth_sig_util_1.TypedDataUtils.sign({
        types: {
            EIP712Domain: exports.EIP712Domain,
            ZapData: exports.ZapData,
        },
        domain: { name, version, chainId, verifyingContract: contractAddress },
        primaryType: "ZapData",
        message: {
            ipfsHash,
            zapper,
            seriesTotal,
            serialNumber,
        },
    });
}
exports.eip712HashZapData = eip712HashZapData;
function eip712HashSeriesPublication(name, version, chainId, contractAddress, ipfsHash, zapper, seriesTotal) {
    // This is confusing, but `TypedDataUtils.sign` just hashes according to the EIP712 spec, it doesn't actually sign anything.
    return eth_sig_util_1.TypedDataUtils.sign({
        types: {
            EIP712Domain: exports.EIP712Domain,
            SeriesPublication: exports.SeriesPublication,
        },
        domain: { name, version, chainId, verifyingContract: contractAddress },
        primaryType: "SeriesPublication",
        message: {
            ipfsHash,
            zapper,
            seriesTotal,
        },
    });
}
exports.eip712HashSeriesPublication = eip712HashSeriesPublication;
function eip712HashSeriesFingerprint(name, version, chainId, contractAddress, ipfsHash, zapper) {
    // This is confusing, but `TypedDataUtils.sign` just hashes according to the EIP712 spec, it doesn't actually sign anything.
    return eth_sig_util_1.TypedDataUtils.sign({
        types: {
            EIP712Domain: exports.EIP712Domain,
            SeriesFingerprint: exports.SeriesFingerprint,
        },
        domain: { name, version, chainId, verifyingContract: contractAddress },
        primaryType: "SeriesFingerprint",
        message: {
            ipfsHash,
            zapper,
        },
    });
}
exports.eip712HashSeriesFingerprint = eip712HashSeriesFingerprint;
//# sourceMappingURL=HashUtils.js.map