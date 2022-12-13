// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract MockNFT1155 is Initializable, ERC1155Upgradeable {
    uint256 public tokenId;

    function initialize() external initializer {
        __ERC1155_init("");
    }

    //ANCHOR : Mint
    function mintNewPropertyToken(
        string calldata __uri,
        uint256 _amount,
        address _propowneradd
    ) external {
        uint256 _estateId = tokenId;
        require(bytes(__uri).length > 0, "URI not found");
        // require(tokenInfo[_estateId].minted == false, "Token already minted");
        // tokenInfo[_estateId].uri = __uri;
        // tokenInfo[_estateId].minted = true;
        tokenId++;

        // emit mintedNewPropertyToken(_estateId, _amount, __uri);
        _mint(_propowneradd, _estateId, _amount, "");
    }
}
