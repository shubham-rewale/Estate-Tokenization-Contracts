//SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MaintenanceReserve is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    address rentalPropertiesContract;
    address propertyManager;
    address DAOContract;

    event MaintenanceReserveCapUpdated(
        uint256 propertyTokenId,
        uint256 newMaintenanceCapAmount
    );
    event FundsAddedToMaintenanceReserve(
        uint256 propertyTokenId,
        uint256 amountOfFundsAdded
    );

    // tokenId => maintenanceReserveCap
    mapping(uint256 => uint256) PropertyMaintenanceReserveCap;

    // tokenId => maintenanceReserve
    mapping(uint256 => uint256) PropertyMaintenanceReserves;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _propertyManager) external initializer {
        require(
            _propertyManager != address(0),
            "Provide Valid Property Manager Address"
        );
        __Ownable_init();
        __UUPSUpgradeable_init();
        propertyManager = _propertyManager;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    modifier onlypropertyManager() {
        require(
            msg.sender == propertyManager,
            "Caller is not the Property Manager"
        );
        _;
    }

    function setPropertyManagerAddress(address _propertyManager)
        external
        onlyOwner
    {
        require(
            _propertyManager != address(0),
            "Provide Valid Property Manager Address"
        );
        propertyManager = _propertyManager;
    }

    function setRentalPropertiesContractAddr(address _rentalPropertiesContract)
        external
        onlypropertyManager
    {
        require(
            _rentalPropertiesContract != address(0),
            "Provide Valid Rental Contract Address"
        );
        rentalPropertiesContract = _rentalPropertiesContract;
    }

    function setDAOContractAddr(address _daoContract)
        external
        onlypropertyManager
    {
        require(
            _daoContract != address(0),
            "Provide Valid DAO Contract Address"
        );
        DAOContract = _daoContract;
    }
    
    function checkMaintenanceReserve(uint256 _tokenId)
        public
        view
        returns (
            uint256 _propertyMaintenanceReserveCap,
            uint256 _propertyMaintenanceReserve,
            uint256 _propertyMaintenanceReserveDeficit
        )
    {
        _propertyMaintenanceReserveCap = PropertyMaintenanceReserveCap[
            _tokenId
        ];
        _propertyMaintenanceReserve = PropertyMaintenanceReserves[_tokenId];
        _propertyMaintenanceReserveDeficit =
            _propertyMaintenanceReserveCap -
            _propertyMaintenanceReserve;
    }

    function setMaintenanceReserveCap(uint256 _tokenId, uint256 _capAmount)
        external
    {
        require(
            msg.sender == rentalPropertiesContract,
            "setMaintenanceReserveCap() can only be called through RentalProperties contract"
        );
        require(
            _capAmount >= PropertyMaintenanceReserves[_tokenId],
            "New Maintenance Reserve Cap should be greater than or equal to existing Reserve amount"
        );
        PropertyMaintenanceReserveCap[_tokenId] = _capAmount;
        emit MaintenanceReserveCapUpdated(_tokenId, _capAmount);
    }


    function restoreMaintenanceReserve(uint256 _tokenId) external payable {
        require(
            PropertyMaintenanceReserves[_tokenId] <
                PropertyMaintenanceReserveCap[_tokenId],
            "Maintenance Reserve for this Property already have enough Funds"
        );
        require(
            msg.value <=
                PropertyMaintenanceReserveCap[_tokenId] -
                    PropertyMaintenanceReserves[_tokenId],
            "Amount is more than the deficit in the maintenance reserve"
        );
        PropertyMaintenanceReserves[_tokenId] += msg.value;
        assert(
            PropertyMaintenanceReserveCap[_tokenId] >=
                PropertyMaintenanceReserves[_tokenId]
        );
        emit FundsAddedToMaintenanceReserve(_tokenId, msg.value);
    }

    function withdrawFromMaintenanceReserve(
        uint256 _tokenId,
        uint256 _amountToWithdraw,
        address payable _recepientAddr
    ) external {
        require(
            msg.sender == DAOContract,
            "Withdraw function can only be called through DAO contract"
        );
        require(_recepientAddr != address(0), "Invalid Recepient Address");
        require(
            _amountToWithdraw <= PropertyMaintenanceReserves[_tokenId],
            "Not enough funds in the maintenance reserve"
        );
        PropertyMaintenanceReserves[_tokenId] -= _amountToWithdraw;
        _recepientAddr.transfer(_amountToWithdraw);
    }

    fallback() external payable {
        revert(
            "Can't Accept Funds Other than restoreMaintenanceReserve Fucntion call"
        );
    }

    receive() external payable {
        revert(
            "Can't Accept Funds Other than restoreMaintenanceReserve Fucntion call"
        );
    }
}
