// Credit: domainSeparator function & EIP712DomainStructDef (originally EIP712Domain) taken from @openzeppelin/contracts repo

import { TypedDataUtils } from "eth-sig-util"
import { BytesLike } from "ethers"
import { solidityKeccak256, hexlify } from "ethers/lib/utils"

export const MINT_INTENT_STATEMENT = "I intend to mint this Zap NFT.";
export const MINT_INTENT_STATEMENT_HASH = solidityKeccak256(["string"], [MINT_INTENT_STATEMENT])

export const ZAP_MINT_INTENT_TYPE = "ZapMintIntent(string mintIntent,bytes32 ipfsHash,address zapper,bytes4 seriesTotal,bytes4 serialNumber)"
export const ZAP_MINT_INTENT_TYPE_HASH = solidityKeccak256(["string"], [ZAP_MINT_INTENT_TYPE])

export const ZAP_DATA_TYPE = "ZapData(bytes32 ipfsHash,address zapper,bytes4 seriesTotal,bytes4 serialNumber)";
export const ZAP_DATA_TYPE_HASH = solidityKeccak256(["string"], [ZAP_DATA_TYPE]);

export const SERIES_PUBLICATION_TYPE = "SeriesPublication(bytes32 ipfsHash,address zapper,bytes4 seriesTotal)";
export const SERIES_PUBLICATION_TYPE_HASH = solidityKeccak256(["string"], [SERIES_PUBLICATION_TYPE]);

export const SERIES_FINGERPRINT_TYPE = "SeriesFingerprint(bytes32 ipfsHash,address zapper)";
export const SERIES_FINGERPRINT_TYPE_HASH = solidityKeccak256(["string"], [SERIES_FINGERPRINT_TYPE]);

export const EIP712Domain = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
]

export const ZapMintIntent = [
  { name: "mintIntent", type: "string" },
  { name: "ipfsHash", type: "bytes32" },
  { name: "zapper", type: "address" },
  { name: "seriesTotal", type: "bytes4" },
  { name: "serialNumber", type: "bytes4" },
]

export const ZapData = [
  { name: "ipfsHash", type: "bytes32" },
  { name: "zapper", type: "address" },
  { name: "seriesTotal", type: "bytes4" },
  { name: "serialNumber", type: "bytes4" },
]

export const SeriesPublication = [
  { name: "ipfsHash", type: "bytes32" },
  { name: "zapper", type: "address" },
  { name: "seriesTotal", type: "bytes4" },
]

export const SeriesFingerprint = [
  { name: "ipfsHash", type: "bytes32" },
  { name: "zapper", type: "address" },
]

/**
 * Returns domain separator as per EIP 712 spec.
 * @param name The human-readable name of the dapp
 * @param version The human-readable version of the dapp
 * @param chainId The chain id of the deployed contract
 * @param verifyingContract The contract of the dapp
 */
export function domainSeparator(
  name: string,
  version: string,
  chainId: number,
  verifyingContract: BytesLike,
) {
  return (
    "0x" +
    TypedDataUtils.hashStruct(
      "EIP712Domain",
      { name, version, chainId, verifyingContract },
      { EIP712Domain },
    ).toString("hex")
  )
}

export function eip712HashZapMintIntent(
  name: string,
  version: string,
  chainId: number,
  contractAddress: string,
  ipfsHash: BytesLike,
  zapper: BytesLike,
  seriesTotal: BytesLike,
  serialNumber: BytesLike,
): BytesLike {
  // This is confusing, but `TypedDataUtils.sign` just hashes according to the EIP712 spec, it doesn't actually sign anything.
  return TypedDataUtils.sign({
    types: {
      EIP712Domain,
      ZapMintIntent,
    },
    domain: { name, version, chainId, verifyingContract: contractAddress },
    primaryType: "ZapMintIntent" as const,
    message: {
      mintIntent: MINT_INTENT_STATEMENT,
      ipfsHash,
      zapper,
      seriesTotal,
      serialNumber,
    },
  })
}

export function eip712HashZapData(
  name: string,
  version: string,
  chainId: number,
  contractAddress: string,
  ipfsHash: BytesLike,
  zapper: BytesLike,
  seriesTotal: BytesLike,
  serialNumber: BytesLike,
): BytesLike {
  // This is confusing, but `TypedDataUtils.sign` just hashes according to the EIP712 spec, it doesn't actually sign anything.
  return TypedDataUtils.sign({
    types: {
      EIP712Domain,
      ZapData,
    },
    domain: { name, version, chainId, verifyingContract: contractAddress },
    primaryType: "ZapData" as const,
    message: {
      ipfsHash,
      zapper,
      seriesTotal,
      serialNumber,
    },
  })
}

export function eip712HashSeriesPublication(
  name: string,
  version: string,
  chainId: number,
  contractAddress: string,
  ipfsHash: BytesLike,
  zapper: BytesLike,
  seriesTotal: BytesLike,
): BytesLike {
  // This is confusing, but `TypedDataUtils.sign` just hashes according to the EIP712 spec, it doesn't actually sign anything.
  return TypedDataUtils.sign({
    types: {
      EIP712Domain,
      SeriesPublication,
    },
    domain: { name, version, chainId, verifyingContract: contractAddress },
    primaryType: "SeriesPublication" as const,
    message: {
      ipfsHash,
      zapper,
      seriesTotal,
    },
  })
}

export function eip712HashSeriesFingerprint(
  name: string,
  version: string,
  chainId: number,
  contractAddress: string,
  ipfsHash: BytesLike,
  zapper: BytesLike,
): BytesLike {
  // This is confusing, but `TypedDataUtils.sign` just hashes according to the EIP712 spec, it doesn't actually sign anything.
  return TypedDataUtils.sign({
    types: {
      EIP712Domain,
      SeriesFingerprint,
    },
    domain: { name, version, chainId, verifyingContract: contractAddress },
    primaryType: "SeriesFingerprint" as const,
    message: {
      ipfsHash,
      zapper,
    },
  })
}
