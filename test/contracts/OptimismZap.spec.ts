import { expect } from "../setup"
import { ethers } from "hardhat"
import { BytesLike, ContractTransaction } from "ethers"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { OptimismZap__factory } from "../../typechain"
import { OptimismZap } from "../../typechain"

import * as HashUtils from "../../package-main/HashUtils"
import { ZapMintIntent, MINT_INTENT_STATEMENT } from '../../package-main/HashUtils';
import {
  hexlify,
  hexZeroPad,
} from "ethers/lib/utils"
import { getZapMintIntentTypedDataToSign } from "../../package-main/OptimismZapContractActions"
import { ZapMintIntentTypedData } from '../../package-main/ZapData';
import { success } from '../../.yalc/hardhat/src/internal/core/config/config-validation';

const name: string = "Zap"
const symbol: string = "ZAP"
const version: string = "0.1.0"
const chainId: number = 420

// Reusable example data.
const EXAMPLE_IPFS_HASH = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
const EXAMPLE_ZAPPER = "0x0123456789abcdef0123456789abcdef01234567"
const EXAMPLE_SERIAL_NUMBER = hexZeroPad(hexlify(42), 4)
const EXAMPLE_SERIES_TOTAL = hexZeroPad(hexlify(420), 4)
const EXAMPLE_PUBLICATION = { ipfsHash: EXAMPLE_IPFS_HASH, zapper: EXAMPLE_ZAPPER, seriesTotal: EXAMPLE_SERIES_TOTAL }
const EXAMPLE_SERIES_FINGERPRINT = { ipfsHash: EXAMPLE_IPFS_HASH, zapper: EXAMPLE_ZAPPER }

const MAX_GAS_LIMIT_OVERRIDE = { gasLimit: 8999999 }

const shouldBehaveLikeSuccessfulZapMint = (
  getZapContract: () => OptimismZap,
  mintFunction: (ipfsHash: BytesLike, seriesTotal: BytesLike, serialNumber: BytesLike, useGasLimitOverride: boolean) => PromiseLike<ContractTransaction>,
  getZapper: () => BytesLike,
) => {
  describe("successful Zap mint", () => {
    let ZapContract
    let zapper
    let seriesId
    let zapId

    beforeEach(() => {
      ZapContract = getZapContract()
      zapper = getZapper()
      seriesId = HashUtils.eip712HashSeriesFingerprint(
        name,
        version,
        chainId,
        ZapContract.address,
        EXAMPLE_IPFS_HASH,
        zapper,
      )
      zapId = HashUtils.eip712HashZapData(
        name,
        version,
        chainId,
        ZapContract.address,
        EXAMPLE_IPFS_HASH,
        zapper,
        EXAMPLE_SERIES_TOTAL,
        EXAMPLE_SERIAL_NUMBER,
      )
    })


    context("when minting the first Zap for a UniqueZap hash", () => {
      it("should Publish the ZapSeries, and mint the Zap to the zapper", async () => {
        expect(await ZapContract.balanceOf(zapper)).to.equal(0)
        // TODO: Need Optimism support of revert messages
        // await expect(ZapContract.ownerOf(zapId)).to.be.revertedWith("ERC721: owner query for nonexistent token")
        await expect(ZapContract.ownerOf(zapId)).to.be.reverted

        await expect(await mintFunction(EXAMPLE_IPFS_HASH, EXAMPLE_SERIES_TOTAL, EXAMPLE_SERIAL_NUMBER, true))
          .to.emit(ZapContract, "Publish").withArgs(EXAMPLE_IPFS_HASH, zapper, EXAMPLE_SERIES_TOTAL).and
          .to.emit(ZapContract, "Mint").withArgs(EXAMPLE_IPFS_HASH, zapper, EXAMPLE_SERIES_TOTAL, EXAMPLE_SERIAL_NUMBER)
        expect(await ZapContract.balanceOf(zapper)).to.equal(1)
        expect(await ZapContract.ownerOf(zapId)).to.equal(zapper)
        expect(await ZapContract.seriesPublications(seriesId)).to.deep.equal([EXAMPLE_IPFS_HASH, zapper, EXAMPLE_SERIES_TOTAL])
      })
    })
    context("after minting a Zap in a series", () => {
      beforeEach(async () => await mintFunction(EXAMPLE_IPFS_HASH, EXAMPLE_SERIES_TOTAL, hexZeroPad(hexlify(0), 4), true))

      it("should not Publish anything, and mint the Zap in the existing ZapSeries to the zapper", async () => {
        expect(await ZapContract.balanceOf(zapper)).to.equal(1)

        // TODO: Need Optimism support of revert messages
        // await expect(ZapContract.ownerOf(zapId)).to.be.revertedWith("ERC721: owner query for nonexistent token")
        await expect(ZapContract.ownerOf(zapId)).to.be.reverted

        await expect(await mintFunction(EXAMPLE_IPFS_HASH, EXAMPLE_SERIES_TOTAL, EXAMPLE_SERIAL_NUMBER, true))
          .to.emit(ZapContract, "Mint").withArgs(EXAMPLE_IPFS_HASH, zapper, EXAMPLE_SERIES_TOTAL, EXAMPLE_SERIAL_NUMBER).and
          .to.not.emit(ZapContract, "Publish")
        expect(await ZapContract.balanceOf(zapper)).to.equal(2)
        expect(await ZapContract.ownerOf(zapId)).to.equal(zapper)
      })
    })

    it("should revert if minting a Zap with a serialNumber greater than seriesTotal", async () => {
      const MAX_BYTES_4 = 4294967296 - 1
      // TODO: Need Optimism support of revert messages
      // await to.revertedWith("OptimismZap: Mint of a serialNumber greater than or equal to the seriesTotal.")
      await expect(mintFunction(EXAMPLE_IPFS_HASH, EXAMPLE_SERIES_TOTAL, hexZeroPad(hexlify(MAX_BYTES_4), 4), false)).to.be.reverted;

    });

    it("should revert if minting a Zap with a serialNumber equal to the seriesTotal", async () => {
      // TODO: Need Optimism support of revert messages
      // await to.revertedWith("OptimismZap: Mint of a serialNumber greater than or equal to the seriesTotal.")
      await expect(mintFunction(EXAMPLE_IPFS_HASH, EXAMPLE_SERIES_TOTAL, EXAMPLE_SERIES_TOTAL, false)).to.be.reverted
    });

    it("should revert if minting a Zap with a seriesTotal equal to 0", async () => {
      // TODO: Need Optimism support of revert messages
      // await to.revertedWith("OptimismZap: Mint of a serialNumber greater than or equal to the seriesTotal.")
      await expect(mintFunction(EXAMPLE_IPFS_HASH, hexZeroPad(hexlify(0), 4), hexZeroPad(hexlify(0), 4), false)).to.be.reverted
    });
  })
}

