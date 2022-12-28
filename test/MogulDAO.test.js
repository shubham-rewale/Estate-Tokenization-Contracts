// const { expect } = require("chai");
// const { ethers, upgrades, waffle } = require("hardhat");
// const { BigNumber } = require("ethers");
// const MogulDAOMerkleTree = require("../utils/merkleTree");
// const { moveBlocks } = require("../utils/helper");

// const provider = waffle.provider;

// //In blocks
// const votingDelay = 10;
// const votingPeriod = 100;
// // const mogulDAOMerkleTree = new MogulDAOMerkleTree();
// describe("Estate DAO ", function () {
//   let deployer;
//   let propertyManager;
//   let owner1;
//   let owner2;
//   let owner3;
//   let addrs;
//   let DAO;
//   let dao;
//   let MaintenanceReserve;
//   let VacancyReserve;
//   let maintenanceReserve;
//   let vacancyReserve;
//   let mogulDAOMerkleTree;
//   beforeEach(async () => {
//     [deployer, propertyManager, owner1, owner2, owner3, ...addrs] =
//       await ethers.getSigners();
//     const owners = [owner1.address, owner2.address, owner3.address];
//     mogulDAOMerkleTree = new MogulDAOMerkleTree(owners);
//     DAO = await ethers.getContractFactory("DAO");
//     MaintenanceReserve = await ethers.getContractFactory("MaintenanceReserve");
//     VacancyReserve = await ethers.getContractFactory("VacancyReserve");

//      /** Deploy the maintenance reserve contract  */
//      maintenanceReserve = await upgrades.deployProxy(
//       MaintenanceReserve,
//       [dao.address],
//       { initializer: "initialize" },
//       {
//         kind: "uups",
//       }
//     );
//     await maintenanceReserve.deployed();

//     /** Deploy Vacancy Reserve contract */
//     vacancyReserve = await upgrades.deployProxy(
//       VacancyReserve,
//       [dao.address],
//       { initializer: "initialize" },
//       {
//         kind: "uups",
//       }
//     );
//     await vacancyReserve.deployed();

//     //Deploy the DAO contract
//     dao = await upgrades.deployProxy(
//       DAO,
//       [votingDelay, votingPeriod, propertyManager.address],
//       {
//         initializer: "initialize",
//       },
//       { kind: "uups" }
//     );
//     await dao.deployed();

//     //set the maintenance reserve contract address in the DAO contract
//     await dao.setMaintenanceReserveAddress(maintenanceReserve.address);
//     //set the vacancy reserve contract address in the DAO contract
//     await dao.setVacancyReserveAddress(vacancyReserve.address);
//   });
//   it("Deployer should be the owner of DAO the contract", async () => {
//     expect(await dao.owner()).to.equal(deployer.address);
//   });

//   it("Reserve contracts should have balance that has sent to it", async () => {
//     expect(await maintenanceReserve.balanceOf()).to.equal(
//       ethers.utils.parseEther("1.0")
//     );
//     expect(await vacancyReserve.balanceOf()).to.equal(
//       ethers.utils.parseEther("1.0")
//     );
//   });

//   it("Only DAO contract should be able to forward funds from reserve contracts", async () => {
//     await expect(
//       maintenanceReserve.withdrawFromMaintenanceReserve(
//         0,
//         1000,
//         propertyManager.address
//       )
//     ).to.be.revertedWith(
//       "Only DAO contract can call withdrawFromMaintenanceReserve"
//     );

//     await expect(
//       vacancyReserve.withdrawFromVacancyReserve(
//         0,
//         1000,
//         propertyManager.address
//       )
//     ).to.be.revertedWith(
//       "Only DAO contract can call withdrawFromVacancyReserve"
//     );
//   });

//   it("Should not be able to call initialize after contract deployment", async () => {
//     await expect(
//       dao.initialize(votingDelay, votingPeriod, propertyManager.address)
//     ).to.be.revertedWith("Initializable: contract is already initialized");
//   });

