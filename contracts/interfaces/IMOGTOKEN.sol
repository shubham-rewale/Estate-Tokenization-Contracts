// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMOGTokenUpgradeable {
    function mint(
        address _reciever,
        uint256 _amount,
        string calldata _uri
    ) external;

    function batchMint(
        address _reciever,
        uint256[] calldata _amounts,
        string[] calldata _URIs
    ) external;

    function burn(
        address _holder,
        uint256 _id,
        uint256 _amount
    ) external;

    function batchBurn(
        address _holder,
        uint256[] memory _ids,
        uint256[] memory _amounts
    ) external;

    function totalSupply(uint256 id) external view returns (uint256);

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external;

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external;

    function balanceOf(address account, uint256 id)
        external
        view
        returns (uint256);
}
