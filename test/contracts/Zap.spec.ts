import { expect } from "../setup"
import { ethers } from "hardhat"
import { BytesLike, ContractTransaction } from "ethers"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { Zap__factory } from "../../typechain"
import { Zap } from "../../typechain"

import * as HashUtils from "../../package-main/HashUtils"
import { ZapMintIntent, MINT_INTENT_STATEMENT } from '../../package-main/HashUtils';
import {
  hexlify,
  hexZeroPad,
} from "ethers/lib/utils"

const name: string = "Zap"
const symbol: string = "ZAP"
const version: string = "0.1.0"
const chainId: number = 31337

// Reusable example data.
const exampleIpfsHash =
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
const exampleZapper = "0x0123456789abcdef0123456789abcdef01234567"
const exampleSerialNumber = hexZeroPad(hexlify(42), 4)
const exampleSeriesTotal = hexZeroPad(hexlify(420), 4)
const examplePublication = { ipfsHash: exampleIpfsHash, zapper: exampleZapper, seriesTotal: exampleSeriesTotal }
const exampleSeriesFingerprint = { ipfsHash: exampleIpfsHash, zapper: exampleZapper }

const shouldBehaveLikeSuccessfulZapMint = (
  getZapContract: () => Zap,
  mintFunction: (ipfsHash: BytesLike, seriesTotal: BytesLike, serialNumber: BytesLike) => PromiseLike<ContractTransaction>,
  getZapperAddress: () => PromiseLike<BytesLike>,
) => {
  describe("successful Zap mint", () => {
    let ZapContract
    let zapper
    let seriesId
    let zapId

    beforeEach(async () => {
      ZapContract = getZapContract()
      zapper = await getZapperAddress()
      seriesId = HashUtils.eip712HashSeriesFingerprint(
        name,
        version,
        chainId,
        ZapContract.address,
        exampleIpfsHash,
        zapper,
      )
      zapId = HashUtils.eip712HashZapData(
        name,
        version,
        chainId,
        ZapContract.address,
        exampleIpfsHash,
        zapper,
        exampleSeriesTotal,
        exampleSerialNumber,
      )
    })

    context("when minting the first Zap for a UniqueZap hash", () => {
      it("should Publish the ZapSeries, and mint the Zap to the zapper", async () => {
        expect(await ZapContract.balanceOf(zapper)).to.equal(0)
        await expect(ZapContract.ownerOf(zapId)).to.be.revertedWith("ERC721: owner query for nonexistent token")
        await expect(mintFunction(exampleIpfsHash, exampleSeriesTotal, exampleSerialNumber))
          .to.emit(ZapContract, "Publish").withArgs(exampleIpfsHash, zapper, exampleSeriesTotal).and
          .to.emit(ZapContract, "Mint").withArgs(exampleIpfsHash, zapper, exampleSeriesTotal, exampleSerialNumber)
        expect(await ZapContract.balanceOf(zapper)).to.equal(1)
        expect(await ZapContract.ownerOf(zapId)).to.equal(zapper)
        expect(await ZapContract.seriesPublications(seriesId)).to.deep.equal([exampleIpfsHash, zapper, exampleSeriesTotal])
      })
    })

    context("after minting a Zap in a series", () => {
      beforeEach(async () => mintFunction(exampleIpfsHash, exampleSeriesTotal, hexZeroPad(hexlify(0), 4)))

      it("should not Publish anything, and mint the Zap in the existing ZapSeries to the zapper", async () => {
        expect(await ZapContract.balanceOf(zapper)).to.equal(1)
        await expect(ZapContract.ownerOf(zapId)).to.be.revertedWith("ERC721: owner query for nonexistent token")
        await expect(mintFunction(exampleIpfsHash, exampleSeriesTotal, exampleSerialNumber))
          .to.emit(ZapContract, "Mint").withArgs(exampleIpfsHash, zapper, exampleSeriesTotal, exampleSerialNumber).and
          .to.not.emit(ZapContract, "Publish")
        expect(await ZapContract.balanceOf(zapper)).to.equal(2)
        expect(await ZapContract.ownerOf(zapId)).to.equal(zapper)
      })
    })

    it("should revert if minting a Zap with a serialNumber greater than seriesTotal", async () => {
      const MAX_BYTES_4 = 4294967296 - 1
      await expect(mintFunction(exampleIpfsHash, exampleSeriesTotal, hexZeroPad(hexlify(MAX_BYTES_4), 4))).to.revertedWith("Zap: Mint of a serialNumber greater than or equal to the seriesTotal.")
    });

    it("should revert if minting a Zap with a serialNumber equal to the seriesTotal", async () => {
      await expect(mintFunction(exampleIpfsHash, exampleSeriesTotal, exampleSeriesTotal)).to.revertedWith("Zap: Mint of a serialNumber greater than or equal to the seriesTotal.")
    });

    it("should revert if minting a Zap with a seriesTotal equal to 0", async () => {
      await expect(mintFunction(exampleIpfsHash, hexZeroPad(hexlify(0), 4), hexZeroPad(hexlify(0), 4))).to.revertedWith("Zap: Mint of a serialNumber greater than or equal to the seriesTotal.")
    });
  })
}