//   it("Property Managers should be able to make a proposal", async () => {
//     const tokenId = 0;
//     const amount = 1000;
//     // withdrawFundsFrom = 0 means withdraw funds from maintenance reserve , 1 means from withdraw funds from vacancy reserve
//     const withdrawFundsFrom = 0;
//     const proposalProof = "Proposal proof";
//     const ownersRootHash = mogulDAOMerkleTree.getOwnersRootHash();

//     //try to propose from deployer account
//     await expect(
//       dao.propose(
//         tokenId,
//         amount,
//         withdrawFundsFrom,
//         proposalProof,
//         ownersRootHash
//       )
//     ).to.be.revertedWith("Caller is not property manager");

//     await expect(
//       dao
//         .connect(propertyManager)
//         .propose(
//           tokenId,
//           amount,
//           withdrawFundsFrom,
//           proposalProof,
//           ownersRootHash
//         )
//     ).to.emit(dao, "proposalInitiated");
//   });

//   it("Property Manager should be able to edit proposal in its pending period", async () => {
//     //make a proposal
//     const tokenId = 0;
//     const amount = 1000;
//     // withdrawFundsFrom = 0 means withdraw funds from maintenance reserve , 1 means from withdraw funds from vacancy reserve
//     const withdrawFundsFrom = 0;
//     const proposalProof = "Proposal proof";
//     const ownersRootHash = mogulDAOMerkleTree.getOwnersRootHash();
//     await expect(
//       dao
//         .connect(propertyManager)
//         .propose(
//           tokenId,
//           amount,
//           withdrawFundsFrom,
//           proposalProof,
//           ownersRootHash
//         )
//     ).to.emit(dao, "proposalInitiated");

//     //try to edit the proposal from deployer account
//     await expect(
//       dao.editProposal(
//         0,
//         tokenId,
//         amount + 100,
//         withdrawFundsFrom,
//         proposalProof,
//         ownersRootHash
//       ) //proposal ID will be 0 as this is the first proposal
//     ).to.be.revertedWith("Caller is not property manager");

//     //property manager should be able to edit the proposal
//     await expect(
//       dao
//         .connect(propertyManager)
//         .editProposal(
//           0,
//           tokenId,
//           amount + 100,
//           withdrawFundsFrom,
//           proposalProof,
//           ownersRootHash
//         ) //proposal ID will be 0 as this is the first proposal
//     ).to.emit(dao, "proposalEdited");

//     //try to edit the proposal when it's in voting period
//     //move the blocks to get past of voting delay
//     await moveBlocks(votingDelay + 1);
//     await expect(
//       dao
//         .connect(propertyManager)
//         .editProposal(
//           0,
//           tokenId,
//           amount + 100,
//           withdrawFundsFrom,
//           proposalProof,
//           ownersRootHash
//         ) //proposal ID will be 0 as this is the first proposal
//     ).to.be.revertedWith("Proposal not in pending state");
//   });

//   it("Voters should wait for delay period before casting vote", async () => {
//     //make a proposal.
//     const tokenId = 0;
//     const amount = 1000;
//     // withdrawFundsFrom = 0 means withdraw funds from maintenance reserve , 1 means from withdraw funds from vacancy reserve
//     const withdrawFundsFrom = 0;
//     const proposalProof = "Proposal proof";
//     const ownersRootHash = mogulDAOMerkleTree.getOwnersRootHash();
//     const tx = await dao
//       .connect(propertyManager)
//       .propose(
//         tokenId,
//         amount,
//         withdrawFundsFrom,
//         proposalProof,
//         ownersRootHash
//       );
//     //get the proposal Id
//     const proposalId = (await tx.wait()).events[0].args.proposalId;
//     //try to cast a vote from vot1 address
//     const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(owner1.address);
//     await expect(
//       dao.connect(owner1).vote(proposalId, 1, ownerMerkleProof)
//     ).to.be.revertedWith("Voting is not active");
//   });

