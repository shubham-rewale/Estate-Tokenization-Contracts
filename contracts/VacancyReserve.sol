//SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract VacancyReserve is Initializable, OwnableUpgradeable {
    address rentalPropertiesContract;
    address propertyManager;
    address DAOContract;

    // tokenId => vacancyReserveCap
    mapping(uint256 => uint256) PropertyVacancyReserveCap;

    // tokenId => vacancyReserve
    mapping(uint256 => uint256) PropertyVacancyReserves;

    event VacancyReserveCapUpdated(
        uint256 propertyTokenId,
        uint256 newVacancyCapAmount
    );
    event FundsAddedToVacancyReserve(
        uint256 propertyTokenId,
        uint256 amountOfFundsAdded
    );

    function initialize(address _propertyManager) external initializer {
        require(
            _propertyManager != address(0),
            "Provide Valid Property Manager Address"
        );
        __Ownable_init();
        propertyManager = _propertyManager;
    }

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

    function setVacancyReserveCap(uint256 _tokenId, uint256 _capAmount)
        external
    {
        require(
            msg.sender == rentalPropertiesContract,
            "setVacancyReserveCap() can only be called through RentalProperties contract"
        );
        require(
            _capAmount >= PropertyVacancyReserves[_tokenId],
            "New Vacancy Reserve Cap should be greater than or equal to existing Reserve amount"
        );
        PropertyVacancyReserveCap[_tokenId] = _capAmount;
        emit VacancyReserveCapUpdated(_tokenId, _capAmount);
    }

    function checkVacancyReserve(uint256 _tokenId)
        public
        view
        returns (
            uint256 _propertyVacancyReserveCap,
            uint256 _propertyVacancyReserve,
            uint256 _propertyVacancyReserveDeficit
        )
    {
        _propertyVacancyReserveCap = PropertyVacancyReserveCap[_tokenId];
        _propertyVacancyReserve = PropertyVacancyReserves[_tokenId];
        _propertyVacancyReserveDeficit =
            _propertyVacancyReserveCap -
            _propertyVacancyReserve;
    }

    function restoreVacancyReserve(uint256 _tokenId) external payable {
        require(
            PropertyVacancyReserves[_tokenId] <
                PropertyVacancyReserveCap[_tokenId],
            "Vacancy Reserve for this Property already have enough Funds"
        );
        require(
            msg.value <=
                PropertyVacancyReserveCap[_tokenId] -
                    PropertyVacancyReserves[_tokenId],
            "Amount is more than the deficit in the Vacancy reserve"
        );
        PropertyVacancyReserves[_tokenId] += msg.value;
        assert(
            PropertyVacancyReserveCap[_tokenId] <=
                PropertyVacancyReserves[_tokenId]
        );
        emit FundsAddedToVacancyReserve(_tokenId, msg.value);
    }

    function withdrawFromVacancyReserve(
        uint256 _tokenId,
        uint256 _amountToWithdraw,
        address payable _recepientAddr
    ) external {
        require(
            msg.sender == DAOContract,
            "Withdraw function can only be called by DAO contract"
        );
        require(_recepientAddr != address(0), "Invalid Recepient Address");
        require(
            _amountToWithdraw <= PropertyVacancyReserves[_tokenId],
            "Not enough funds in the Vacancy reserve"
        );
        PropertyVacancyReserves[_tokenId] -= _amountToWithdraw;
        _recepientAddr.transfer(_amountToWithdraw);
    }

    fallback() external payable {
        revert(
            "Can't Accept Funds Other than restoreVacancyReserve Fucntion call"
        );
    }

    receive() external payable {
        revert(
            "Can't Accept Funds Other than restoreVacancyReserve Fucntion call"
        );
    }
}
