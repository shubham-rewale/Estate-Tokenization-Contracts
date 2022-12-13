// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Marketplace Contract
/// @author Vibhav Sharma
/// @notice Smart Contract enables Mogul Property Tokens to be listed on Marketplace for trade

import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "contracts/helper/BasicMetaTransaction.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import "./interfaces/IMOGTOKEN.sol";

contract Marketplace is
    Initializable,
    OwnableUpgradeable,
    ERC1155HolderUpgradeable,
    ReentrancyGuardUpgradeable,
    BasicMetaTransaction
{
    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter private _listingIds;
    IMOGTokenUpgradeable public mogul;
    bytes32 public root;

    /**@dev Set the Merkleroot for the whitelisted address */
    function setRoot(bytes32 _root) external onlyOwner {
        root = _root;
    }

    /**@dev to check if address is whitelisted using Merkleproof */
    function isWhitelisted(bytes32[] memory proof, bytes32 leaf)
        public
        view
        returns (bool)
    {
        return MerkleProofUpgradeable.verify(proof, root, leaf);
    }

    event PropertyListed(
        address seller,
        uint256 tokenId,
        uint256 amount,
        uint256 pricePerToken,
        uint256 listingId
    );

    event PropertySold(
        address seller,
        address buyer,
        uint256 tokenId,
        uint256 amount,
        uint256 pricePerToken
    );

    event PropertyDelisted(uint256 tokenId, uint256 listingId, address seller);

    mapping(uint256 => List) private idToProperty;

    struct List {
        address seller;
        uint256 tokenId;
        uint256 amount;
        uint256 price;
        uint256 tokensAvailable;
        bool completed;
        uint256 listingId;
    }

    function initialize(address _mogulToken) external initializer {
        require(_mogulToken != address(0), "Cannot be zero address");
        mogul = IMOGTokenUpgradeable(_mogulToken);
        __Ownable_init();
    }

    /**
        * @notice list property on marketplace
        * @dev current implementation does not take decimal value for per token price
        * @param proof MerkleProof required to verify _msgSender() whitelisted?
        * @param tokenId Property tokenId inside Mogul Token Contract
        * @param amount Number of tokens available in wei for public listing
        * @param price per wei token price for the listed property
     */
    function listProperty(
        bytes32[] memory proof,
        uint256 tokenId,
        uint256 amount,
        uint256 price
    ) external nonReentrant {
        require(
            isWhitelisted(proof, keccak256(abi.encodePacked(_msgSender()))),
            "listProperty: Address not whitelisted"
        );
        require(amount > 0, "list : Amount must be greater than 0!");
        require(
            mogul.balanceOf(_msgSender(), tokenId) >= amount,
            "list: Caller must own given token!"
        );
        mogul.safeTransferFrom(
            _msgSender(),
            address(this),
            tokenId,
            amount,
            ""
        );
        _listingIds.increment();
        uint256 listingId = _listingIds.current();
        idToProperty[listingId] = List(
            _msgSender(),
            tokenId,
            amount,
            price,
            amount,
            false,
            _listingIds.current()
        );

        emit PropertyListed(
            _msgSender(),
            tokenId,
            amount,
            price,
            _listingIds.current()
        );
    }

    /**
        * @notice buy property on marketplace
        * @dev _listingId is the unique identifier because multiple listing can be there for same tokenId
        * @param proof MerkleProof required to verify _msgSender() whitelisted?
        * @param listingId Unique identity to every listing inside marketplace
        * @param amount Number of tokens _msgSender() wants to buy
     */
    function buyProperty(bytes32[] memory proof,uint256 listingId, uint256 amount)
        external
        payable
        nonReentrant
    {
        require(
            isWhitelisted(proof, keccak256(abi.encodePacked(_msgSender()))),
            "buy: Address not whitelisted"
        );
        require(
            _msgSender() != idToProperty[listingId].seller,
            "buy : Can't buy your own Property!"
        );
        require(
            msg.value >= (idToProperty[listingId].price * amount),
            "buy: Insufficient funds!"
        );
        require(
            mogul.balanceOf(address(this), idToProperty[listingId].tokenId) >=
                amount,
            "buy: Seller doesn't have enough property tokens!"
        );
        require(
            idToProperty[listingId].completed == false,
            "buy: Property not available anymore!"
        );

        idToProperty[listingId].tokensAvailable -= amount;

        if (idToProperty[listingId].tokensAvailable == 0) {
            idToProperty[listingId].completed = true;
        }

        emit PropertySold(
            idToProperty[listingId].seller,
            _msgSender(),
            idToProperty[listingId].tokenId,
            amount,
            idToProperty[listingId].price
        );

        mogul.safeTransferFrom(
            address(this),
            _msgSender(),
            idToProperty[listingId].tokenId,
            amount,
            ""
        );
        payable(idToProperty[listingId].seller).transfer(
            (idToProperty[listingId].price * amount)
        );
    }

    /**
        * @notice Delist property from marketplace
        * @dev instead of removing the listing entry completely the trade would be marked as complete
        * @param proof MerkleProof required to verify _msgSender() whitelisted?
        * @param _listingId Unique identity to every listing inside marketplace
     */
    function deListProperty(bytes32[] memory proof, uint256 _listingId) external nonReentrant {
        require(
            isWhitelisted(proof, keccak256(abi.encodePacked(_msgSender()))),
            "delist: Address not whitelisted"
        );
        require(
            _msgSender() == idToProperty[_listingId].seller,
            "delist: Not caller's listing!"
        );
        require(
            idToProperty[_listingId].completed == false,
            "delist: Property not available!"
        );

        idToProperty[_listingId].completed = true;

        emit PropertyDelisted(
            idToProperty[_listingId].tokenId,
            _listingId,
            _msgSender()
        );
        mogul.safeTransferFrom(
            address(this),
            _msgSender(),
            idToProperty[_listingId].tokenId,
            idToProperty[_listingId].amount,
            ""
        );
    }

    /**
        * @notice returns property trade details based on the listingId
        * @param _id here represents unique listingId
     */
    function viewPropertyById(uint256 _id) external view returns (List memory) {
        return idToProperty[_id];
    }

    /**
        @notice backend util function to fetch properties trade details in intervals
        @param strt starting listingId
        @param itemsPerPage total number of items needed from start
     */
    function viewPropertyByIntervals(uint256 strt, uint256 itemsPerPage)
        external
        view
        returns (List[] memory)
    {
        require(strt > 0, "view: Start element must be a +ve integer");
        uint256 end;
        uint256 totalItems = itemsPerPage;
        if (_listingIds.current() > strt + itemsPerPage - 1) {
            end = strt + itemsPerPage - 1;
        } else {
            end = _listingIds.current();
            totalItems = end - strt + 1;
        }
        require(
            totalItems < 100,
            "view: More than 100 items requested in one call!"
        );
        List[] memory properties = new List[](totalItems);
        uint256 j = 0;
        for (uint256 i = strt; i <= end; ) {
            properties[j++] = idToProperty[i];
            unchecked {
                ++i;
            }
        }
        return properties;
    }

    /**
        * @notice returns total number of listings inside marketplace
        * @dev backend can traverse from 1 --> listingIds to get each property trade details
     */
    function getTotalIds() external view returns (uint256) {
        return _listingIds.current();
    }

    /** 
        @notice function to override for BMT
    */
    function _msgSender() internal view virtual override returns (address) {
        return msgSender();
    }
}
