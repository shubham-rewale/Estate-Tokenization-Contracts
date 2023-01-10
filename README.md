**Table of Contents**
<br>
[Overview](#overview)<br>
[Flow](#flow)<br>
[Functions](#functions)<br>
[RunTests](#runtest)<br>

# **Overview**

List Of Contracts Related to Rent Mechanism

## Token.sol

- It's a basic ERC 1155 token contract used for real estate tokenisation.

## RentalProperties.sol

- This contract is used to handle the rental process for the tokenised real estate properties.

## MaintenanaceReserve.sol

- This contract is used to hold funds for maintenance related expenses.

## VacancyReserve.sol

- This contract is used to hold funds for distribution of rent in case if the property is vacant.

## Dao.sol

- This contract is used to create proposal to withdraw funds from both of the reserve contracts based on voting mechanism.

# **Flow**

1. Mint property token(ERC 1155) using **mintNewPropertyToken()** in Token Contract.
2. Transfer minted tokens to different multiple owners.
3. List the minted property for rental process using **enterRentalPropertyDetails()** in RentalProperties Contract.
4. Initiate rental period using **initiateRentalPeriod()** in RentalProperties Contract.
5. Distribute rent amount among multiple owners using **distributeRentAmount()** in RentalProperties Contract.
6. To terminate rental period,Call **terminateRentalPeriod()** in RentalProperties Contract.
7. Funds will be transfered after **initiateRentalPeriod()** is called.
8. Funds in both of the reserve contracts can be withdrawn by createing a proposal using **propose()** in DAO contract. While Making an proposal property manager have to mention which reserve contract will involve in transfer of funds , when the proposal gets executed successfully.
9. After the voting delay that proposal will be in active state (means voting period is started for that proposal).
   - Property owners can then vote using **vote()** on that proposal using the proof of voting.
   - After voting period the proposal will go in a execution state ,means voting is done for that proposal and waiting for DAO contract owner to execute that proposal.
10. Contract owner execute the proposal by calling **execute()**.If the voting is not successful for that proposal then the contract will just delete the proposal info and return false , and if the voting is successful then the DAO contract will call a reserve contract to transfer the propose amount to the manager and delete proposal info from DAO contract .

**_Note_** : If voting is successful and anything went wrong during transfer of amount from the reserve contract.,then the execute function will revert and doesn't clear proposal info . So that Owner can later call execute function for that proposal.

# **Functions**

```
function setRentalPropertiesContractAddr(address _rentalPropertiesContract)
        external
        onlypropertyManager{}
```

This function present in both MaintenanceReserve & VacancyReserve Contract is used to set the RentalProperties Contract address.

```
 function enterRentalPropertyDetails(
        uint256 _propertyTokenId,
        uint256 _propertyMaintenanceReserveCap,
        uint256 _propertyVacancyReserveCap
    ) external onlyPropertyManager {}
```

This function present in RentalProprties Contract is used to list minted property for the rental process.Here \_propertyTokenId in the parameter reprents the tokenId of minted property in the token contract,\_propertyMaintenanceReserveCap is cap amount for that particular property in MaintenanceReserve,\_propertyVacancyReserveCap is cap amount for that particular property in VacancyReserve.

```
 function initiateRentalPeriod(
        uint256 _propertyTokenId,
        address _tenant,
        uint256 _rentalPeriodInDays,
        uint256 _amountTowardsMaintenanceReserve,
        uint256 _amountTowardsVacancyReserve
    ) external payable onlyPropertyManager nonReentrant {}
```

This function present in RentalProprties Contract is used to initiate the rental period for listed property.Here \_amountTowardsMaintenanceReserve is funds which will be deducted from rent amount and will be credit in the mainenance reserve by considering the reserve cap amount,\_amountTowardsVacancyeReserve is funds which will be deducted from rent amount and will be credit in the vacancy reserve by considering the reserve cap amount.

```
 function distributeRentAmount(
        uint256 _propertyTokenId,
        address[] memory _ownerList
    ) external payable onlyPropertyManager nonReentrant {}
```

This function present in RentalProprties Contract is used to distribute rent which is left after restoring the reserves among multiple owners.Rent will be distributed on daily basis.

```
 function terminateRentalPeriod(uint256 _propertyTokenId)
        public
        onlyPropertyManager
        nonReentrant
    {}
```

This function present in RentalProprties Contract is used to terminate the rental processs and remaing rent amount will be transfered back to the tenant.

```
 function restoreMaintenanceReserve(uint256 _tokenId) external payable {}
```

This function present in MaintenanceReserve Contract is used to restore the funds back into the reserves considering the cap amount.Here msg.value should not be more than the deficit.

```

```

function withdrawFromMaintenanceReserve(
uint256 \_tokenId,
uint256 \_amountToWithdraw,
address payable \_recepientAddr
) external {}

```
 This function present in MaintenanceReserve Contract is used to withdraw funds from the maintenance reserve.It can only be called by DAO contract by creating proposal.

function   restoreVacancyReserve(uint256 _tokenId) external payable {}
```

This function present in VacancyReserve Contract is used to restore the funds back into the reserves considering the cap amount.Here msg.value should not be more than the deficit.

```
  function withdrawFromVacancyReserve(
       uint256 _tokenId,
       uint256 _amountToWithdraw,
       address payable _recepientAddr
   ) external {}
```

This function present in VacancyReserve Contract is used to withdraw funds from the vacancy reserve.It can only be called by DAO contract by creating proposal.

```
function setMaintenanceReserveAddress(address _maintenanceReserveAddress) external onlyOwner {}
```

This function present in DAO Contract .Owner have to call this function to set the MaintenanceReserve contract address

```
function setVacancyReserveAddress(address _vacancyReserveAddress) external onlyOwner {}
```

This function present in DAO Contract .Owner have to call this function to set the VacancyReserve contract address

```

function propose(
uint256 _tokenId,
uint256 _amount,
ReserveContracts _withdrawFundsFrom,
string calldata _proposalProof,
bytes32 _votersRootHash
) external {}

```

This function present in DAO Contract used to create proposal to withdraw funds from reserves.Here \_withdrawFundsFrom represents an enum whoose value is 0 for withdraw from MaintenanceReserve & 1 for withdraw from VacancyReserve,\_proposalProof & \_votersRootHash represents external link of proposal document and merkle root hash of all owners for a particular proposal resepectively.

```

function vote(
uint256 _proposalId,
uint8 _vote,
bytes32[] memory _voterMerkleProof
) public {}

```

This function present in DAO Contract used to vote for proposal.Here vote represents an enum in which 0-> against, 1-> for,2 -> abstain and \_voterMerkleProof is merkle proof of particular voter

```

function execute(uint256 _proposalId)
public
onlyOwner
returns (bool success)
{}

```

This function present in DAO Contract used to execute the proposal.This function will call withdraw function of reserve contract.

## **RunTests**

- clone the repository

```
https://github.com/shubham-rewale/Estate-Tokenization-Contracts.git
```

- switch branch to dev

```
git switch dev
```

- Install Dependency

```
npm i
```

- Run test

```
npx hardhat test
```

# Token contract is deployed at

- Mumbai network

```
0xC7a999Fb934b2585d546D667Dc4A49d72012B676
```

# DAO contract

- Mumbai network

```
0x51662e747b2F523c43f6c0E043dC0044869071f7
```

# Maintenance Reserve

- Mumbai network

```
0x945334a1271b7976ECFf39a3782182607e283b3D
```

# Vacancy Reserve

- Mumbai Network

```
0x9C35F5FA175cA719082217D6C79cd181143438eE
```

# Rental properties

- Mumbai Network

```
0x7CA530576b9293a5688d57099781fE521Ce50779
```
