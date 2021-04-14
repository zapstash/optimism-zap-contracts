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
  solidity: "0.8.3",
  networks: {
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [`0x${process.env.RINKEBY_PRIVATE_KEY}`]
    }
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
}

export default config
