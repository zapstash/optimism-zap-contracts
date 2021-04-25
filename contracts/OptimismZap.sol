pragma solidity 0.7.6;
pragma abicoder v2;

import "openzeppelin-contracts/contracts/access/Ownable.sol";
import "openzeppelin-contracts/contracts/cryptography/ECDSA.sol";
import "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import "openzeppelin-contracts/contracts/drafts/EIP712.sol";

/**
 * Ideas
 * - ERC721 compatible NFT contract.
 * - Small contract -> Easy to read, less attack surface, cheaper to deploy.
 * - Expose extra write functionality on top of ERC721 for minting only.
 */

contract OptimismZap is ERC721, EIP712, Ownable {
    using ECDSA for bytes32;

    /**
     * @dev Emitted when a ZapSeries is published.
     */
    event Publish(bytes32 ipfsHash, address zapper, bytes4 seriesTotal);

    /**
     * @dev Emitted when a Zap is minted.
     */
    event Mint(bytes32 ipfsHash, address zapper, bytes4 seriesTotal, bytes4 numInSeries);

    /**
     * @notice The unique data in a Zap Series.
     *         A SeriesFingerprint can only be published once - cementing the series total.
     */
    struct SeriesFingerprint {
        bytes32 ipfsHash;
        address zapper;
    }

    /**
     * @notice A publication of a Zap Series - a unique combination of an IPFS Hash, a Zapper and a limited quantity for the series.
     */
    struct SeriesPublication {
        bytes32 ipfsHash;
        address zapper;
        bytes4 seriesTotal;
    }

    /**
     * @notice A Zap is comprised of the Zap Series it belongs to and its serial number in that series.
     */
    struct ZapData {
        bytes32 ipfsHash;
        address zapper;
        bytes4 seriesTotal;
        bytes4 serialNumber;
    }

    /**
     * @notice ZapData along with a string representing the user's intent to mint.
     */
    struct ZapMintIntent {
        string mintIntent;
        bytes32 ipfsHash;
        address zapper;
        bytes4 seriesTotal;
        bytes4 serialNumber;
    }

    // Maping of eip712HashSeriesFingerprint(SeriesFingerPrint) -> SeriesPublication
    mapping(bytes32 => SeriesPublication) public seriesPublications;

    string public constant SERIES_FINGERPRINT_TYPE = "SeriesFingerprint(bytes32 ipfsHash,address zapper)";
    bytes32 public constant SERIES_FINGERPRINT_TYPE_HASH = keccak256(bytes(SERIES_FINGERPRINT_TYPE));

    string public constant SERIES_PUBLICATION_TYPE = "SeriesPublication(bytes32 ipfsHash,address zapper,bytes4 seriesTotal)";
    bytes32 public constant SERIES_PUBLICATION_TYPE_HASH = keccak256(bytes(SERIES_PUBLICATION_TYPE));

    string public constant ZAP_DATA_TYPE = "ZapData(bytes32 ipfsHash,address zapper,bytes4 seriesTotal,bytes4 serialNumber)";
    bytes32 public constant ZAP_DATA_TYPE_HASH = keccak256(bytes(ZAP_DATA_TYPE));

    string public constant ZAP_MINT_INTENT_TYPE = "ZapMintIntent(string mintIntent,bytes32 ipfsHash,address zapper,bytes4 seriesTotal,bytes4 serialNumber)";
    bytes32 public constant ZAP_MINT_INTENT_TYPE_HASH = keccak256(bytes(ZAP_MINT_INTENT_TYPE));

    string public constant MINT_INTENT_STATEMENT = "I intend to mint this Zap NFT.";
    bytes32 public constant MINT_INTENT_STATEMENT_HASH = keccak256(bytes(MINT_INTENT_STATEMENT));

    constructor(string memory version) ERC721("Zap", "ZAP") EIP712("Zap", version) { }

    /**
     * Contract owner mints an NFT for themself (they are the zapper)
     *  - Implicitly authenticate the Zapper/contract owner via msg.sender
     * @param ipfsHash     An IPFS hash of the content to be minted.
     * @param seriesTotal  The total number of NFT's in this series.
     * @param serialNumber The number of this NFT in the series
     */
    function mintByOwnerForOwner(bytes32 ipfsHash, bytes4 seriesTotal, bytes4 serialNumber) external onlyOwner {
        _mint(SeriesPublication(ipfsHash, owner(), seriesTotal), serialNumber);
    }

    /**
     * Contract owner mints an NFT to the zapper.
     *  - Authenticate the Zapper via signature.
     *  - Implicitly authenticate the contract owner auth via msg sender.
     * @param ipfsHash   A hash of the content to be minted.
     * @param seriesTotal  The total number of NFT's in this series.
     * @param serialNumber The number of this NFT in the series
     * @param claimedZapper The claimed zapper - must match the address recovered from the signature.
     * @param zapperSignatureData The signature of the zapper.

     */
    function mintByOwner(bytes32 ipfsHash, bytes4 seriesTotal, bytes4 serialNumber, address claimedZapper, bytes calldata zapperSignatureData)
        external
        onlyOwner
    {
        SeriesPublication memory publication = SeriesPublication(ipfsHash, claimedZapper, seriesTotal);
        bytes32 digest = eip712HashZapMintIntent(publication, serialNumber);
        require(digest.recover(zapperSignatureData) == claimedZapper, "Zap: Signature address must match claimedZapper.");
        _mint(publication, serialNumber);
    }

    /**
     * Zapper mints an NFT for themself.
     *  - Implicitly authenticate the Zapper via msg sender
     *  - Authenticate the contract owner via signature.
     * @param ipfsHash   A hash of the content to be minted.
     * @param contractOwnerSignatureData The signature of the contract owner.
     */
    function mintByZapper(
        bytes32 ipfsHash,
        bytes4 seriesTotal,
        bytes4 serialNumber,
        bytes calldata contractOwnerSignatureData
    ) external {
        SeriesPublication memory publication = SeriesPublication(ipfsHash, msg.sender, seriesTotal);
        bytes32 digest = eip712HashZapMintIntent(publication, serialNumber);
        require(digest.recover(contractOwnerSignatureData) == owner(), "Zap: Signature address must match contract owner.");
        _mint(publication, serialNumber);
    }

    /**
     * Anyone mints an NFT to the zapper.
     *  - Authenticate the Zapper via signature.
     *  - Authenticate the contract owner via signature.
     * @param ipfsHash   A hash of the content to be minted.
     * @param seriesTotal  The total number of NFT's in this series.
     * @param serialNumber The number of this NFT in the series
     * @param claimedZapper The claimed zapper - must match the address recovered from the signature.
     * @param zapperSignatureData The signature of the zapper.
     * @param contractOwnerSignatureData The signature of the contract owner.
     */
    function mintBySignatures(
        bytes32 ipfsHash,
        bytes4 seriesTotal,
        bytes4 serialNumber,
        address claimedZapper,
        bytes calldata zapperSignatureData,
        bytes calldata contractOwnerSignatureData
    ) external {
        SeriesPublication memory publication = SeriesPublication(ipfsHash, claimedZapper, seriesTotal);
        bytes32 digest = eip712HashZapMintIntent(publication, serialNumber);
        require(digest.recover(zapperSignatureData) == claimedZapper, "OptimismZap: Signature address does not match claimedZapper.");
        require(digest.recover(contractOwnerSignatureData) == owner(), "OptimismZap: Signature address does not match contract owner.");
        _mint(publication, serialNumber);
    }

    /**
     * Mint an NFT to the zapper.
     * The id of the NFT matches the ZapHash for the zap publication and the serial number.
     * @param publication  The SeriesPublication attached to the NFT to mint.
     * @param serialNumber The serial number of the Zap.
     */
    function _mint(SeriesPublication memory publication, bytes4 serialNumber) private {
        // Implied by the requirement that (serialNumber < publication.seriesTotal && seriesTotal  >=0).
        // require(publication.seriesTotal > 0, "OptimismZap: seriesTotal must be greater than 0.");
        bytes32 seriesFingerprint = eip712HashSeriesFingerprint(SeriesFingerprint(publication.ipfsHash, publication.zapper));
        SeriesPublication storage existingZapPublication = seriesPublications[seriesFingerprint];
        // Jank, but it seems like this is the only way to check for the existence of a struct in a mapping in solidity.
        if(existingZapPublication.seriesTotal == 0) {
            seriesPublications[seriesFingerprint] = publication;
            emit Publish(publication.ipfsHash, publication.zapper, publication.seriesTotal);
        } else {
            // Existing SeriesPublication, make sure it matches.
            require(existingZapPublication.seriesTotal == publication.seriesTotal, "OptimismZap: Different seriesTotal than previously published");
        }

        require(serialNumber < publication.seriesTotal, "OptimismZap: Mint of a serialNumber greater than or equal to the seriesTotal.");
        uint256 tokenId = uint256(eip712HashZapData(publication, serialNumber));
        _mint(publication.zapper, tokenId);
        emit Mint(publication.ipfsHash, publication.zapper, publication.seriesTotal, serialNumber);
    }

    /**
     * @param publication  The SeriesPublication of the ZapMintIntent.
     * @param serialNumber  The serialNumber of the ZapMintIntent
     * @return An EIP712 hash of a ZapMintIntent struct constructed from the input parameters.
     */
    function eip712HashZapMintIntent(SeriesPublication memory publication, bytes4 serialNumber)
        public
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ZAP_MINT_INTENT_TYPE_HASH,
                    MINT_INTENT_STATEMENT_HASH,
                    publication,
                    serialNumber
                )
            )
        );
    }

    /**
     * @param publication  The SeriesPublication of the ZapData.
     * @param serialNumber  The serialNumber of the ZapData
     * @return An EIP712 hash of a ZapData struct constructed from the input parameters.
     */
    function eip712HashZapData(SeriesPublication memory publication, bytes4 serialNumber)
        public
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ZAP_DATA_TYPE_HASH,
                    publication,
                    serialNumber
                )
            )
        );
    }

    /**
     * @param publication  The SeriesPublication of a Zap Series.
     * @return An EIP712 hash of a SeriesPublication struct.
     */
    function eip712HashSeriesPublication(SeriesPublication memory publication)
        public
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    SERIES_PUBLICATION_TYPE_HASH,
                    publication
                )
            )
        );
    }

    /**
     * @param fingerprint  The SeriesFingerprint of a Zap Series.
     * @return An EIP712 hash of a SeriesFingerprint struct.
     */
    function eip712HashSeriesFingerprint(SeriesFingerprint memory fingerprint)
        public
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    SERIES_FINGERPRINT_TYPE_HASH,
                    fingerprint
                )
            )
        );
    }

    function baseURI() public pure override returns (string memory) {
        return "ipfs://";
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        //TODO: return Base58 encoded version of ipfsHash, see https://github.com/MrChico/verifyIPFS
        return baseURI(); // + Base58Encode(_tokenIPFSHashes[tokenId])
    }
}