const shouldBehaveLikeZapMintWithoutApproval = (
  getZapContract: () => OptimismZap,
  mintFunction: (ipfsHash: BytesLike, seriesTotal: BytesLike, serialNumber: BytesLike, useGasLimitOverride: boolean) => PromiseLike<ContractTransaction>,
  getZapper: () => BytesLike
) => {
  let ZapContract
  let zapId

  beforeEach(() => {
    ZapContract = getZapContract()
    zapId = HashUtils.eip712HashZapData(
      name,
      version,
      chainId,
      ZapContract.address,
      EXAMPLE_IPFS_HASH,
      getZapper(),
      EXAMPLE_SERIES_TOTAL,
      EXAMPLE_SERIAL_NUMBER,
    )
  })

  describe("zap mint without approval", () => {
    it("should mint the Zap without approving any addresses", async () => {
      await expect(await mintFunction(EXAMPLE_IPFS_HASH, EXAMPLE_SERIES_TOTAL, EXAMPLE_SERIAL_NUMBER, true))
        .to.not.emit(ZapContract, "Approval")
      expect(await ZapContract.getApproved(zapId)).to.equal(hexZeroPad(hexlify(0), 20))
    })
  })
}

describe("OptimismZap", () => {
  let zapper: SignerWithAddress
  let contractOwner: SignerWithAddress
  let rando1: SignerWithAddress

  let ZapContract: OptimismZap

  before(async () => {
    [zapper, contractOwner, rando1, rando1] = await ethers.getSigners()

  })

  // TODO: Should have a test for every possible input param that could be mismatched with signature - can share these specs with other ZapMintIntent signature verifiers with a 'behave' block.
  context('write functions', () => {
    beforeEach(async () => {
      ZapContract = await new OptimismZap__factory(contractOwner).deploy(version)
    })

    describe("mintByOwnerForOwner", () => {
      const getContractOwnerAddress = () => contractOwner.address
      const successfulMintByOwnerForOwner = async (ipfsHash, seriesTotal, serialNumber, useGasLimitOverride) => {
        return ZapContract.mintByOwnerForOwner(
          ipfsHash,
          seriesTotal,
          serialNumber,
          useGasLimitOverride ? MAX_GAS_LIMIT_OVERRIDE : {}
        )
      }
      shouldBehaveLikeSuccessfulZapMint(
        () => ZapContract,
        successfulMintByOwnerForOwner,
        getContractOwnerAddress,
      )
      shouldBehaveLikeZapMintWithoutApproval(
        () => ZapContract,
        successfulMintByOwnerForOwner,
        getContractOwnerAddress
      )

      it("reverts when called by an address other than the contract owner", async () => {
        const randoCaller = rando1.address;
        await expect(ZapContract.connect(randoCaller).mintByOwnerForOwner(
          EXAMPLE_IPFS_HASH,
          EXAMPLE_SERIES_TOTAL,
          EXAMPLE_SERIAL_NUMBER,
        )).to.be.reverted
        // TODO: Need Optimism support of revert messages
        // )).to.revertedWith("Ownable: caller is not the owner")
      })
    })

    describe("mintByOwner", () => {
      const getZapperAddress = () => zapper.address
      const successfulMintByOwner = async (ipfsHash, seriesTotal, serialNumber, useGasLimitOverride) => {
        const typedData: ZapMintIntentTypedData = getZapMintIntentTypedDataToSign(
          {
            name,
            version,
            chainId,
            verifyingContract: ZapContract.address,
          },
          ipfsHash,
          getZapperAddress(),
          seriesTotal,
          serialNumber,
        )
        const zapperSignature = await zapper._signTypedData(typedData.typedDataDomain, typedData.types, typedData.zapMintIntent)
        return ZapContract.connect(contractOwner).mintByOwner(
          ipfsHash,
          seriesTotal,
          serialNumber,
          getZapperAddress(),
          zapperSignature,
          useGasLimitOverride ? MAX_GAS_LIMIT_OVERRIDE : {}
        );
      }
      shouldBehaveLikeSuccessfulZapMint(
        () => ZapContract,
        successfulMintByOwner,
        getZapperAddress,
      )

      shouldBehaveLikeZapMintWithoutApproval(
        () => ZapContract,
        successfulMintByOwner,
        getZapperAddress
      )

      it("reverts when called by an address other than the contract owner", async () => {
        const typedData: ZapMintIntentTypedData = getZapMintIntentTypedDataToSign({ name, version, chainId, verifyingContract: ZapContract.address }, EXAMPLE_IPFS_HASH, getZapperAddress(), EXAMPLE_SERIES_TOTAL, EXAMPLE_SERIAL_NUMBER)
        const zapperSignature = await zapper._signTypedData(typedData.typedDataDomain, typedData.types, typedData.zapMintIntent);
        await expect(ZapContract.connect(rando1).mintByOwner(
          EXAMPLE_IPFS_HASH,
          EXAMPLE_SERIES_TOTAL,
          EXAMPLE_SERIAL_NUMBER,
          getZapperAddress(),
          zapperSignature
        )).to.be.reverted
        // TODO: Need Optimism support of revert messages
        // )).to.revertedWith("Ownable: caller is not the owner");
      })

      it("reverts when the zapperSignatureData does not match the claimedZapper", async () => {
        const claimedZapperAddress = contractOwner.address;
        const typedData: ZapMintIntentTypedData = getZapMintIntentTypedDataToSign(
          { name, version, chainId, verifyingContract: ZapContract.address },
          EXAMPLE_IPFS_HASH,
          claimedZapperAddress,
          EXAMPLE_SERIES_TOTAL,
          EXAMPLE_SERIAL_NUMBER
        )
        const fraudulentZapperSignature = await rando1._signTypedData(typedData.typedDataDomain, typedData.types, typedData.zapMintIntent)
        await expect(ZapContract.connect(contractOwner).mintByOwner(
          EXAMPLE_IPFS_HASH,
          EXAMPLE_SERIES_TOTAL,
          EXAMPLE_SERIAL_NUMBER,
          claimedZapperAddress,
          fraudulentZapperSignature
        )).to.be.reverted
        // TODO: Need Optimism support of revert messages
        // )).to.revertedWith("OptimismZap: Signature address must match claimedZapper.");
      })

      it("reverts when the zapperSignatureData does not match the inputted Zap data", async () => {
        const typedDataWithDifferentZapper = getZapMintIntentTypedDataToSign(
          { name, version, chainId, verifyingContract: ZapContract.address },
          EXAMPLE_IPFS_HASH,
          rando1.address,
          EXAMPLE_SERIES_TOTAL,
          EXAMPLE_SERIAL_NUMBER
        )
        const mismatchedDataContractOwnerSignature = await contractOwner._signTypedData(
          typedDataWithDifferentZapper.typedDataDomain,
          typedDataWithDifferentZapper.types,
          typedDataWithDifferentZapper.zapMintIntent
        )
        await expect(ZapContract.connect(contractOwner).mintByOwner(
          EXAMPLE_IPFS_HASH,
          EXAMPLE_SERIES_TOTAL,
          EXAMPLE_SERIAL_NUMBER,
          rando1.address,
          mismatchedDataContractOwnerSignature
        )).to.be.reverted
        // TODO: Need Optimism support of revert messages
        // )).to.revertedWith("OptimismZap: Signature address must match claimedZapper.");
      })
    })

    describe("mintByZapper", () => {
      const getZapperAddress = () => zapper.address;
      const successfulMintByZapper = async (ipfsHash, seriesTotal, serialNumber, useGasLimitOverride) => {
        const typedData: ZapMintIntentTypedData = getZapMintIntentTypedDataToSign(
          {
            name,
            version,
            chainId,
            verifyingContract: ZapContract.address,
          },
          ipfsHash,
          getZapperAddress(),
          seriesTotal,
          serialNumber,
        )
        const contractOwnerSignature = await contractOwner._signTypedData(typedData.typedDataDomain, typedData.types, typedData.zapMintIntent)
        return ZapContract.connect(zapper).mintByZapper(
          ipfsHash,
          seriesTotal,
          serialNumber,
          contractOwnerSignature,
          useGasLimitOverride ? MAX_GAS_LIMIT_OVERRIDE : {}
        );
      }
      shouldBehaveLikeSuccessfulZapMint(
        () => ZapContract,
        successfulMintByZapper,
        getZapperAddress,
      )

      shouldBehaveLikeZapMintWithoutApproval(
        () => ZapContract,
        successfulMintByZapper,
        getZapperAddress
      )

      it("reverts when the contractOwnerSignatureData does not match the contract owner", async () => {
        const getZapperAddress = () => rando1.address;
        const fraudulentContractOwnerSignature = await rando1._signTypedData(
          { name, version, chainId, verifyingContract: ZapContract.address },
          {
            ZapMintIntent,
          },
          {
            mintIntent: MINT_INTENT_STATEMENT,
            ipfsHash: EXAMPLE_IPFS_HASH,
            zapper: getZapperAddress(),
            seriesTotal: EXAMPLE_SERIES_TOTAL,
            serialNumber: EXAMPLE_SERIAL_NUMBER,
          },
        );
        await expect(ZapContract.connect(rando1).mintByZapper(
          EXAMPLE_IPFS_HASH,
          EXAMPLE_SERIES_TOTAL,
          EXAMPLE_SERIAL_NUMBER,
          fraudulentContractOwnerSignature
        )).to.be.reverted
        // TODO: Use this when revert messages supported by optimism.
        // )).to.revertedWith("Zap: Signature address must match contract owner.");
      })

      it("reverts when the contractOwnerSignatureData does not match the inputted Zap data", async () => {
        const wrongZapper = rando1.address;
        const contractOwnerSignatureOfOtherData = await contractOwner._signTypedData(
          { name, version, chainId, verifyingContract: ZapContract.address },
          {
            ZapMintIntent,
          },
          {
            mintIntent: MINT_INTENT_STATEMENT,
            ipfsHash: EXAMPLE_IPFS_HASH,
            zapper: wrongZapper,
            seriesTotal: EXAMPLE_SERIES_TOTAL,
            serialNumber: EXAMPLE_SERIAL_NUMBER,
          },
        );
        await expect(ZapContract.connect(zapper).mintByZapper(
          EXAMPLE_IPFS_HASH,
          EXAMPLE_SERIES_TOTAL,
          EXAMPLE_SERIAL_NUMBER,
          contractOwnerSignatureOfOtherData
        )).to.be.reverted
        // TODO: Use this when revert messages supported by optimism.
        // )).to.revertedWith("Zap: Signature address must match contract owner.");
      })
    })

    describe("mintBySignatures", () => {
      const getZapperAddress = () => zapper.address;
      const successfulMintBySignatures = async (ipfsHash, seriesTotal, serialNumber, useGasLimitOverride) => {
        return await ZapContract.connect(rando1).mintBySignatures(
          ipfsHash,
          seriesTotal,
          serialNumber,
          getZapperAddress(),
          await zapper._signTypedData(
            { name, version, chainId, verifyingContract: ZapContract.address },
            {
              ZapMintIntent,
            },
            {
              mintIntent: MINT_INTENT_STATEMENT,
              ipfsHash,
              zapper: getZapperAddress(),
              seriesTotal,
              serialNumber,
            },
          ),
          await contractOwner._signTypedData(
            { name, version, chainId, verifyingContract: ZapContract.address },
            {
              ZapMintIntent,
            },
            {
              mintIntent: MINT_INTENT_STATEMENT,
              ipfsHash,
              zapper: getZapperAddress(),
              seriesTotal,
              serialNumber,
            },
          ),
          useGasLimitOverride ? MAX_GAS_LIMIT_OVERRIDE : {}
        );
      }
      shouldBehaveLikeSuccessfulZapMint(
        () => ZapContract,
        successfulMintBySignatures,
        getZapperAddress,
      )

      shouldBehaveLikeZapMintWithoutApproval(
        () => ZapContract,
        successfulMintBySignatures,
        getZapperAddress
      )

      it("raises an error when the contract owner signature was not created by the contract owner", async () => {
        const zapperAddress = zapper.address
        const typedData: ZapMintIntentTypedData = getZapMintIntentTypedDataToSign({ name, version, chainId, verifyingContract: ZapContract.address }, EXAMPLE_IPFS_HASH, zapperAddress, EXAMPLE_SERIES_TOTAL, EXAMPLE_SERIAL_NUMBER)

        // TODO: Use this when revert messages supported by optimism.
        // await expect(mintFunction(EXAMPLE_IPFS_HASH, hexZeroPad(hexlify(0), 4), hexZeroPad(hexlify(0), 4))).to.revertedWith("OptimismZap: Mint of a serialNumber greater than or equal to the seriesTotal.")
        await expect(ZapContract.connect(zapper).mintBySignatures(
          EXAMPLE_IPFS_HASH,
          EXAMPLE_SERIES_TOTAL,
          EXAMPLE_SERIAL_NUMBER,
          getZapperAddress(),
          await zapper._signTypedData(typedData.typedDataDomain, typedData.types, typedData.zapMintIntent),
          await rando1._signTypedData(typedData.typedDataDomain, typedData.types, typedData.zapMintIntent)
        )).to.be.reverted;
        // TODO: Need Optimism support of revert messages
        // .to.revertedWith("OptimismZap: Mint of a serialNumber greater than or equal to the seriesTotal.")
      })

      it("raises an error when the zapper signature was not created by the zapper", () => { })

      it("raises an error when the contract owner signature data does not match the given data", () => { })

      it("raises an error when the zapper signature data does not match the given data", () => { })
    })
  })

  // At the moment, VIEW/PURE FUNCTIONS can share the same contract deployment.
  context("view/pure functions", () => {
    before(async () => {
      ZapContract = await new OptimismZap__factory(zapper).deploy(version)
    })

    describe("name", () => {
      it("should match the name passed to the contract deploy", async () => {
        const contractName: String = await ZapContract.name()
        expect(contractName).to.equal(name)
      })
    })

    describe("symbol", () => {
      it("should match the name passed to the contract deploy", async () => {
        const contractSymbol: String = await ZapContract.symbol()
        expect(contractSymbol).to.equal(symbol)
      })
    })

    describe("MINT_INTENT_STATEMENT_HASH", () => {
      it("should match the MINT_INTENT_STATEMENT_HASH in the contract", async () => {
        const mintIntentStatementHash: String = await ZapContract.MINT_INTENT_STATEMENT_HASH()
        expect(HashUtils.MINT_INTENT_STATEMENT_HASH).to.equal(
          mintIntentStatementHash,
        )
      })
    })

    describe("ZAP_MINT_INTENT_TYPE_HASH", () => {
      it("should match the ZAP_MINT_INTENT_TYPE_HASH in the contract", async () => {
        const zapMintIntentTypeHash: String = await ZapContract.ZAP_MINT_INTENT_TYPE_HASH()
        expect(HashUtils.ZAP_MINT_INTENT_TYPE_HASH).to.equal(zapMintIntentTypeHash)
      })
    })

    describe("ZAP_DATA_TYPE_HASH", () => {
      it("should match the ZAP_DATA_TYPE_HASH in the contract", async () => {
        const zapDataTypeHash: String = await ZapContract.ZAP_DATA_TYPE_HASH()
        expect(HashUtils.ZAP_DATA_TYPE_HASH).to.equal(zapDataTypeHash)
      })
    })

    describe("SERIES_PUBLICATION_TYPE_HASH", () => {
      it("should match the SERIES_PUBLICATION_TYPE_HASH in the contract", async () => {
        const seriesPublicationTypeHash: String = await ZapContract.SERIES_PUBLICATION_TYPE_HASH()
        expect(HashUtils.SERIES_PUBLICATION_TYPE_HASH).to.equal(seriesPublicationTypeHash)
      })
    })

    describe("SERIES_FINGERPRINT_TYPE_HASH", () => {
      it("should match the SERIES_FINGERPRINT_TYPE_HASH in the contract", async () => {
        const seriesFingerprintTypeHash: String = await ZapContract.SERIES_FINGERPRINT_TYPE_HASH()
        expect(HashUtils.SERIES_FINGERPRINT_TYPE_HASH).to.equal(seriesFingerprintTypeHash)
      })
    })

    describe("tokenURI", () => {
      it("should match the ipfs url of the given ipfs hash", () => {
        // TODO: This
      })
    })

    context('EIP712 Hash methods', () => {
      // Not a huge fan of the following specs since arguably they're testing whether keccak256 is behaving as expected.
      // That being said, I see these as assertions of which properties should be inputs to our hash function.
      describe("eip712HashZapMintIntent", () => {
        let eip712HashZapMintIntentString: BytesLike

        beforeEach(() => {
          eip712HashZapMintIntentString = hexlify(HashUtils.eip712HashZapMintIntent(
            name,
            version,
            chainId,
            ZapContract.address,
            EXAMPLE_IPFS_HASH,
            EXAMPLE_ZAPPER,
            EXAMPLE_SERIES_TOTAL,
            EXAMPLE_SERIAL_NUMBER,
          ))
        })

        it("should produce the _hashTypedDataV4 hash of the keccak256 hash of an inputted ZapMintIntent struct", async () => {
          expect(eip712HashZapMintIntentString).to.equal(
            await ZapContract.eip712HashZapMintIntent(EXAMPLE_PUBLICATION, EXAMPLE_SERIAL_NUMBER),
          )
        })

        it("should vary when contractAddress differs", async () => {
          const otherZapContract: OptimismZap = await new OptimismZap__factory(
            contractOwner,
          ).deploy(version)
          expect(eip712HashZapMintIntentString).to.not.equal(
            await otherZapContract.eip712HashZapMintIntent(
              EXAMPLE_PUBLICATION,
              EXAMPLE_SERIAL_NUMBER,
            ),
          )
        })

        it("should vary when ipfsHash differs", async () => {
          const otherIpfsHash =
            "0x90019001900190019001900190abcdef0123456789abcdef0123456789abcdef"
          const differentIpfsHashPublication = {
            ipfsHash: otherIpfsHash,
            zapper: EXAMPLE_ZAPPER,
            seriesTotal: EXAMPLE_SERIES_TOTAL,
          }
          expect(eip712HashZapMintIntentString).to.not.equal(
            await ZapContract.eip712HashZapMintIntent(
              differentIpfsHashPublication,
              EXAMPLE_SERIAL_NUMBER,
            ),
          )
        })

        it("should vary when zapper differs", async () => {
          const otherZapper = "0xd00dd00dd00dd00dd00dd00dd00dd00dd00dd00d"
          const differentZapperPublication = { ipfsHash: EXAMPLE_IPFS_HASH, zapper: otherZapper, seriesTotal: EXAMPLE_SERIES_TOTAL }
          expect(eip712HashZapMintIntentString).to.not.equal(
            await ZapContract.eip712HashZapMintIntent(differentZapperPublication, EXAMPLE_SERIAL_NUMBER),
          )
        })


        it("should vary when seriesTotal differs", async () => {
          const otherSeriesTotal = "0x0000000f"
          const differentSeriesTotalPublication = { ipfsHash: EXAMPLE_IPFS_HASH, zapper: EXAMPLE_ZAPPER, seriesTotal: otherSeriesTotal }
          expect(eip712HashZapMintIntentString).to.not.equal(
            await ZapContract.eip712HashZapData(differentSeriesTotalPublication, EXAMPLE_SERIAL_NUMBER),
          )
        })

        it("should vary when serialNumber differs", async () => {
          const otherSerialNumber = "0x0000000f"
          expect(eip712HashZapMintIntentString).to.not.equal(
            await ZapContract.eip712HashZapData(EXAMPLE_PUBLICATION, otherSerialNumber),
          )
        })

        it("should vary when chainid differs", () => { })
      })

      describe("eip712HashZapData", () => {
        let eip712HashZapDataString: BytesLike

        beforeEach(() => {
          eip712HashZapDataString = hexlify(HashUtils.eip712HashZapData(
            name,
            version,
            chainId,
            ZapContract.address,
            EXAMPLE_IPFS_HASH,
            EXAMPLE_ZAPPER,
            EXAMPLE_SERIES_TOTAL,
            EXAMPLE_SERIAL_NUMBER,
          ))
        })

        it("should produce the _hashTypedDataV4 hash of the keccak256 hash of an inputted ZapData struct", async () => {
          expect(eip712HashZapDataString).to.equal(
            await ZapContract.eip712HashZapData(EXAMPLE_PUBLICATION, EXAMPLE_SERIAL_NUMBER),
          )
        })

        it("should vary when contractAddress differs", async () => {
          const otherZapContract: OptimismZap = await new OptimismZap__factory(
            contractOwner,
          ).deploy(version)
          expect(eip712HashZapDataString).to.not.equal(
            await otherZapContract.eip712HashZapData(
              EXAMPLE_PUBLICATION,
              EXAMPLE_SERIAL_NUMBER,
            ),
          )
        })

        it("should vary when ipfsHash differs", async () => {
          const otherIpfsHash =
            "0x90019001900190019001900190abcdef0123456789abcdef0123456789abcdef"
          const differentIpfsHashPublication = {
            ipfsHash: otherIpfsHash,
            zapper: EXAMPLE_ZAPPER,
            seriesTotal: EXAMPLE_SERIES_TOTAL,
          }
          expect(eip712HashZapDataString).to.not.equal(
            await ZapContract.eip712HashZapData(
              differentIpfsHashPublication,
              EXAMPLE_SERIAL_NUMBER,
            ),
          )
        })

        it("should vary when zapper differs", async () => {
          const otherZapper = "0xd00dd00dd00dd00dd00dd00dd00dd00dd00dd00d"
          const differentZapperPublication = { ipfsHash: EXAMPLE_IPFS_HASH, zapper: otherZapper, seriesTotal: EXAMPLE_SERIES_TOTAL }
          expect(eip712HashZapDataString).to.not.equal(
            await ZapContract.eip712HashZapData(differentZapperPublication, EXAMPLE_SERIAL_NUMBER),
          )
        })

        it("should vary when seriesTotal differs", async () => {
          const otherSeriesTotal = "0x0000000f"
          const differentSeriesTotalPublication = { ipfsHash: EXAMPLE_IPFS_HASH, zapper: EXAMPLE_ZAPPER, seriesTotal: otherSeriesTotal }
          expect(eip712HashZapDataString).to.not.equal(
            await ZapContract.eip712HashZapData(differentSeriesTotalPublication, EXAMPLE_SERIAL_NUMBER),
          )
        })

        it("should vary when serialNumber differs", async () => {
          const otherSerialNumber = "0x0000000f"
          expect(eip712HashZapDataString).to.not.equal(
            await ZapContract.eip712HashZapData(EXAMPLE_PUBLICATION, otherSerialNumber),
          )
        })

        it("should vary when chainid differs", () => { })
      })

      describe("eip712HashSeriesPublication", () => {
        let eip712HashSeriesPublicationString: BytesLike

        beforeEach(() => {
          eip712HashSeriesPublicationString = hexlify(HashUtils.eip712HashSeriesPublication(
            name,
            version,
            chainId,
            ZapContract.address,
            EXAMPLE_IPFS_HASH,
            EXAMPLE_ZAPPER,
            EXAMPLE_SERIES_TOTAL,
          ))
        })

        it("should produce the _hashTypedDataV4 hash of the keccak256 hash of an inputted ZapData struct", async () => {
          expect(eip712HashSeriesPublicationString).to.equal(
            await ZapContract.eip712HashSeriesPublication(EXAMPLE_PUBLICATION),
          )
        })

        // Not a huge fan of the following specs since arguably they're testing whether keccak256 is behaving as expected.
        // That being said, I see these as assertions of which properties should be inputs to our hash function.
        it("should vary when contractAddress differs", async () => {
          const otherZapContract: OptimismZap = await new OptimismZap__factory(
            contractOwner,
          ).deploy(version)
          expect(eip712HashSeriesPublicationString).to.not.equal(
            await otherZapContract.eip712HashSeriesPublication(
              EXAMPLE_PUBLICATION
            ),
          )
        })

        it("should vary when ipfsHash differs", async () => {
          const otherIpfsHash =
            "0x90019001900190019001900190abcdef0123456789abcdef0123456789abcdef"
          const differentIpfsHashPublication = {
            ipfsHash: otherIpfsHash,
            zapper: EXAMPLE_ZAPPER,
            seriesTotal: EXAMPLE_SERIES_TOTAL,
          }
          expect(eip712HashSeriesPublicationString).to.not.equal(
            await ZapContract.eip712HashSeriesPublication(
              differentIpfsHashPublication,
            ),
          )
        })

        it("should vary when zapper differs", async () => {
          const otherZapper = "0xd00dd00dd00dd00dd00dd00dd00dd00dd00dd00d"
          const differentZapperPublication = { ipfsHash: EXAMPLE_IPFS_HASH, zapper: otherZapper, seriesTotal: EXAMPLE_SERIES_TOTAL }
          expect(eip712HashSeriesPublicationString).to.not.equal(
            await ZapContract.eip712HashSeriesPublication(differentZapperPublication),
          )
        })

        it("should vary when seriesTotal differs", async () => {
          const otherSeriesTotal = "0x0000000f"
          const differentSeriesTotalPublication = { ipfsHash: EXAMPLE_IPFS_HASH, zapper: EXAMPLE_ZAPPER, seriesTotal: otherSeriesTotal }
          expect(eip712HashSeriesPublicationString).to.not.equal(
            await ZapContract.eip712HashSeriesPublication(differentSeriesTotalPublication),
          )
        })

        it("should vary when chainid differs", () => { })
      })

      describe("eip712HashSeriesFingerprint", () => {
        let eip712HashSeriesFingerprintString: BytesLike

        beforeEach(() => {
          eip712HashSeriesFingerprintString = hexlify(HashUtils.eip712HashSeriesFingerprint(
            name,
            version,
            chainId,
            ZapContract.address,
            EXAMPLE_IPFS_HASH,
            EXAMPLE_ZAPPER,
          ))
        })


        it("should produce the _hashTypedDataV4 hash of the keccak256 hash of an inputted SeriesFingerprint struct", async () => {
          expect(eip712HashSeriesFingerprintString).to.equal(
            await ZapContract.eip712HashSeriesFingerprint(EXAMPLE_SERIES_FINGERPRINT),
          )
        })

        // Not a huge fan of the following specs since arguably they're testing whether keccak256 is behaving as expected.
        // That being said, I see these as assertions of which properties should be inputs to our hash function.
        it("should vary when contractAddress differs", async () => {
          const otherZapContract: OptimismZap = await new OptimismZap__factory(
            contractOwner,
          ).deploy(version)
          expect(eip712HashSeriesFingerprintString).to.not.equal(
            await otherZapContract.eip712HashSeriesFingerprint(
              EXAMPLE_SERIES_FINGERPRINT,
            ),
          )
        })

        it("should vary when ipfsHash differs", async () => {
          const otherIpfsHash =
            "0x90019001900190019001900190abcdef0123456789abcdef0123456789abcdef"
          const differentIpfsHashSeriesFingerprint = {
            ipfsHash: otherIpfsHash,
            zapper: EXAMPLE_ZAPPER,
          }
          expect(eip712HashSeriesFingerprintString).to.not.equal(
            await ZapContract.eip712HashSeriesFingerprint(
              differentIpfsHashSeriesFingerprint,
            ),
          )
        })

        it("should vary when zapper differs", async () => {
          const otherZapper = "0xd00dd00dd00dd00dd00dd00dd00dd00dd00dd00d"
          const differentZapperSeriesFingerprint = { ipfsHash: EXAMPLE_IPFS_HASH, zapper: otherZapper }
          expect(eip712HashSeriesFingerprintString).to.not.equal(
            await ZapContract.eip712HashSeriesFingerprint(differentZapperSeriesFingerprint),
          )
        })

        it("should vary when chainid differs", () => {
          //TODO: This
        })
      })
    });
  });
})
