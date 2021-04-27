const { ethers } = require("hardhat");
const { Contract } = require("ethers")
const { OptimismZapInterface } = require("../artifacts-ovm/contracts/OptimismZap.sol/OptimismZap.json")

const { OptimismZap__factory, OptimismZap } = require("../lib/typechain")

const {
    hexlify,
    hexZeroPad,
} = require("ethers/lib/utils")

const name = "Zap"
const symbol = "ZAP"
const version = "0.1.0"
const chainId = 69

// Reusable example data.
const EXAMPLE_IPFS_HASH = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
const EXAMPLE_ZAPPER = "0x0123456789abcdef0123456789abcdef01234567"
const EXAMPLE_SERIAL_NUMBER = hexZeroPad(hexlify(42), 4)
const EXAMPLE_SERIES_TOTAL = hexZeroPad(hexlify(420), 4)

const MAX_GAS_LIMIT_OVERRIDE = { gasLimit: 8999999 }
const NO_GAS_PRICE_OVERRIDE = { gasPrice: 0 }
const OVM_TESTNET_OVERRIDES = { ...MAX_GAS_LIMIT_OVERRIDE, ...NO_GAS_PRICE_OVERRIDE }

const Addresses = require("../package-main/Addresses").default

const testDeploy = async () => {
    // We get the contract to deploy
    const [account] = await ethers.getSigners();
    console.log("Testing contracts with the account:", account.address);
    const contract = OptimismZap__factory.connect(Addresses.kovanOptimism.OptimismZapContract, account)
    console.log("Optimism Zap contract deployed to:", contract.address);
    console.log("Minting test NFT")
    console.log(`JSON.stringify(OVM_TESTNET_OVERRIDES): ${JSON.stringify(OVM_TESTNET_OVERRIDES)}`)
    const tx = await contract.mintByOwnerForOwner(EXAMPLE_IPFS_HASH, EXAMPLE_SERIES_TOTAL, EXAMPLE_SERIAL_NUMBER, OVM_TESTNET_OVERRIDES)
    console.log(`Minted test NFT with JSON.stringify(tx): ${JSON.stringify(tx)}`)
}

testDeploy();
