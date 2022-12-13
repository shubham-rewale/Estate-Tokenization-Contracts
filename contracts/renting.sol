//SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.9;

/// @title Marketplace Contract
/// @author Vibhav Sharma
/// @notice Smart Contract enables Mogul Property Tokens to be listed on Marketplace for trade

import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import "./maintenancereserve.sol";
import "./vacancyreserve.sol";
// import "./IMOGTOKEN.sol";

contract rentMarketplace is
    Initializable,
    OwnableUpgradeable,
    ERC1155HolderUpgradeable,
    ReentrancyGuardUpgradeable
{
    MaintenanceReserve public _MaintenanceReserve;
    VacancyReserve public _VacancyReserve;
    IMOGTokenUpgradeable public _token;
    // using CountersUpgradeable for CountersUpgradeable.Counter;
    // CountersUpgradeable.Counter private _listingIds;
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

    enum propertyRentStatus {
        occupied,
        vacant
    }

    mapping(uint256 => PropertyDetailsForRenting) public idToProperty;

    struct PropertyDetailsForRenting {
        uint256 propertyTokenId;
        uint256 PropertyMaintenanceReserveCap;
        uint256 PropertyVacancyReserveCap;
        uint256 monthlyRentAmount;
        propertyRentStatus status;
        bool listed;
        address user;
    }

    function initialize(
        address payable _vacancyReserveAddress,
        address payable _maintainanceReserveAddress,
        address _tokenAddress
    ) external initializer {
        require(_vacancyReserveAddress != address(0), "Cannot be zero address");
        require(
            _maintainanceReserveAddress != address(0),
            "Cannot be zero address"
        );
        require(_tokenAddress != address(0), "Cannot be zero address");
        _MaintenanceReserve = MaintenanceReserve(_maintainanceReserveAddress);
        _VacancyReserve = VacancyReserve(_vacancyReserveAddress);
        _token = IMOGTokenUpgradeable(_tokenAddress);
        __Ownable_init();
    }

    function listPropertyforRenting(
        // bytes32[] memory proof,
        uint256 propertyTokenId,
        uint256 PropertyMaintenanceReserveCap,
        uint256 PropertyVacancyReserveCap,
        uint256 monthlyRentAmount
    ) external nonReentrant {
        // require(
        //     isWhitelisted(proof, keccak256(abi.encodePacked(_msgSender()))),
        //     "listPropertyforRenting: Address not whitelisted"
        // );
        require(monthlyRentAmount > 0, "list : Amount must be greater than 0!");
        require(
            PropertyMaintenanceReserveCap > 0,
            "list : PropertyMaintenanceReserveCap must be greater than 0!"
        );
        require(
            PropertyVacancyReserveCap > 0,
            "list : PropertyVacancyReserveCap must be greater than 0!"
        );
        _MaintenanceReserve.setMaintenanceReserveCap(
            propertyTokenId,
            PropertyMaintenanceReserveCap
        );
        _VacancyReserve.setVacancyReserveCap(
            propertyTokenId,
            PropertyVacancyReserveCap
        );
        idToProperty[propertyTokenId] = PropertyDetailsForRenting(
            propertyTokenId,
            PropertyMaintenanceReserveCap,
            PropertyVacancyReserveCap,
            monthlyRentAmount,
            propertyRentStatus.vacant,
            true,
            address(0)
        );
    }

    function restoreReserves(
        // bytes32[] memory proof,
        uint256 propertyTokenId
    ) public payable nonReentrant {
        // require(
        //     isWhitelisted(proof, keccak256(abi.encodePacked(_msgSender()))),
        //     "listPropertyforRenting: Address not whitelisted"
        // );
        uint256 maintenanceCap;
        uint256 maintenanceReserve;
        uint256 maintenaceDeficit;
        uint256 vacancyCap;
        uint256 vacancyReserve;
        uint256 vacancyDeficit;
        require(msg.value > 0, "list : Rent must be greater than 0!");
        require(
            idToProperty[propertyTokenId].listed == true,
            " Property is not listed!"
        );

        (
            maintenanceCap,
            maintenanceReserve,
            maintenaceDeficit
        ) = _MaintenanceReserve.checkMaintenanceReserve(propertyTokenId);
        (vacancyCap, vacancyReserve, vacancyDeficit) = _VacancyReserve
            .checkVacancyReserve(propertyTokenId);
        require(
            msg.value > (maintenaceDeficit + vacancyDeficit),
            "list : Rent must be greater than deficit value"
        );
        _MaintenanceReserve.restoreMaintenanceReserve{value: maintenaceDeficit}(
            propertyTokenId
        );
        _VacancyReserve.restoreVacancyReserve{value: vacancyDeficit}(
            propertyTokenId
        );
    }

    function propertyRentDistribution(
        bytes32[] memory proof,
        uint256 propertyTokenId,
        address[] memory ownerList
    ) public payable nonReentrant {
        require(
            isWhitelisted(proof, keccak256(abi.encodePacked(_msgSender()))),
            "listPropertyforRenting: Address not whitelisted"
        );
        restoreReserves(propertyTokenId);
    }

    function initiateRentalProcess(
        bytes32[] memory proof,
        address tenantAddress,
        uint256 propertyTokenId,
        address[] memory ownerList
    ) external payable nonReentrant {
        require(
            isWhitelisted(proof, keccak256(abi.encodePacked(_msgSender()))),
            "buy: Address not whitelisted"
        );
        require(
            idToProperty[propertyTokenId].listed == true,
            " Property is not listed!"
        );
        require(
            idToProperty[propertyTokenId].status == propertyRentStatus.vacant,
            " Property already oocpied!"
        );
        idToProperty[propertyTokenId].user = tenantAddress;
        idToProperty[propertyTokenId].status = propertyRentStatus.occupied;
        restoreReserves(propertyTokenId);
    }

    function viewPropertyById(uint256 propertyTokenId)
        external
        view
        returns (PropertyDetailsForRenting memory)
    {
        require(
            idToProperty[propertyTokenId].listed == true,
            " Property is not listed yet!"
        );

        return idToProperty[propertyTokenId];
    }

    function DelistPropertyforRenting(
        bytes32[] memory proof,
        uint256 propertyTokenId,
        address[] memory ownerList
    ) external nonReentrant {
        require(
            isWhitelisted(proof, keccak256(abi.encodePacked(_msgSender()))),
            "delist: Address not whitelisted"
        );
        require(
            idToProperty[propertyTokenId].listed == true,
            " Property is not listed yet!"
        );
        idToProperty[propertyTokenId].listed == false;
        for (uint256 i = 0; i < ownerList.length; i++) {
            _MaintenanceReserve.withdrawFromMaintenanceReserve(
                propertyTokenId,
                0,
                payable(ownerList[i])
            );
            _VacancyReserve.withdrawFromVacancyReserve(
                propertyTokenId,
                0,
                payable(ownerList[i])
            );
        }
        delete idToProperty[propertyTokenId];
    }

    /** 
        @notice function to override for BMT
    */
    function _msgSender() internal view virtual override returns (address) {
        return msg.sender;
    }
}