//   it("Voters should be able to vote for a proposal", async () => {
//     //make a proposal. From pro1 address
//     const tokenId = 0;
//     const amount = 1000;
//     const withdrawFundsFrom = 0;
//     const proposalProof = "Proposal proof";
//     const ownersRootHash = mogulDAOMerkleTree.getOwnersRootHash();
//     const tx = await dao
//       .connect(propertyManager)
//       .propose(
//         tokenId,
//         amount,
//         withdrawFundsFrom,
//         proposalProof,
//         ownersRootHash
//       );
//     //get the proposal Id
//     const proposalId = (await tx.wait()).events[0].args.proposalId;
//     //move the blocks to get past of voting delay
//     await moveBlocks(votingDelay + 1);
//     //try to cast a vote from vot1 address
//     const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(owner1.address);
//     await expect(
//       dao.connect(owner1).vote(proposalId, 1, ownerMerkleProof)
//     ).to.emit(dao, "voted");
//   });
//   it("Voters should not be able to vote twice for a proposal", async () => {
//     //make a proposal. From pro1 address
//     const tokenId = 0;
//     const amount = 1000;
//     const withdrawFundsFrom = 0;
//     const proposalProof = "Proposal proof";
//     const ownersRootHash = mogulDAOMerkleTree.getOwnersRootHash();
//     const tx = await dao
//       .connect(propertyManager)
//       .propose(
//         tokenId,
//         amount,
//         withdrawFundsFrom,
//         proposalProof,
//         ownersRootHash
//       );
//     //get the proposal Id
//     const proposalId = (await tx.wait()).events[0].args.proposalId;
//     //move the blocks to get past of voting delay
//     await moveBlocks(votingDelay + 1);
//     //try to cast a vote from owner1 address
//     const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(owner1.address);
//     await dao.connect(owner1).vote(proposalId, 1, ownerMerkleProof);
//     //try to vote to the same proposal twice
//     await expect(
//       dao.connect(owner1).vote(proposalId, 1, ownerMerkleProof)
//     ).to.be.revertedWith("Cannot vote multiple times to the same proposal");
//   });
//   it("Only owner should be able to call the execute function", async () => {
//     //make a proposal. From pro1 address
//     const tokenId = 0;
//     const amount = 1000;
//     const withdrawFundsFrom = 0;
//     const proposalProof = "Proposal proof";
//     const ownersRootHash = mogulDAOMerkleTree.getOwnersRootHash();
//     const tx = await dao
//       .connect(propertyManager)
//       .propose(
//         tokenId,
//         amount,
//         withdrawFundsFrom,
//         proposalProof,
//         ownersRootHash
//       );
//     //get the proposal Id
//     const proposalId = (await tx.wait()).events[0].args.proposalId;
//     //move the blocks to get past of voting delay
//     await moveBlocks(votingDelay + 1);
//     //try to cast a vote from owner1 address
//     const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(owner1.address);
//     await dao.connect(owner1).vote(proposalId, 1, ownerMerkleProof);

//     //Now try to execute from different account
//     await expect(
//       dao.connect(propertyManager).execute(proposalId)
//     ).to.be.revertedWith("Ownable: caller is not the owner");
//   });

//   it("Should not able to execute a proposal in its voting period", async () => {
//     //make a proposal. From pro1 address
//     const tokenId = 0;
//     const amount = 1000;
//     const withdrawFundsFrom = 0;
//     const proposalProof = "Proposal proof";
//     const ownersRootHash = mogulDAOMerkleTree.getOwnersRootHash();
//     const tx = await dao
//       .connect(propertyManager)
//       .propose(
//         tokenId,
//         amount,
//         withdrawFundsFrom,
//         proposalProof,
//         ownersRootHash
//       );
//     //get the proposal Id
//     const proposalId = (await tx.wait()).events[0].args.proposalId;
//     //move the blocks to get past of voting delay
//     await moveBlocks(votingDelay + 1);
//     //try to cast a vote from owner1 address
//     const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(owner1.address);
//     await dao.connect(owner1).vote(proposalId, 1, ownerMerkleProof);

