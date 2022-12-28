// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IMaintenanceReserve {
    function checkMaintenanceReserve(uint256 _tokenId)
        external
        view
        returns (
            uint256 _propertyMaintenanceReserveCap,
            uint256 _propertyMaintenanceReserve,
            uint256 _propertyMaintenanceReserveDeficit
        );

    function withdrawFromMaintenanceReserve(
        uint256 _tokenId,
        uint256 _amountToWithdraw,
        address payable _recepientAddr
    ) external;
}
