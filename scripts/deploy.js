const { OptimismZap__factory } = require("../typechain");

const VERSION = process.env.npm_package_version;

const deploy = async () => {
  // We get the contract to deploy
  const [deployer] = await ethers.getSigners();

  console.log(
    "Deploying contracts with the account:",
    deployer.address
  );
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const MAX_GAS_LIMIT_OVERRIDE = { gasLimit: 8999999, gasPrice: 0 }
  const zapContract = await new OptimismZap__factory(deployer).deploy(VERSION, MAX_GAS_LIMIT_OVERRIDE);
  console.log("Optimism Zap contract deployed to:", zapContract.address);
}

deploy()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
