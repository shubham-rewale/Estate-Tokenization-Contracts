// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract Mock is ERC1155 {
    uint256 public constant Property1 = 0;
    uint256 public constant Property2 = 1;
    uint256 public constant Property3 = 2;
    uint256 public constant Property4 = 3;
    uint256 public constant Property5 = 4;

    constructor() ERC1155("https://property.example/api/item/{id}.json") {
        _mint(msg.sender, Property1, 10, "");
        _mint(msg.sender, Property2, 1000, "");
        _mint(msg.sender, Property3, 1, "");
    }

    function burn(
        address _holder,
        uint256 _id,
        uint256 _amount
    ) external {
        _burn(_holder, _id, _amount);
    }
}