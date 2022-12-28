// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IVacancyReserve {
    function checkVacancyReserve(uint256 _tokenId)
        external
        view
        returns (
            uint256 _propertyVacancyReserveCap,
            uint256 _propertyVacancyReserve,
            uint256 _propertyVacancyReserveDeficit
        );

    function withdrawFromVacancyReserve(
        uint256 _tokenId,
        uint256 _amountToWithdraw,
        address payable _recepientAddr
    ) external;
}
