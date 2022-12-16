// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract MockWithDrawFunds {
    function balance() public view returns (uint256 balance) {
        return address(this).balance;
    }

    receive() external payable {}

    function send(address _receiver) external {
        payable(_receiver).transfer(address(this).balance);
    }
}