//     //try to execute
//     await expect(dao.execute(proposalId)).to.be.revertedWith(
//       "Proposal is not in Execution state"
//     );
//   });
//   it("deployer should be able to execute a proposal when it's in execution state", async () => {
//     //make a proposal. From pro1 address
//     const tokenId = 0;
//     const amount = 1000;
//     const withdrawFundsFrom = 0;
//     const proposalProof = "Proposal proof";
//     const ownersRootHash = mogulDAOMerkleTree.getOwnersRootHash();
//     const tx = await dao
//       .connect(propertyManager)
//       .propose(
//         tokenId,
//         amount,
//         withdrawFundsFrom,
//         proposalProof,
//         ownersRootHash
//       );
//     //get the proposal Id
//     const proposalId = (await tx.wait()).events[0].args.proposalId;
//     //move the blocks to get past of voting delay
//     await moveBlocks(votingDelay + 1);
//     //try to cast a vote from owner1 address
//     const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(owner1.address);
//     await dao.connect(owner1).vote(proposalId, 1, ownerMerkleProof);

//     await moveBlocks(votingPeriod + 1);

//     await expect(dao.execute(proposalId)).to.emit(dao, "executed");
//   });

//   it("Manager should receive amount for a successful execution of a proposal", async () => {
//     //make a proposal. From pro1 address
//     const tokenId = 0;
//     const amount = 1000;
//     const withdrawFundsFrom = 0;
//     const proposalProof = "Proposal proof";
//     const ownersRootHash = mogulDAOMerkleTree.getOwnersRootHash();
//     const tx = await dao
//       .connect(propertyManager)
//       .propose(
//         tokenId,
//         amount,
//         withdrawFundsFrom,
//         proposalProof,
//         ownersRootHash
//       );
//     //get the proposal Id
//     const proposalId = (await tx.wait()).events[0].args.proposalId;
//     //move the blocks to get past of voting delay
//     await moveBlocks(votingDelay + 1);
//     //try to cast a vote from owner1 address
//     const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(owner1.address);
//     await dao.connect(owner1).vote(proposalId, 1, ownerMerkleProof);

//     await moveBlocks(votingPeriod + 1);
//     const proposalManagerBalanceBefore = await provider.getBalance(
//       propertyManager.address
//     );
//     await expect(dao.execute(proposalId)).to.emit(dao, "executed");

//     const proposalManagerBalanceAfter = await provider.getBalance(
//       propertyManager.address
//     );

//     expect(proposalManagerBalanceAfter).to.equal(
//       proposalManagerBalanceBefore.add(BigNumber.from(amount))
//     );

//     //proposal should be deleted after proposal execution
//     const proposal = await dao.proposals(proposalId);
//     expect(proposal.amount).to.equal(BigNumber.from(0));
//     expect(proposal.proposalProof).to.equal("");
//   });

//   it("Manager should receive amount for a successful execution of a proposal(vacancy contract)", async () => {
//     //make a proposal. From pro1 address
//     const tokenId = 0;
//     const amount = 1000;
//     const withdrawFundsFrom = 1; //vacancy contract
//     const proposalProof = "Proposal proof";
//     const ownersRootHash = mogulDAOMerkleTree.getOwnersRootHash();
//     const tx = await dao
//       .connect(propertyManager)
//       .propose(
//         tokenId,
//         amount,
//         withdrawFundsFrom,
//         proposalProof,
//         ownersRootHash
//       );
//     //get the proposal Id
//     const proposalId = (await tx.wait()).events[0].args.proposalId;
//     //move the blocks to get past of voting delay
//     await moveBlocks(votingDelay + 1);
//     //try to cast a vote from owner1 address
//     const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(owner1.address);
//     await dao.connect(owner1).vote(proposalId, 1, ownerMerkleProof);

