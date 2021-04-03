import { task } from "hardhat/config"
import { HardhatUserConfig } from "hardhat/types"

import "@nomiclabs/hardhat-waffle"
import "@typechain/hardhat"

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
})

const config: HardhatUserConfig = {
  solidity: "0.8.3",
  // TODO: Bring in Rinkeby deploy config via ENV variables.
  // networks: {
  //   rinkeby: {
  //     url: `https://eth-ropsten.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
  //     accounts: [`0x${RINKEBY_PRIVATE_KEY}`]
  //   }
  // },
  typechain: {
    outDir: "build/types",
    target: "ethers-v5",
  },
}

export default config
