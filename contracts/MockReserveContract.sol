// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract MockReserveContract {
    function balanceOf() public view returns (uint256 balance) {
        return address(this).balance;
    }

    event Received(address from);

    receive() external payable {}

    function withdrawFromMaintenanceReserve(
        uint256 _tokenId,
        uint256 _amountToWithdraw,
        address payable _recepientAddr
    ) public {
        _recepientAddr.transfer(1000);
    }
}
