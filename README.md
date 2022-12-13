# Estate-Tokenization DAO contract

**Table of Contents**
[Overview](#overview)<br>
[Functions](#functions)<br>

## **Overview**

- MockDAO.sol Implements the proposal,voting and execution functionality

## **Functions**

```
function initialize(uint256 _votingDelay,uint256 _votingPeriod,bytes32 _proposersRootHash) public initializer{}
```

To initialize the DAO contract

- \_votingDelay = Time delay(in blocks) to start voting for any proposal from it's initialization
- \_votingPeriod = Time (in blocks) for voting period for any proposal .
- \_proposersRootHash = proposers root hash . Have access to make propose

```
function propose(
        uint256 _amount,
        string calldata _proposalProof,
        bytes32 _votersRootHash,
        bytes32[] memory _proposerMarkleProof
    ) public {}
```

- \_amount = Amount required to grant
- \_proposalProof = Any link for proposal proof
- \_\_votersRootHash = all voters root hash for a particular proposal
- \_proposerMarkleProof = function caller markle proof

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