//     await moveBlocks(votingPeriod + 1);
//     const proposalManagerBalanceBefore = await provider.getBalance(
//       propertyManager.address
//     );
//     await expect(dao.execute(proposalId)).to.emit(dao, "executed");

//     const proposalManagerBalanceAfter = await provider.getBalance(
//       propertyManager.address
//     );

//     expect(proposalManagerBalanceAfter).to.equal(
//       proposalManagerBalanceBefore.add(BigNumber.from(amount))
//     );

//     //proposal should be deleted after proposal execution
//     const proposal = await dao.proposals(proposalId);
//     expect(proposal.amount).to.equal(BigNumber.from(0));
//     expect(proposal.proposalProof).to.equal("");
//   });

//   it("Manager should not receive amount for an unsuccessful execution of a proposal", async () => {
//     //make a proposal. From pro1 address
//     const tokenId = 0;
//     const amount = 1000;
//     const withdrawFundsFrom = 1;
//     const proposalProof = "Proposal proof";
//     const ownersRootHash = mogulDAOMerkleTree.getOwnersRootHash();
//     const tx = await dao
//       .connect(propertyManager)
//       .propose(
//         tokenId,
//         amount,
//         withdrawFundsFrom,
//         proposalProof,
//         ownersRootHash
//       );
//     //get the proposal Id
//     const proposalId = (await tx.wait()).events[0].args.proposalId;
//     //move the blocks to get past of voting delay
//     await moveBlocks(votingDelay + 1);
//     //try to cast a vote from owner1 address
//     const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(owner1.address);

//     //vote against the proposal
//     await dao.connect(owner1).vote(proposalId, 0, ownerMerkleProof);

//     await moveBlocks(votingPeriod + 1);
//     const proposalManagerBalanceBefore = await provider.getBalance(
//       propertyManager.address
//     );
//     await expect(dao.execute(proposalId)).to.emit(dao, "executed");

//     const proposalManagerBalanceAfter = await provider.getBalance(
//       propertyManager.address
//     );

//     expect(proposalManagerBalanceAfter).to.equal(proposalManagerBalanceBefore);

//     //proposal should be deleted after proposal execution
//     const proposal = await dao.proposals(proposalId);
//     expect(proposal.amount).to.equal(BigNumber.from(0));
//     expect(proposal.proposalProof).to.equal("");
//   });

//   it("should keep the proposal, if something went wrong on low level call to reserve contract", async () => {
//     //make a proposal. From pro1 address
//     const tokenId = 0;
//     //vacancy reserve contract has 1 ether . Request amount for 2 ether
//     const amount = ethers.utils.parseEther("2");
//     const withdrawFundsFrom = 1;
//     const proposalProof = "Proposal proof";
//     const ownersRootHash = mogulDAOMerkleTree.getOwnersRootHash();
//     const tx = await dao
//       .connect(propertyManager)
//       .propose(
//         tokenId,
//         amount,
//         withdrawFundsFrom,
//         proposalProof,
//         ownersRootHash
//       );
//     //get the proposal Id
//     const proposalId = (await tx.wait()).events[0].args.proposalId;
//     //move the blocks to get past of voting delay
//     await moveBlocks(votingDelay + 1);
//     //try to cast a vote from owner1 address
//     const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(owner1.address);

//     //vote for the proposal
//     await dao.connect(owner1).vote(proposalId, 1, ownerMerkleProof);

//     await moveBlocks(votingPeriod + 1);
//     const proposalManagerBalanceBefore = await provider.getBalance(
//       propertyManager.address
//     );

//     await expect(dao.execute(proposalId)).to.be.revertedWith(
//       "send to property manager failed"
//     );

//     // proposal should be there after proposal execution
//     const proposal = await dao.proposals(proposalId);
//     expect(proposal.amount).to.equal(amount);
//     expect(proposal.proposalProof).to.equal(proposalProof);
//   });
// });
