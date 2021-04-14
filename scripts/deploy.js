const { Zap__factory } = require("../build/types");

const VERSION = process.env.npm_package_version;

const deploy = async () => {
  // We get the contract to deploy
  const [deployer] = await ethers.getSigners();

  console.log(
    "Deploying contracts with the account:",
    deployer.address
  );
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const zapContract = await new Zap__factory(deployer).deploy(VERSION);
  console.log("Zap contract deployed to:", zapContract.address);
}

deploy()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
