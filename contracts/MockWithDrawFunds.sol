// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract MockWithDrawFunds {
    function balanceOf() public view returns (uint256 balance) {
        return address(this).balance;
    }

    event Received(address from);

    receive() external payable {}

    // function send(address payable _receiver) external {
    //     _receiver.transfer(address(this).balance);
    //     emit Received(msg.sender);
    // }

    //  uint256 _tokenId,
    //     uint256 _amountToWithdraw,

    function withdrawFromMaintenanceReserve(
        uint256 _tokenId,
        uint256 _amountToWithdraw,
        address payable _recepientAddr
    ) public {
        _recepientAddr.transfer(1000);
    }
}
