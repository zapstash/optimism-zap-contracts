// import { expect } from "./setup"
// import * as ethers from "ethers"
// import { keccak256 } from "ethers/lib/utils"
// import * as HashUtils from '../package-main/HashUtils';

// describe('zapUtil', () => {
//     describe('hashZapMintIntent', () => {
//         const ipfsHash: ethers.BytesLike = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
//         const zapper: ethers.BytesLike = "0x0123456789abcdef0123456789abcdef01234567"

//         it('should produce the keccak256 hash of an inputted ZapMintIntent struct', async () => {
//             const expectedHashOutput = keccak256(ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes32', 'bytes32', 'address'], [zapUtil.ZAP_MINT_INTENT_TYPE_HASH, zapUtil.MINT_INTENT_STATEMENT_HASH, ipfsHash, zapper]))
//             expect(expectedHashOutput).to.equal(HashUtils.eip712HashZapMintIntent(zapUtil.MINT_INTENT_STATEMENT, ipfsHash, zapper))
//         })
//     });
// });
