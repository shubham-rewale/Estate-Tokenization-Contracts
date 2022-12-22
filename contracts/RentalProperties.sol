// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import "./Token.sol";
import "./MaintenanceReserve.sol";
import "./VacancyReserve.sol";

contract RentalProperties is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    address propertyManager;
    Token token;
    MaintenanceReserve maintenanceReserve;
    VacancyReserve vacancyReserve;

    struct rentalPropertyDetails {
        uint256 propertyTokenId;
        bool isOccupied;
        bool listed;
        uint256 rentalStartTimestamp;
        address tenant;
        uint256 propertyMaintenanceReserveCap;
        uint256 propertyVacancyReserveCap;
        uint256 currentRentalPeriodInDays;
        uint256 dailyRentAmountForThisRentalPeriod;
        uint256 rentCycleCounter;
    }

    event RentalPeriodInitiated(
        uint256 _rentalPropertyTokenId,
        address _tenantAddress,
        uint256 _rentalStartTimestamp,
        uint256 _rentPeriodInDays
    );
    //  event RentalPeriodInitiated(
    //     uint256 _rentalPropertyTokenId,
    //     address _tenantAddress,
    //     uint256 _rentPeriodInDays
    // );
    event RentalPeriodTerminated(
        uint256 _rentalPropertyTokenId,
        address terminatedTenant,
        uint256 terminationTimestamp,
        uint256 returnedRemainingDepositAmount
    );
    event RentDistributed(
        uint256 _rentalPropertyTokenId,
        address[] _tokenOwnerList,
        uint256[] _rentAmountPerOwner
    );
    // event rentIncomeWithdrwal(
    //     uint256 _rentalPropertyTokenId,
    //     address beneficiaryAddr,
    //     uint256 withdrawalAmount
    // );

    // tokenId => rentalPropertyDetails
    mapping(uint256 => rentalPropertyDetails) rentalPropertyList;

    // tokenId => totalRemaining Rent for the current rental period
    mapping(uint256 => uint256) propertyRentDeposits;

    // tokenId => invvestorAddress => balance
    // mapping(uint256 => mapping(address => uint256)) shareHoldersRentIncomeBalances;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _propertyTokenContract,
        address payable _maintenanceReserveContract,
        address payable _vacancyReserveContract,
        address _propertyManager
    ) external initializer {
        require(
            _propertyTokenContract != address(0),
            "Provide valid Property Token contract address"
        );
        require(
            _maintenanceReserveContract != address(0),
            "Provide valid Maintenance Reserve contract address"
        );
        require(
            _vacancyReserveContract != address(0),
            "Provide valid Vacancy Reserve contract address"
        );
        require(
            _propertyManager != address(0),
            "Provide valid Property Manager address"
        );
        __Ownable_init();
        __UUPSUpgradeable_init();
        token = Token(_propertyTokenContract);
        maintenanceReserve = MaintenanceReserve(_maintenanceReserveContract);
        vacancyReserve = VacancyReserve(_vacancyReserveContract);
        propertyManager = _propertyManager;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    modifier onlyPropertyManager() {
        require(
            msg.sender == propertyManager,
            "Caller is not the Property Manager"
        );
        _;
    }

    function setPropertyManagerAddr(address _propertyManager)
        external
        onlyOwner
    {
        require(
            _propertyManager != address(0),
            "Provide valid Property Manager address"
        );
        propertyManager = _propertyManager;
    }

    function getPropertyStatus(uint256 _propertyTokenId)
        external
        view
        returns (
            string memory _propertyStatus,
            address _tenant,
            uint256 _rentalPeriod,
            uint256 _noOfCompletedDays,
            uint256 _dailyRent
        )
    {
        rentalPropertyDetails memory propertyDetails = rentalPropertyList[
            _propertyTokenId
        ];
        require(propertyDetails.listed == true, "Property Details Not Found");
        if (propertyDetails.isOccupied == false) {
            _propertyStatus = "Property is currently vacant";
            _tenant = address(0);
            _rentalPeriod = 0;
            _noOfCompletedDays = 0;
            _dailyRent = 0;
        } else if (propertyDetails.isOccupied == true) {
            _propertyStatus = "Property is currently occupied";
            _tenant = propertyDetails.tenant;
            _rentalPeriod = propertyDetails.currentRentalPeriodInDays;
            _noOfCompletedDays = propertyDetails.rentCycleCounter;
            _dailyRent = propertyDetails.dailyRentAmountForThisRentalPeriod;
        }
    }

    function getPropertyRentDeposits(uint256 _propertyTokenId)
        external
        view
        returns (uint256 _propertyDeposits)
    {
        _propertyDeposits = propertyRentDeposits[_propertyTokenId];
    }

    // function getShareHoldersRentIncome(uint256 _propertyTokenId, address shareHolderAddr) view external returns( uint256 _incomeBalance){
    //     _incomeBalance = shareHoldersRentIncomeBalances[_propertyTokenId][shareHolderAddr];
    // }

    function enterRentalPropertyDetails(
        uint256 _propertyTokenId,
        uint256 _propertyMaintenanceReserveCap,
        uint256 _propertyVacancyReserveCap
    ) external onlyPropertyManager {
        require(
            token.exists(_propertyTokenId) == true,
            "Property with the given Token Id does not exist"
        );
        require(
            rentalPropertyList[_propertyTokenId].listed == false,
            "Property already registered for renting"
        );
        require(
            _propertyMaintenanceReserveCap != 0,
            "Property Maintenance Reserve should be more than zero"
        );
        require(
            _propertyVacancyReserveCap != 0,
            "Property Vacancy Reserve should be more than zero"
        );
        maintenanceReserve.setMaintenanceReserveCap(
            _propertyTokenId,
            _propertyMaintenanceReserveCap
        );
        vacancyReserve.setVacancyReserveCap(
            _propertyTokenId,
            _propertyMaintenanceReserveCap
        );
        rentalPropertyList[_propertyTokenId] = rentalPropertyDetails(
            _propertyTokenId,
            false,
            true,
            0,
            address(0),
            _propertyMaintenanceReserveCap,
            _propertyVacancyReserveCap,
            0,
            0,
            0
        );
    }

    function updateReserveCapAmount(
        uint256 _propertyTokenId,
        uint256 _newMaintenanceReserveCapAmount,
        uint256 _newVacancyReserveCapAmount
    ) external onlyPropertyManager {
        if (_newMaintenanceReserveCapAmount != 0) {
            rentalPropertyList[_propertyTokenId]
                .propertyMaintenanceReserveCap = _newMaintenanceReserveCapAmount;
            maintenanceReserve.setMaintenanceReserveCap(
                _propertyTokenId,
                _newMaintenanceReserveCapAmount
            );
        }
        if (_newVacancyReserveCapAmount != 0) {
            rentalPropertyList[_propertyTokenId]
                .propertyVacancyReserveCap = _newVacancyReserveCapAmount;
            vacancyReserve.setVacancyReserveCap(
                _propertyTokenId,
                _newVacancyReserveCapAmount
            );
        }
    }

    function initiateRentalPeriod(
        uint256 _propertyTokenId,
        address _tenant,
        uint256 _rentalPeriodInDays,
        uint256 _amountTowardsMaintenanceReserve,
        uint256 _amountTowardsVacancyReserve
    ) external payable onlyPropertyManager nonReentrant {
        require(
            rentalPropertyList[_propertyTokenId].listed == true,
            "Property is not listed for the rental period initiation"
        );
        require(
            rentalPropertyList[_propertyTokenId].isOccupied == false,
            "Property is already occupied"
        );
        require(_tenant != address(0), "Provide Valid Tenant address");
        require(
            msg.value != 0,
            "Please deposite rent for the whole month while initiating rental period"
        );
        uint256 remainingRentAmount = msg.value;
        uint256 maintenanceReserveDeficit;
        uint256 vacancyReserveDeficit;
        if (_amountTowardsMaintenanceReserve != 0) {
            require(
                _amountTowardsMaintenanceReserve <= remainingRentAmount,
                "Amount towards Maintenance Reserve should be less than Rent Amount"
            );
            (, , maintenanceReserveDeficit) = maintenanceReserve
                .checkMaintenanceReserve(_propertyTokenId);
            require(
                _amountTowardsMaintenanceReserve <= maintenanceReserveDeficit,
                "Please provide amount for the MaintenanceReserve less than or equal to its deficit"
            );
            maintenanceReserve.restoreMaintenanceReserve{
                value: _amountTowardsMaintenanceReserve
            }(_propertyTokenId);
            remainingRentAmount -= _amountTowardsMaintenanceReserve;
        }
        if (_amountTowardsVacancyReserve != 0) {
            require(
                _amountTowardsVacancyReserve <= remainingRentAmount,
                "Amount towards Vacancy Reserve should be less than Rent Amount"
            );
            (, , vacancyReserveDeficit) = vacancyReserve.checkVacancyReserve(
                _propertyTokenId
            );
            require(
                _amountTowardsVacancyReserve <= vacancyReserveDeficit,
                "Please provide amount for the VacancyReserve less than or equal to its deficit"
            );
            vacancyReserve.restoreVacancyReserve{
                value: _amountTowardsVacancyReserve
            }(_propertyTokenId);
            remainingRentAmount -= _amountTowardsVacancyReserve;
        }
        uint256 _dailyRentAmountForThisRentalPeriod = remainingRentAmount /
            _rentalPeriodInDays;
        propertyRentDeposits[_propertyTokenId] += remainingRentAmount;
        rentalPropertyDetails
            storage _rentalPropertyDetails = rentalPropertyList[
                _propertyTokenId
            ];
        _rentalPropertyDetails.isOccupied = true;
        _rentalPropertyDetails.rentalStartTimestamp = block.timestamp;
        _rentalPropertyDetails.tenant = _tenant;
        _rentalPropertyDetails.currentRentalPeriodInDays = _rentalPeriodInDays;
        _rentalPropertyDetails
            .dailyRentAmountForThisRentalPeriod = _dailyRentAmountForThisRentalPeriod;
        _rentalPropertyDetails.rentCycleCounter = 0;
        assert(
            remainingRentAmount >=
                _dailyRentAmountForThisRentalPeriod * _rentalPeriodInDays
        );
        // emit RentalPeriodInitiated(
        //     _propertyTokenId,
        //     _tenant,
        //     _rentalPeriodInDays
        // );
        emit RentalPeriodInitiated(
            _propertyTokenId,
            _tenant,
            block.timestamp,
            _rentalPeriodInDays
        );
    }

    function distributeRentAmount(
        uint256 _propertyTokenId,
        address[] memory _ownerList
    ) external payable onlyPropertyManager nonReentrant {
        require(
            rentalPropertyList[_propertyTokenId].listed == true,
            "Property is not listed for the rental process"
        );
        require(
            rentalPropertyList[_propertyTokenId].isOccupied == true,
            "Property is not currently occupied"
        );
        require(
            rentalPropertyList[_propertyTokenId]
                .dailyRentAmountForThisRentalPeriod <=
                propertyRentDeposits[_propertyTokenId],
            "Not enough deposits to distribute the rent"
        );
        if (rentalPropertyList[_propertyTokenId].rentCycleCounter != 0) {
            require(
                rentalPropertyList[_propertyTokenId].rentalStartTimestamp +
                    (24 * 60 * 60) *
                    rentalPropertyList[_propertyTokenId].rentCycleCounter <=
                    block.timestamp,
                "Wait for the next rent distribution cycle"
            );
        }
        rentalPropertyList[_propertyTokenId].rentCycleCounter += 1;
        uint256 rentAmount = rentalPropertyList[_propertyTokenId]
            .dailyRentAmountForThisRentalPeriod;
        uint256 totalSupplyOfPropertyToken = token.totalSupply(
            _propertyTokenId
        );
        uint256 rentPerTokenShare = rentAmount / totalSupplyOfPropertyToken;
        uint256 balanceOfTheOwner;
        uint256 ownerListLength = _ownerList.length;
        uint256[] memory rentAmountPerOwner = new uint256[](ownerListLength);
        uint256 rentForAssert;
        for (uint256 i = 0; i < ownerListLength; ) {
            balanceOfTheOwner = token.balanceOf(
                _ownerList[i],
                _propertyTokenId
            );
            uint256 rentAmountForTheOwner = balanceOfTheOwner *
                rentPerTokenShare;
            rentAmountPerOwner[i] = rentAmountForTheOwner;
            rentForAssert += rentAmountForTheOwner;
            unchecked {
                i++;
            }
        }
        assert(rentForAssert <= rentAmount);
        propertyRentDeposits[_propertyTokenId] -= rentForAssert;
        for (uint256 i; i < ownerListLength; ) {
            // shareHoldersRentIncomeBalances[_propertyTokenId][
            //     _ownerList[i]
            // ] += rentAmountPerOwner[i];
            payable(_ownerList[i]).transfer(rentAmountPerOwner[i]);
            unchecked {
                i++;
            }
        }
        emit RentDistributed(_propertyTokenId, _ownerList, rentAmountPerOwner);
        if (
            rentalPropertyList[_propertyTokenId].rentCycleCounter ==
            rentalPropertyList[_propertyTokenId].currentRentalPeriodInDays
        ) {
            terminateRentalPeriod(_propertyTokenId);
        }
    }

    function terminateRentalPeriod(uint256 _propertyTokenId)
        public
        onlyPropertyManager
        nonReentrant
    {
        require(
            rentalPropertyList[_propertyTokenId].listed == true,
            "Property is not listed for the rental process"
        );
        require(
            rentalPropertyList[_propertyTokenId].isOccupied == true,
            "Property is already vacant"
        );
        uint256 remainingDepositAmount = propertyRentDeposits[_propertyTokenId];
        address _tenant = rentalPropertyList[_propertyTokenId].tenant;
        propertyRentDeposits[_propertyTokenId] = 0;
        rentalPropertyDetails
            storage _rentalPropertyDetails = rentalPropertyList[
                _propertyTokenId
            ];
        _rentalPropertyDetails.isOccupied = false;
        _rentalPropertyDetails.tenant = address(0);
        _rentalPropertyDetails.rentalStartTimestamp = 0;
        _rentalPropertyDetails.currentRentalPeriodInDays = 0;
        _rentalPropertyDetails.dailyRentAmountForThisRentalPeriod = 0;
        _rentalPropertyDetails.rentCycleCounter = 0;
        payable(_tenant).transfer(remainingDepositAmount);
        emit RentalPeriodTerminated(
            _propertyTokenId,
            _tenant,
            block.timestamp,
            remainingDepositAmount
        );
    }

    // function withdrawRentIncome(
    //     uint256 _propertyTokenId,
    //     bytes32[] memory proof
    // ) external nonReentrant {
    //     require(
    //         rentalPropertyList[_propertyTokenId].listed == true,
    //         "Property is not listed for the rental process"
    //     );
    //     require(
    //         shareHoldersRentIncomeBalances[_propertyTokenId][msg.sender] != 0,
    //         "Do not have any funds to withdraw"
    //     );
    //     uint256 amountToTransfer = shareHoldersRentIncomeBalances[
    //         _propertyTokenId
    //     ][msg.sender];
    //     shareHoldersRentIncomeBalances[_propertyTokenId][msg.sender] = 0;
    //     payable(msg.sender).transfer(amountToTransfer);
    //     emit rentIncomeWithdrwal(
    //         _propertyTokenId,
    //         msg.sender,
    //         amountToTransfer
    //     );
    // }
}
