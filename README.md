# Estate-Tokenization DAO contract

**Table of Contents**
<br>
[Overview](#overview)<br>
[Flow](#flow)<br>
[Functions](#functions)<br>
[RunTests](#runtest)<br>

## **Overview**

- This DAO contract helps to execute a proposal based on voting .

## **Flow**

-
- First property manager add a proposal using proposal function. While Making an proposal property manager have to mention which reserve contract will involve in transfer of funds , when the proposal gets executed successfully.

- After the voting delay that proposal will be in active state (means voting period is started for that proposal).
- Property owners can then vote on that proposal using the proof of voting
- After voting period the proposal will go in a execution state ,means voting is done for that proposal and waiting for DAO contract owner to execute that proposal.

- Contract owner execute the proposal by calling execute function .If the voting is not successful for that proposal the then contract will just delete the proposal info and return false , and if the voting is successful the the DAO contract will call a reserve contract to transfer the propose amount to the manager and
  delete proposal info from contract .

- Note : If voting is successful and anything went wrong during transfer of amount from the reserve contract.,then the execute function will revert and doesn't clear proposal info . So that Owner can later call execute function for that proposal.

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
function setMaintenanceReserveAddress(address _maintenanceReserveAddress) external onlyOwner {}
```

Owner have to call this function to set the MaintenanceReserve contract address

```
function setVacancyReserveAddress(address _vacancyReserveAddress) external onlyOwner {}
```

Owner have to call this function to set the VacancyReserve contract address

````

function propose(
uint256 \_tokenId,
uint256 \_amount,
ReserveContracts \_withdrawFundsFrom,
string calldata \_proposalProof,
bytes32 \_votersRootHash
) external {}

```

- \_tokenId = property token Id
- \_amount = Amount required to grant
- \_withdrawFundsFrom = withdrawFundsFrom = 0 -> withdraw from MaintenanceReserve, \_withdrawFundsFrom = 1 -> withdraw from VacancyReserve
- \_proposalProof = Any link for proposal proof
- \_votersRootHash = all voters root hash for a particular proposal

```

function vote(
uint256 \_proposalId,
uint8 \_vote,
bytes32[] memory \_voterMarkleProof
) public {

```

- \_proposalId = Proposal id that voters want to cast vote
- \_vote = 0-> abstain, 1-> for,2 -> abstain
- \_voterMarkleProof = voter markle proof

```

function execute(uint256 \_proposalId)
public
onlyOwner
returns (bool success)
{}

```

Only admin of this contract can call this function

\_proposalId = proposal to be executed

## **RunTests**

- clone the repository

```

https://github.com/shubham-rewale/Estate-Tokenization-Contracts.git

```

- change branch to dao

```

git switch dao

```

- Install Dependency

```

npm i

```

- Run test

```

npx hardhat test

```

```
````
