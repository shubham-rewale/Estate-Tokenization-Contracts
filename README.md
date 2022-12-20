# Estate-Tokenization DAO contract

**Table of Contents**
<br>
[Overview](#overview)<br>
[Functions](#functions)<br>

## **Overview**

- MockDAO.sol Implements the proposal,voting and execution functionality

## **Functions**

```
 function initialize(
        uint256 _votingDelay,
        uint256 _votingPeriod,
        address _propertyManager,
        address _reserveContractAddress
    ) public initializer {}
```

To initialize the DAO contract

- \_votingDelay = Time delay(in blocks) to start voting for any proposal from it's initialization
- \_votingPeriod = Time (in blocks) for voting period for any proposal .
- \_propertyManager = property manager address

```
function propose(
        uint256 _tokenId,
        uint256 _amount,
        string calldata _proposalProof,
        bytes32 _votersRootHash
    ) external {}
```

- \_tokenId = property token Id
- \_amount = Amount required to grant
- \_proposalProof = Any link for proposal proof
- \_votersRootHash = all voters root hash for a particular proposal

```
function vote(
        uint256 _proposalId,
        uint8 _vote,
        bytes32[] memory _voterMarkleProof
    ) public {
```

- \_proposalId = Proposal id that voters want to cast vote
- \_vote = 0-> abstain, 1-> for,2 -> abstain
- \_voterMarkleProof = voter markle proof

```
function execute(uint256 _proposalId)
        public
        onlyOwner
        returns (bool success)
    {}
```

Only admin of this contract can call this function

\_proposalId = proposal to be executed
