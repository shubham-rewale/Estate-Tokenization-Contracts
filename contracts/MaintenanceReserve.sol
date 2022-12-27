// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9 <0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MaintenanceReserve is OwnableUpgradeable, UUPSUpgradeable {
    address public DAOContract;

    function initialize(address _dAOContractAddress) public initializer {
        __Ownable_init();
        DAOContract = _dAOContractAddress;
    }

    function balanceOf() public view returns (uint256 balance) {
        return address(this).balance;
    }

    event Received(address from, uint256 value);

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    function withdrawFromMaintenanceReserve(
        uint256 _tokenId,
        uint256 _amountToWithdraw,
        address payable _recepientAddr
    ) public {
        require(
            msg.sender == DAOContract,
            "Only DAO contract can call withdrawFromMaintenanceReserve"
        );
        _recepientAddr.transfer(_amountToWithdraw);
    }

    // Need to add this function because of UUPS proxy
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