const shouldBehaveLikeZapMintWithoutApproval = (
  getZapContract: () => Zap,
  mintFunction: (ipfsHash: BytesLike, seriesTotal: BytesLike, serialNumber: BytesLike) => PromiseLike<ContractTransaction>,
  getZapperAddress: () => PromiseLike<BytesLike>,
) => {
    let ZapContract
    let zapper
    let zapId

  beforeEach(async () => {
    ZapContract = getZapContract()
    zapper = await getZapperAddress()
    zapId = HashUtils.eip712HashZapData(
      name,
      version,
      chainId,
      ZapContract.address,
      exampleIpfsHash,
      zapper,
      exampleSeriesTotal,
      exampleSerialNumber,
    )
  })

  describe("zap mint without approval", () => {
    it("should mint the Zap without approving any addresses", async () => {
      await expect(mintFunction(exampleIpfsHash, exampleSeriesTotal, exampleSerialNumber))
        .to.not.emit(ZapContract, "Approval")
      expect(await ZapContract.getApproved(zapId)).to.equal(hexZeroPad(hexlify(0), 20))
    })
  })
}

describe("Zap", () => {
  let contractOwner: SignerWithAddress
  let account2: SignerWithAddress
  let account3: SignerWithAddress

  let ZapContract: Zap

  before(async () => {
    [contractOwner, account2, account3] = await ethers.getSigners()
  })

  context('write functions', () => {
    beforeEach(async () => {
      ZapContract = await new Zap__factory(contractOwner).deploy(version)
    })

    describe("mintByOwnerForOwner", () => {
      const successfulMintByOwnerForOwner = (ipfsHash, seriesTotal, serialNumber) => {
        return ZapContract.mintByOwnerForOwner(
          ipfsHash,
          seriesTotal,
          serialNumber,
        )
      }
      shouldBehaveLikeSuccessfulZapMint(
        () => ZapContract,
        successfulMintByOwnerForOwner,
        () => contractOwner.getAddress(),
      )
      shouldBehaveLikeZapMintWithoutApproval(
        () => ZapContract,
        successfulMintByOwnerForOwner,
        () => contractOwner.getAddress()
      )

      it("reverts when called by an address other than the contract owner", async () => {
        const zapper = await account2.getAddress();
        expect(ZapContract.connect(zapper).mintByOwnerForOwner(
          exampleIpfsHash,
          exampleSeriesTotal,
          exampleSerialNumber,
        )).to.revertedWith("Ownable: caller is not the owner")
      })
    })

    describe("mintByOwner", () => {
      const successfulMintByOwner = async (ipfsHash, seriesTotal, serialNumber) => {
        const zapper = await account2.getAddress();
        return ZapContract.mintByOwner(
          ipfsHash,
          seriesTotal,
          serialNumber,
          zapper,
          await account2._signTypedData(
            { name, version, chainId, verifyingContract: ZapContract.address },
            {
              ZapMintIntent,
            },
            {
              mintIntent: MINT_INTENT_STATEMENT,
              ipfsHash,
              zapper: zapper,
              seriesTotal,
              serialNumber,
            },
          )
        );
      }
      shouldBehaveLikeSuccessfulZapMint(
        () => ZapContract,
        successfulMintByOwner,
        () => account2.getAddress(),
      )

      shouldBehaveLikeZapMintWithoutApproval(
        () => ZapContract,
        successfulMintByOwner,
        () => account2.getAddress()
      )

      it("reverts when called by an address other than the contract owner", async () => {
        const zapper = await account2.getAddress();
        const zapperSignature = await account2._signTypedData(
          { name, version, chainId, verifyingContract: ZapContract.address },
          {
            ZapMintIntent,
          },
          {
            mintIntent: MINT_INTENT_STATEMENT,
            ipfsHash: exampleIpfsHash,
            zapper,
            seriesTotal: exampleSeriesTotal,
            serialNumber: exampleSerialNumber,
          },
        );
        expect(ZapContract.connect(account2).mintByOwner(
          exampleIpfsHash,
          exampleSeriesTotal,
          exampleSerialNumber,
          zapper,
          zapperSignature
        )).to.revertedWith("Ownable: caller is not the owner");
      })

      it("reverts when the zapperSignatureData does not match the claimedZapper", async () => {
        const claimedZapper = await account2.getAddress();
        const fraudulentZapperSignature = await account3._signTypedData(
          { name, version, chainId, verifyingContract: ZapContract.address },
          {
            ZapMintIntent,
          },
          {
            mintIntent: MINT_INTENT_STATEMENT,
            ipfsHash: exampleIpfsHash,
            zapper: claimedZapper,
            seriesTotal: exampleSeriesTotal,
            serialNumber: exampleSerialNumber,
          },
        );
        expect(ZapContract.mintByOwner(
          exampleIpfsHash,
          exampleSeriesTotal,
          exampleSerialNumber,
          claimedZapper,
          fraudulentZapperSignature
        )).to.revertedWith("Zap: Signature address must match claimedZapper.");
      })

      // TODO: Should have a test for every possible input param - can share these specs with other ZapMintIntent signature verifiers with a 'behave' block.
      it("reverts when the zapperSignatureData does not match the input params", async () => {
        const zapper = await account2.getAddress();
        const mismatchedSerialNumber = hexZeroPad(hexlify(0), 4)
        const mismatchedDataZapperSignature = await account2._signTypedData(
          { name, version, chainId, verifyingContract: ZapContract.address },
          {
            ZapMintIntent,
          },
          {
            mintIntent: MINT_INTENT_STATEMENT,
            ipfsHash: exampleIpfsHash,
            zapper,
            seriesTotal: exampleSeriesTotal,
            serialNumber: mismatchedSerialNumber,
          },
        );
        expect(ZapContract.mintByOwner(
          exampleIpfsHash,
          exampleSeriesTotal,
          exampleSerialNumber,
          zapper,
          mismatchedDataZapperSignature
        )).to.revertedWith("Zap: Signature address must match claimedZapper.");
      })
    })

    describe("mintByZapper", () => {
      const successfulMintByZapper = async (ipfsHash, seriesTotal, serialNumber) => {
        const zapper = await account2.getAddress();
        return ZapContract.connect(account2).mintByZapper(
          ipfsHash,
          seriesTotal,
          serialNumber,
          await contractOwner._signTypedData(
            { name, version, chainId, verifyingContract: ZapContract.address },
            {
              ZapMintIntent,
            },
            {
              mintIntent: MINT_INTENT_STATEMENT,
              ipfsHash,
              zapper: zapper,
              seriesTotal,
              serialNumber,
            },
          )
        );
      }
      shouldBehaveLikeSuccessfulZapMint(
        () => ZapContract,
        successfulMintByZapper,
        () => account2.getAddress(),
      )

      shouldBehaveLikeZapMintWithoutApproval(
        () => ZapContract,
        successfulMintByZapper,
        () => account2.getAddress()
      )

      it("reverts when the contractOwnerSignatureData does not match the contract owner", async () => {
        const zapper = await account2.getAddress();
        const fraudulentContractOwnerSignature = await account3._signTypedData(
          { name, version, chainId, verifyingContract: ZapContract.address },
          {
            ZapMintIntent,
          },
          {
            mintIntent: MINT_INTENT_STATEMENT,
            ipfsHash: exampleIpfsHash,
            zapper,
            seriesTotal: exampleSeriesTotal,
            serialNumber: exampleSerialNumber,
          },
        );
        expect(ZapContract.connect(account2).mintByZapper(
          exampleIpfsHash,
          exampleSeriesTotal,
          exampleSerialNumber,
          fraudulentContractOwnerSignature
        )).to.revertedWith("Zap: Signature address must match contract owner.");
      })

      // TODO: Should have a test for every possible input param - can share these specs with other ZapMintIntent signature verifiers with a 'behave' block.
      it("reverts when the contractOwnerSignatureData does not match the input params", async () => {
        const wrongZapper = await account3.getAddress();
        const contractOwnerSignatureOfOtherData = await contractOwner._signTypedData(
          { name, version, chainId, verifyingContract: ZapContract.address },
          {
            ZapMintIntent,
          },
          {
            mintIntent: MINT_INTENT_STATEMENT,
            ipfsHash: exampleIpfsHash,
            zapper: wrongZapper,
            seriesTotal: exampleSeriesTotal,
            serialNumber: exampleSerialNumber,
          },
        );
        expect(ZapContract.connect(account2).mintByZapper(
          exampleIpfsHash,
          exampleSeriesTotal,
          exampleSerialNumber,
          contractOwnerSignatureOfOtherData
        )).to.revertedWith("Zap: Signature address must match contract owner.");
      })
    })

    describe("mintBySignatures", () => {
      const successfulMintBySignatures = async (ipfsHash, seriesTotal, serialNumber) => {
        const zapper = await account2.getAddress();
        return ZapContract.connect(account2).mintBySignatures(
          ipfsHash,
          seriesTotal,
          serialNumber,
          zapper,
          await account2._signTypedData(
            { name, version, chainId, verifyingContract: ZapContract.address },
            {
              ZapMintIntent,
            },
            {
              mintIntent: MINT_INTENT_STATEMENT,
              ipfsHash,
              zapper,
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
              zapper,
              seriesTotal,
              serialNumber,
            },
          )
        );
      }
      shouldBehaveLikeSuccessfulZapMint(
        () => ZapContract,
        successfulMintBySignatures,
        () => account2.getAddress(),
      )

      shouldBehaveLikeZapMintWithoutApproval(
        () => ZapContract,
        successfulMintBySignatures,
        () => account2.getAddress()
      )

      // TODO: Should have a test for every possible input param - can share these specs with other ZapMintIntent signature verifiers with a 'behave' block.
      it("raises an error when the signature was not created by the contract owner", () => { })

      it("raises an error when the signature was not created by the zapper", () => { })
    })
  })

  // At the moment, VIEW/PURE FUNCTIONS can share the same contract deployment.
  context("view/pure functions", () => {
    before(async () => {
      ZapContract = await new Zap__factory(contractOwner).deploy(version)
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
      it("should match the ipfs url of the given ipfs hash", () => { })
    })

    describe("eip712HashZapMintIntent", () => {
      let eip712HashZapMintIntentString: BytesLike

      beforeEach(() => {
        eip712HashZapMintIntentString = hexlify(HashUtils.eip712HashZapMintIntent(
          name,
          version,
          chainId,
          ZapContract.address,
          exampleIpfsHash,
          exampleZapper,
          exampleSeriesTotal,
          exampleSerialNumber,
        ))
      })

      it("should produce the _hashTypedDataV4 hash of the keccak256 hash of an inputted ZapMintIntent struct", async () => {
        expect(eip712HashZapMintIntentString).to.equal(
          await ZapContract.eip712HashZapMintIntent(examplePublication, exampleSerialNumber),
        )
      })

      // Not a huge fan of the following specs since arguably they're testing whether keccak256 is behaving as expected.
      // That being said, I see these as assertions of which properties should be inputs to our hash function, despite being redundant
      // with the main spec.
      it("should vary when contractAddress differs", async () => {
        const otherZapContract: Zap = await new Zap__factory(
          contractOwner,
        ).deploy(version)
        expect(eip712HashZapMintIntentString).to.not.equal(
          await otherZapContract.eip712HashZapMintIntent(
            examplePublication,
            exampleSerialNumber,
          ),
        )
      })

      it("should vary when ipfsHash differs", async () => {
        const otherIpfsHash =
          "0x90019001900190019001900190abcdef0123456789abcdef0123456789abcdef"
        const differentIpfsHashPublication = {
          ipfsHash: otherIpfsHash,
          zapper: exampleZapper,
          seriesTotal: exampleSeriesTotal,
        }
        expect(eip712HashZapMintIntentString).to.not.equal(
          await ZapContract.eip712HashZapMintIntent(
            differentIpfsHashPublication,
            exampleSerialNumber,
          ),
        )
      })

      it("should vary when zapper differs", async () => {
        const otherZapper = "0xd00dd00dd00dd00dd00dd00dd00dd00dd00dd00d"
        const differentZapperPublication = { ipfsHash: exampleIpfsHash, zapper: otherZapper, seriesTotal: exampleSeriesTotal }
        expect(eip712HashZapMintIntentString).to.not.equal(
          await ZapContract.eip712HashZapMintIntent(differentZapperPublication, exampleSerialNumber),
        )
      })


      it("should vary when seriesTotal differs", async () => {
        const otherSeriesTotal = "0x0000000f"
        const differentSeriesTotalPublication = { ipfsHash: exampleIpfsHash, zapper: exampleZapper, seriesTotal: otherSeriesTotal }
        expect(eip712HashZapMintIntentString).to.not.equal(
          await ZapContract.eip712HashZapData(differentSeriesTotalPublication, exampleSerialNumber),
        )
      })

      it("should vary when serialNumber differs", async () => {
        const otherSerialNumber = "0x0000000f"
        expect(eip712HashZapMintIntentString).to.not.equal(
          await ZapContract.eip712HashZapData(examplePublication, otherSerialNumber),
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
          exampleIpfsHash,
          exampleZapper,
          exampleSeriesTotal,
          exampleSerialNumber,
        ))
      })

      it("should produce the _hashTypedDataV4 hash of the keccak256 hash of an inputted ZapData struct", async () => {
        expect(eip712HashZapDataString).to.equal(
          await ZapContract.eip712HashZapData(examplePublication, exampleSerialNumber),
        )
      })

      // Not a huge fan of the following specs since arguably they're testing whether keccak256 is behaving as expected.
      // That being said, I see these as assertions of which properties should be inputs to our hash function, despite being redundant
      // with the main spec.
      it("should vary when contractAddress differs", async () => {
        const otherZapContract: Zap = await new Zap__factory(
          contractOwner,
        ).deploy(version)
        expect(eip712HashZapDataString).to.not.equal(
          await otherZapContract.eip712HashZapData(
            examplePublication,
            exampleSerialNumber,
          ),
        )
      })

      it("should vary when ipfsHash differs", async () => {
        const otherIpfsHash =
          "0x90019001900190019001900190abcdef0123456789abcdef0123456789abcdef"
        const differentIpfsHashPublication = {
          ipfsHash: otherIpfsHash,
          zapper: exampleZapper,
          seriesTotal: exampleSeriesTotal,
        }
        expect(eip712HashZapDataString).to.not.equal(
          await ZapContract.eip712HashZapData(
            differentIpfsHashPublication,
            exampleSerialNumber,
          ),
        )
      })

      it("should vary when zapper differs", async () => {
        const otherZapper = "0xd00dd00dd00dd00dd00dd00dd00dd00dd00dd00d"
        const differentZapperPublication = { ipfsHash: exampleIpfsHash, zapper: otherZapper, seriesTotal: exampleSeriesTotal }
        expect(eip712HashZapDataString).to.not.equal(
          await ZapContract.eip712HashZapData(differentZapperPublication, exampleSerialNumber),
        )
      })

      it("should vary when seriesTotal differs", async () => {
        const otherSeriesTotal = "0x0000000f"
        const differentSeriesTotalPublication = { ipfsHash: exampleIpfsHash, zapper: exampleZapper, seriesTotal: otherSeriesTotal }
        expect(eip712HashZapDataString).to.not.equal(
          await ZapContract.eip712HashZapData(differentSeriesTotalPublication, exampleSerialNumber),
        )
      })

      it("should vary when serialNumber differs", async () => {
        const otherSerialNumber = "0x0000000f"
        expect(eip712HashZapDataString).to.not.equal(
          await ZapContract.eip712HashZapData(examplePublication, otherSerialNumber),
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
          exampleIpfsHash,
          exampleZapper,
          exampleSeriesTotal,
        ))
      })

      it("should produce the _hashTypedDataV4 hash of the keccak256 hash of an inputted ZapData struct", async () => {
        expect(eip712HashSeriesPublicationString).to.equal(
          await ZapContract.eip712HashSeriesPublication(examplePublication),
        )
      })

      // Not a huge fan of the following specs since arguably they're testing whether keccak256 is behaving as expected.
      // That being said, I see these as assertions of which properties should be inputs to our hash function, despite being redundant
      // with the main spec.
      it("should vary when contractAddress differs", async () => {
        const otherZapContract: Zap = await new Zap__factory(
          contractOwner,
        ).deploy(version)
        expect(eip712HashSeriesPublicationString).to.not.equal(
          await otherZapContract.eip712HashSeriesPublication(
            examplePublication
          ),
        )
      })

      it("should vary when ipfsHash differs", async () => {
        const otherIpfsHash =
          "0x90019001900190019001900190abcdef0123456789abcdef0123456789abcdef"
        const differentIpfsHashPublication = {
          ipfsHash: otherIpfsHash,
          zapper: exampleZapper,
          seriesTotal: exampleSeriesTotal,
        }
        expect(eip712HashSeriesPublicationString).to.not.equal(
          await ZapContract.eip712HashSeriesPublication(
            differentIpfsHashPublication,
          ),
        )
      })

      it("should vary when zapper differs", async () => {
        const otherZapper = "0xd00dd00dd00dd00dd00dd00dd00dd00dd00dd00d"
        const differentZapperPublication = { ipfsHash: exampleIpfsHash, zapper: otherZapper, seriesTotal: exampleSeriesTotal }
        expect(eip712HashSeriesPublicationString).to.not.equal(
          await ZapContract.eip712HashSeriesPublication(differentZapperPublication),
        )
      })

      it("should vary when seriesTotal differs", async () => {
        const otherSeriesTotal = "0x0000000f"
        const differentSeriesTotalPublication = { ipfsHash: exampleIpfsHash, zapper: exampleZapper, seriesTotal: otherSeriesTotal }
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
          exampleIpfsHash,
          exampleZapper,
        ))
      })


      it("should produce the _hashTypedDataV4 hash of the keccak256 hash of an inputted SeriesFingerprint struct", async () => {
        expect(eip712HashSeriesFingerprintString).to.equal(
          await ZapContract.eip712HashSeriesFingerprint(exampleSeriesFingerprint),
        )
      })

      // Not a huge fan of the following specs since arguably they're testing whether keccak256 is behaving as expected.
      // That being said, I see these as assertions of which properties should be inputs to our hash function, despite being redundant
      // with the main spec.
      it("should vary when contractAddress differs", async () => {
        const otherZapContract: Zap = await new Zap__factory(
          contractOwner,
        ).deploy(version)
        expect(eip712HashSeriesFingerprintString).to.not.equal(
          await otherZapContract.eip712HashSeriesFingerprint(
            exampleSeriesFingerprint,
          ),
        )
      })

      it("should vary when ipfsHash differs", async () => {
        const otherIpfsHash =
          "0x90019001900190019001900190abcdef0123456789abcdef0123456789abcdef"
        const differentIpfsHashSeriesFingerprint = {
          ipfsHash: otherIpfsHash,
          zapper: exampleZapper,
        }
        expect(eip712HashSeriesFingerprintString).to.not.equal(
          await ZapContract.eip712HashSeriesFingerprint(
            differentIpfsHashSeriesFingerprint,
          ),
        )
      })

      it("should vary when zapper differs", async () => {
        const otherZapper = "0xd00dd00dd00dd00dd00dd00dd00dd00dd00dd00d"
        const differentZapperSeriesFingerprint = { ipfsHash: exampleIpfsHash, zapper: otherZapper }
        expect(eip712HashSeriesFingerprintString).to.not.equal(
          await ZapContract.eip712HashSeriesFingerprint(differentZapperSeriesFingerprint),
        )
      })

      it("should vary when chainid differs", () => { })
    })
  });
})
