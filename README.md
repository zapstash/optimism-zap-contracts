# l1-zap-contracts
Zap Ethereum L1 solidity contracts.

# Setup
## Fill out ENV variables
Generate a random ETH private key for Rinkeby (obviously not secure enough for mainnet accounts): https://asecuritysite.com/encryption/ethadd

## Install Yarn
`npm install --global yarn`

## Install NPM dependencies via yarn
`yarn install`

# Testing
`yarn test`

# Deploy
TODO: Make these npm commands (nice to have)
## Local network
`npx hardhat run --network localhost scripts/deploy.js`

## Kovan Optimism
`npx hardhat run --network kovanOptimism scripts/deploy.js`
