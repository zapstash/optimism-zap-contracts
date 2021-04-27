import "@eth-optimism/plugins/hardhat/compiler"
import "@eth-optimism/plugins/hardhat/ethers"
import "@eth-optimism/hardhat-ovm"

import { task } from "hardhat/config"
import { HardhatUserConfig } from "hardhat/types"

import "@nomiclabs/hardhat-waffle"
import "@typechain/hardhat"

import dotenv from "dotenv"
dotenv.config();

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
})

const config: HardhatUserConfig = {
  solidity: "0.7.6",
  networks: {
    kovanOptimism: {
      ovm: true,
      url: `https://kovan.optimism.io`,
      accounts: [`0x${process.env.TESTNET_CONTRACT_DEPLOYMENT_PRIVATE_KEY}`],
    },
    localOptimism: {
      ovm: true,
      url: "http://127.0.0.1:8545",
      gasPrice: 0,
      accounts: [
        `0x6f8f484d6f681a0fd1e80953a5087905880397a041916f7d028901e0aeda640e`,
        `0xbda0a1c3a3143628c514953919291b44404aa91952aa5b5e135c5345ef7375f9`,
        `0x99b621253a3e9737e0a4708a391f4fcdb1a0a9fe804afd520b0b2b8cb43c546a`,
        `0x54f5dbfb10ae2a20eb47db3bcc950f633c65a5d2a13b394e81fc14d3970f1a27`,
      ],
    },
    // localOptimism: {
    //   ovm: true,
    //   url: 'http://127.0.0.1:8545',
    //   gasPrice: 0,
    //   accounts: [
    //     `0x6f8f484d6f681a0fd1e80953a5087905880397a041916f7d028901e0aeda640e`,
    //     `0xbda0a1c3a3143628c514953919291b44404aa91952aa5b5e135c5345ef7375f9`,
    //     `0x99b621253a3e9737e0a4708a391f4fcdb1a0a9fe804afd520b0b2b8cb43c546a`,
    //     `0x54f5dbfb10ae2a20eb47db3bcc950f633c65a5d2a13b394e81fc14d3970f1a27`,
    //   ]
    // },
  },
  ovm: {
    solcVersion: "0.7.6",
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
}

export default config
