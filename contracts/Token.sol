//NOTE: @devs please install anchor comments to understand comments better
// SPDX-License-Identifier: MIT
pragma solidity >0.8.0;
import "contracts/helper/BasicMetaTransaction.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

contract Token is
    Initializable,
    ERC1155Upgradeable,
    OwnableUpgradeable,
    ERC1155BurnableUpgradeable,
    ERC1155PausableUpgradeable,
    ERC1155SupplyUpgradeable,
    ERC1155HolderUpgradeable,
    BasicMetaTransaction,
    ReentrancyGuardUpgradeable
{
    //SECTION : Global variables

    //ANCHOR : token id counter
    uint256 public tokenID;

    //ANCHOR : adresses for admins
    address public admin0; //NOTE: admin0 reserved for owner, check initialize function
    address public admin1;
    address public admin2;

    //!SECTION : End Variables
    //SECTION EVENTS

    //ANCHOR : Mint event
    event mintedNewPropertyToken(
        uint256 indexed estateId,
        uint256 amount,
        string uri
    );

    //ANCHOR : Extendburndeadline event
    event extendedBurnDeadline(
        uint256 indexed estateid,
        uint256 burnAllowedTill
    );

    //!SECTION END EVENTS

    //SECTION STRUCTS

    //ANCHOR : TokenInfo Struct
    struct Tokeninfo {
        bool minted; // true if minted already
        bool burnState; // true if burn is on
        bool tempBurnState; // true for forced burn
        uint256 burnAllowedTill; // time left till burn is allowed
        string uri; // uri of the token
    }

    //ANCHOR : Propertyinfo struct
    struct Propertyinfo {
        string propertyName;
        string location;
        string taxId;
    }
    //ANCHOR : Document struct
    struct Docs {
        string doc1;
        string doc2;
        string doc3;
        string doc4;
    }

    //!SECTION END STRUCTS

    //SECTION : MAPPINGS

    //ANCHOR : mapping for token info
    mapping(uint256 => Tokeninfo) public tokenInfo;
    //ANCHOR : mapping for propertyinfo
    mapping(uint256 => Propertyinfo) public propertyinfo;
    //ANCHOR : mapping for documents
    mapping(uint256 => Docs) public docs;

    //!SECTION MAPPINGS

    //SECTION FUNCTIONS

    //ANCHOR : initialize
    function initialize() external initializer {
        __ERC1155_init("");
        __Ownable_init();
        __ERC1155Burnable_init();
        __ERC1155Pausable_init();
        __ERC1155Supply_init();
        admin0 = owner();
    }

    //ANCHOR:update owner as admin 0
    //for case if the contract owner is changed
    function updateAdmin0() external onlyOwner {
        admin0 = owner();
    }

    //SECTION : MINT

    //ANCHOR : Mint
    function mintNewPropertyToken(
        string calldata __uri,
        uint256 _amount,
        address _propowneradd
    ) external nonReentrant onlyOwner {
        uint256 _estateId = tokenID;
        require(bytes(__uri).length > 0, "URI not found");
        require(tokenInfo[_estateId].minted == false, "Token already minted");
        tokenInfo[_estateId].uri = __uri;
        tokenInfo[_estateId].minted = true;
        tokenID++;

        emit mintedNewPropertyToken(_estateId, _amount, __uri);
        _mint(_propowneradd, _estateId, _amount, "");
    }

    //!SECTION : End Mint

    //SECTION : pause/unpause

    //ANCHOR : PAUSE
    //function to pause contract
    function pause() external onlyOwner {
        _pause();
    }

    //ANCHOR : UNPAUSE
    // function to unpause contract
    function unPause() external onlyOwner {
        _unpause();
    }

    //!SECTION : END PAUSE/UNPAUSE

    //SECTION : URI - Management

    //ANCHOR function to set the uri of a token
    function updateTokenURI(uint256 _estateid, string memory _uri)
        external
        onlyOwner
    {
        require(bytes(_uri).length > 0, "URI not found");
        tokenInfo[_estateid].uri = _uri;
    }

    //!SECTION : End uri - management

    //SECTION : Burn mechanism

    /* NOTE : burn mech steps
        1. update burn state and set time
        2. burn the tokens 
    */

    //NOTE: check overridden function burn for burn implementation line no. 274

    //ANCHOR : function to set burn state and time for token
    function updateBurningState(
        bool _state,
        uint256 _estateid,
        uint256 _timetill
    ) public onlyOwner {
        tokenInfo[_estateid].burnState = _state;
        tokenInfo[_estateid].burnAllowedTill = _timetill;
    }

    //ANCHOR : funtion to extend the burn deadline
    function extendBurnDeadline(uint256 _estateid, uint256 _timetill)
        external
        onlyOwner
    {
        require(
            tokenInfo[_estateid].burnState == true,
            "Burning is not allowed at the moment"
        );
        require(
            _timetill > tokenInfo[_estateid].burnAllowedTill,
            "Extension time is less than the current time"
        );
        emit extendedBurnDeadline(_estateid, _timetill);
        tokenInfo[_estateid].burnAllowedTill = _timetill;
    }

    //!SECTION : END burn mechanism

    //SECTION : documents

    //ANCHOR : Setter for 3 docs together
    function setDocs(
        uint256 _tokenID,
        string calldata doc1,
        string calldata doc2,
        string calldata doc3,
        string calldata doc4
    ) public onlyOwner {
        docs[_tokenID].doc1 = doc1;
        docs[_tokenID].doc2 = doc2;
        docs[_tokenID].doc3 = doc3;
        docs[_tokenID].doc4 = doc4;
    }

    //ANCHOR : Setter for doc 1
    function setDoc1(uint256 _tokenID, string calldata doc1) public {
        docs[_tokenID].doc1 = doc1;
    }

    //ANCHOR : Setter for doc 2
    function setDoc2(uint256 _tokenID, string calldata doc2) public {
        docs[_tokenID].doc2 = doc2;
    }

    //ANCHOR : Setter for doc 3
    function setDoc3(uint256 _tokenID, string calldata doc3) public {
        docs[_tokenID].doc3 = doc3;
    }

    //ANCHOR : Setter for doc 4
    function setDoc4(uint256 _tokenID, string calldata doc4) public {
        docs[_tokenID].doc4 = doc4;
    }

    //!SECTION : docs

    //SECTION : propertyInfo

    //ANCHOR : setter for propertyinfo
    function setPropertyinfo(
        uint256 _tokenID,
        string calldata _propertyName,
        string calldata _location,
        string calldata _taxID
    ) public onlyOwner {
        propertyinfo[_tokenID].propertyName = _propertyName;
        propertyinfo[_tokenID].location = _location;
        propertyinfo[_tokenID].taxId = _taxID;
    }

    //!SECTION : End propertyinfo

    //SECTION : controller-Operations

    //ANCHOR : setter for admins
    function setAdmins(address _admin1, address _admin2) external onlyOwner {
        admin1 = _admin1;
        admin2 = _admin2;
    }

    //ANCHOR : to give approval to admins
    function adminApproveForAll(bool approved) external {
        setApprovalForAll(admin0, approved);
        setApprovalForAll(admin1, approved);
        setApprovalForAll(admin2, approved);
    }

    //!SECTION : End controller Operations

    //!SECTION : END FUNCTIONS

    //SECTION overridden functions

    //ANCHOR function to burn token overridden from ERC1155BurnableUpgradeable
    function burn(
        address _account,
        uint256 _estateid,
        uint256 _amount
    ) public override {
        require(
            tokenInfo[_estateid].burnState == true ||
                msgSender() == admin0 ||
                msgSender() == admin1 ||
                msgSender() == admin2,
            "Burning is not allowed at the moment for token-id "
        );
        require(
            tokenInfo[_estateid].burnAllowedTill > block.timestamp ||
                tokenInfo[_estateid].tempBurnState == true,
            "Burn time is over"
        );
        require(
            totalSupply(_estateid) > 0,
            "Cannot burn token with no available supply"
        );
        require(
            balanceOf(_account, _estateid) >= _amount,
            "Amount exceeds the available balance to burn with this token-id in this account"
        );

        require(
            _account == _msgSender() ||
                isApprovedForAll(_account, _msgSender()),
            "ERC1155: caller is not owner nor approved"
        );
        _burn(_account, _estateid, _amount);
    }

    //ANCHOR function to burn in batch overridden from ERC1155Burnableupgradeable
    function burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory values
    ) public override {
        require(
            ids.length == values.length,
            "Length of ids and values should be same"
        );
        for (uint256 i = 0; i < ids.length; i++) {
            require(
                tokenInfo[ids[i]].burnState == true ||
                    msgSender() == admin0 ||
                    msgSender() == admin1 ||
                    msgSender() == admin2,
                "Burning is not allowed at the moment for token-id "
            );
            require(
                tokenInfo[ids[i]].burnAllowedTill > block.timestamp ||
                    tokenInfo[ids[i]].tempBurnState == true,
                "Burn time is over"
            );
            require(
                totalSupply(ids[i]) > 0,
                "Cannot burn token with no available supply"
            );
            require(
                balanceOf(account, ids[i]) >= values[i],
                "Amount exceeds the available balance to burn with this token-id in this account"
            );

            require(
                account == _msgSender() ||
                    isApprovedForAll(account, _msgSender()),
                "ERC1155: caller is not owner nor approved"
            );
        }

        _burnBatch(account, ids, values);
    }

    //ANCHOR function to view uri of a token overridden
    function uri(uint256 _estateid)
        public
        view
        override
        returns (string memory)
    {
        return tokenInfo[_estateid].uri;
    }

    // override function to save from errors in ERC1155
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    )
        internal
        override(
            ERC1155PausableUpgradeable,
            ERC1155Upgradeable,
            ERC1155SupplyUpgradeable
        )
        whenNotPaused
    {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    //ANCHOR: override function to save from errors in ERC1155
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155Upgradeable, ERC1155ReceiverUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    //ANCHOR : function to override _msgsender()  for BMT
    function _msgSender() internal view virtual override returns (address) {
        return msgSender();
    }

    //!SECTION END overridden functions
}
