const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
const { ethers, upgrades, waffle } = require("hardhat");
// const { BigNumber } = require("ethers");
const expect = chai.expect;
const helpers = require("@nomicfoundation/hardhat-network-helpers");
require("dotenv").config();
const MogulDAOMerkleTree = require("../utils/merkleTree");
const { moveBlocks } = require("../utils/helper");
const { BigNumber } = require("ethers");
const provider = waffle.provider;
describe("DAO Contract testcases", function () {
  let propertyManager;
  let DAOContract;
  let daoContract;
  let mogulPlatformOwnerAddress;
  let propertyOwner1;
  let propertyOwner2;
  let propertyOwner3;
  let tenant;
  let unauthorizedUserAddress;
  let mogulDAOMerkleTree;
  let Token;
  let MaintenanceReserve;
  let VacancyReserve;
  let RentalProperties;
  let token;
  let maintenanceReserve;
  let vacancyReserve;
  let rentalProperties;

  //-----------------------------------
  const tokenId = 0;
  const amount = ethers.utils.parseEther("0.1");
  // withdrawFundsFrom = 0 means withdraw funds from maintenance reserve , 1 means from withdraw funds from vacancy reserve
  const withdrawFundsFrom = 1;
  const proposalProof = "Proposal proof";
  let ownersRootHash;
  //---------------------------------

  //In blocks
  const votingDelay = BigNumber.from(10);
  const votingPeriod = BigNumber.from(100);

  beforeEach(async () => {
    [
      mogulPlatformOwnerAddress,
      propertyManager,
      propertyOwner1,
      propertyOwner2,
      propertyOwner3,
      unauthorizedUserAddress,
      tenant,
      ...addrs
    ] = await ethers.getSigners();
    const owners = [
      propertyOwner1.address,
      propertyOwner2.address,
      propertyOwner3.address,
    ];
    mogulDAOMerkleTree = new MogulDAOMerkleTree(owners);
    ownersRootHash = mogulDAOMerkleTree.getOwnersRootHash();
    Token = await ethers.getContractFactory("Token");
    MaintenanceReserve = await ethers.getContractFactory("MaintenanceReserve");
    VacancyReserve = await ethers.getContractFactory("VacancyReserve");
    RentalProperties = await ethers.getContractFactory("RentalProperties");
    DAOContract = await ethers.getContractFactory("DAO");
    //Deploy the token contract
    token = await upgrades.deployProxy(
      Token,
      [],
      {
        initializer: "initialize",
      },
      { kind: "uups" }
    );
    await token.deployed();
    // console.log("token contract address", token.address);

    //Deploy the maintenance reserve contract
    maintenanceReserve = await upgrades.deployProxy(
      MaintenanceReserve,
      [propertyManager.address],
      {
        initializer: "initialize",
      },
      { kind: "uups" }
    );
    await maintenanceReserve.deployed();

    // console.log(
    //   "maintenanceReserve contract address",
    //   maintenanceReserve.address
    // );

    //Deploy the vacancy reserve contract
    vacancyReserve = await upgrades.deployProxy(
      VacancyReserve,
      [propertyManager.address],
      {
        initializer: "initialize",
      },
      { kind: "uups" }
    );
    await vacancyReserve.deployed();
    // console.log("vacancyReserve contract address", vacancyReserve.address);

    //Deploy the rental properties contract
    rentalProperties = await upgrades.deployProxy(
      RentalProperties,
      [
        token.address,
        maintenanceReserve.address,
        vacancyReserve.address,
        propertyManager.address,
      ],
      {
        initializer: "initialize",
      },
      { kind: "uups" }
    );
    await rentalProperties.deployed();
    // console.log("rentalProperties contract address", rentalProperties.address);

    //Deploy the DAO contract
    daoContract = await upgrades.deployProxy(
      DAOContract,
      [votingDelay, votingPeriod, propertyManager.address],
      {
        initializer: "initialize",
      },
      { kind: "uups" }
    );
    await daoContract.deployed();
    // console.log("DAO  contract address", daoContract.address);

    //set the rentalProperties contract address in the maintenanceReserve contract
    await maintenanceReserve
      .connect(propertyManager)
      .setRentalPropertiesContractAddr(rentalProperties.address);
    //set the rentalProperties contract address in the vacancyReserve contract
    await vacancyReserve
      .connect(propertyManager)
      .setRentalPropertiesContractAddr(rentalProperties.address);
    //set the DAO contract address in the maintenanceReserve contract
    await maintenanceReserve
      .connect(propertyManager)
      .setDAOContractAddr(daoContract.address);
    //set the DAO contract address in the vacancyReserve contract
    await vacancyReserve
      .connect(propertyManager)
      .setDAOContractAddr(daoContract.address);

    //set the maintenanceReserve contract address in the DAO contract
    await daoContract
      .connect(mogulPlatformOwnerAddress)
      .setMaintenanceReserveAddress(maintenanceReserve.address);
    //set the vacancyReserve contract address in the DAO contract
    await daoContract
      .connect(mogulPlatformOwnerAddress)
      .setVacancyReserveAddress(vacancyReserve.address);

    //mint a token
    await token
      .connect(mogulPlatformOwnerAddress)
      .mintNewPropertyToken("xyz", 100, propertyOwner1.address);
    //tranfer 20 token to owner 2
    await token
      .connect(propertyOwner1)
      .safeTransferFrom(
        propertyOwner1.address,
        propertyOwner2.address,
        0,
        30,
        "0x"
      );
    //transfer 15 token to owner 3
    await token
      .connect(propertyOwner1)
      .safeTransferFrom(
        propertyOwner1.address,
        propertyOwner3.address,
        0,
        20,
        "0x"
      );
    await rentalProperties
      .connect(propertyManager)
      .enterRentalPropertyDetails(
        0,
        ethers.utils.parseEther("0.5"),
        ethers.utils.parseEther("0.5")
      );
    await rentalProperties
      .connect(propertyManager)
      .initiateRentalPeriod(
        0,
        tenant.address,
        10,
        ethers.utils.parseEther("0.5"),
        ethers.utils.parseEther("0.5"),
        { value: ethers.utils.parseEther("2") }
      );
  });
  describe("testing of owner function", function () {
    it("Deployer should be the owner of the DAO contract", async () => {
      expect(await daoContract.owner()).to.equal(
        mogulPlatformOwnerAddress.address
      );
    });
  });
  describe("initialize Function", function () {
    it("Should not be able to call initialize after contract deployment", async () => {
      await expect(
        daoContract.initialize(
          votingDelay,
          votingPeriod,
          propertyManager.address
        )
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });
  });

  describe("Propose Function", function () {
    it("Property Managers should be able to make a proposal", async () => {
      //try to propose from deployer account
      await expect(
        daoContract.propose(
          tokenId,
          amount,
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        )
      ).to.be.revertedWith("Caller is not property manager");
    });

    it(" Amount should be greater than 0", async () => {
      await expect(
        daoContract
          .connect(propertyManager)
          .propose(tokenId, 0, withdrawFundsFrom, proposalProof, ownersRootHash)
      ).to.be.revertedWith("Amount should be greater than 0");
    });

    it("proposalProof cannot be empty", async () => {
      await expect(
        daoContract
          .connect(propertyManager)
          .propose(tokenId, amount, withdrawFundsFrom, "", ownersRootHash)
      ).to.be.revertedWith("proposalProof cannot be empty");
    });
    it("Root hash cannot be empty", async () => {
      await expect(
        daoContract
          .connect(propertyManager)
          .propose(
            tokenId,
            amount,
            withdrawFundsFrom,
            proposalProof,
            ethers.constants.HashZero
          )
      ).to.be.revertedWith("Root hash cannot be empty");
    });
    it("it should emit proposalInitiated event in case of successful proposal creation", async () => {
      await expect(
        daoContract
          .connect(propertyManager)
          .propose(
            tokenId,
            amount,
            withdrawFundsFrom,
            proposalProof,
            ownersRootHash
          )
      ).to.emit(daoContract, "proposalInitiated");
      // .withArgs(BigNumber.from(0),
      //   tokenId,
      //   withdrawFundsFrom,
      //   await provider.getBlockNumber(),
      //   votingDelay.add(await provider.getBlockNumber()),
      //   (votingPeriod.add(votingDelay)).add(await provider.getBlockNumber()))
      let result = await daoContract.getProposalState(0);
      expect(result).to.equal(BigNumber.from(0));
    });
  });
  describe("editProposal function testcases", function () {
    it("Property Managers should be able to make a proposal", async () => {
      await daoContract
        .connect(propertyManager)
        .propose(
          tokenId,
          amount,
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        );
      //try to propose from deployer account
      await expect(
        daoContract.editProposal(
          0,
          tokenId,
          ethers.utils.parseEther("1.5"),
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        )
      ).to.be.revertedWith("Caller is not property manager");
    });
    it("Property Managers should not be able to edit a proposal if it is not in pending state", async () => {
      await daoContract
        .connect(propertyManager)
        .propose(
          tokenId,
          amount,
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        );
      await moveBlocks(votingDelay + 1);
      await expect(
        daoContract
          .connect(propertyManager)
          .editProposal(
            0,
            tokenId,
            ethers.utils.parseEther("1.5"),
            withdrawFundsFrom,
            proposalProof,
            ownersRootHash
          )
      ).to.be.revertedWith("Proposal not in pending state");
    });
    it("Amount should be greater than 0", async () => {
      await daoContract
        .connect(propertyManager)
        .propose(
          tokenId,
          amount,
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        );
      await expect(
        daoContract
          .connect(propertyManager)
          .editProposal(
            0,
            tokenId,
            0,
            withdrawFundsFrom,
            proposalProof,
            ownersRootHash
          )
      ).to.be.revertedWith("Amount should be greater than 0");
    });
    it("proposalProof cannot be empty", async () => {
      await daoContract
        .connect(propertyManager)
        .propose(
          tokenId,
          amount,
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        );
      await expect(
        daoContract
          .connect(propertyManager)
          .editProposal(
            0,
            tokenId,
            amount,
            withdrawFundsFrom,
            "",
            ownersRootHash
          )
      ).to.be.revertedWith("proposalProof cannot be empty");
    });
    it("Root hash cannot be empty", async () => {
      await daoContract
        .connect(propertyManager)
        .propose(
          tokenId,
          amount,
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        );
      await expect(
        daoContract
          .connect(propertyManager)
          .editProposal(
            0,
            tokenId,
            amount,
            withdrawFundsFrom,
            proposalProof,
            ethers.constants.HashZero
          )
      ).to.be.revertedWith("Root hash cannot be empty");
    });
    it("It should emit proposalEdited event in case of successful edition", async () => {
      await daoContract
        .connect(propertyManager)
        .propose(
          tokenId,
          amount,
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        );
      await expect(
        daoContract
          .connect(propertyManager)
          .editProposal(
            0,
            tokenId,
            ethers.utils.parseEther("1.5"),
            withdrawFundsFrom,
            proposalProof,
            ownersRootHash
          )
      )
        .to.emit(daoContract, "proposalEdited")
        .withArgs(0, 0);
    });
  });
  describe("Vote function test cases", function () {
    it("Only whitelisted user should be able to call Vote function", async () => {
      const tx = await daoContract
        .connect(propertyManager)
        .propose(
          tokenId,
          amount,
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        );

      //get the proposal Id
      const proposalId = (await tx.wait()).events[0].args.proposalId;
      //move the blocks to get past of voting delay
      await moveBlocks(votingDelay + 1);
      //try to cast a vote from vot1 address
      const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(
        propertyOwner1.address
      );
      await expect(
        daoContract
          .connect(propertyManager)
          .vote(proposalId, 1, ownerMerkleProof)
      ).to.be.revertedWith("Invalid proof .Voter is not whitelisted");
    });
    it("whitelisted user can vote only when voting is active", async () => {
      const tx = await daoContract
        .connect(propertyManager)
        .propose(
          tokenId,
          amount,
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        );

      //get the proposal Id
      const proposalId = (await tx.wait()).events[0].args.proposalId;
      //try to cast a vote from vot1 address
      const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(
        propertyOwner1.address
      );
      await expect(
        daoContract
          .connect(propertyOwner1)
          .vote(proposalId, 1, ownerMerkleProof)
      ).to.be.revertedWith("Voting is not active");
    });
    it("voting id can ve 0 or 1 or 2", async () => {
      const tx = await daoContract
        .connect(propertyManager)
        .propose(
          tokenId,
          amount,
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        );

      //get the proposal Id
      const proposalId = (await tx.wait()).events[0].args.proposalId;
      //move the blocks to get past of voting delay
      await moveBlocks(votingDelay + 1);
      //try to cast a vote from vot1 address
      const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(
        propertyOwner1.address
      );
      await expect(
        daoContract
          .connect(propertyOwner1)
          .vote(proposalId, 3, ownerMerkleProof)
      ).to.be.revertedWith("Invalid vote id");
    });
    it("A user can vote only once for particular proposal", async () => {
      const tx = await daoContract
        .connect(propertyManager)
        .propose(
          tokenId,
          amount,
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        );

      //get the proposal Id
      const proposalId = (await tx.wait()).events[0].args.proposalId;
      //move the blocks to get past of voting delay
      await moveBlocks(votingDelay + 1);
      //try to cast a vote from vot1 address
      const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(
        propertyOwner1.address
      );
      await daoContract
        .connect(propertyOwner1)
        .vote(proposalId, 1, ownerMerkleProof);
      await expect(
        daoContract
          .connect(propertyOwner1)
          .vote(proposalId, 1, ownerMerkleProof)
      ).to.be.revertedWith("Cannot vote multiple times to the same proposal");
    });
    it("It should emit voted event in case of successful voting", async () => {
      const tx = await daoContract
        .connect(propertyManager)
        .propose(
          tokenId,
          amount,
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        );

      //get the proposal Id
      const proposalId = (await tx.wait()).events[0].args.proposalId;
      //move the blocks to get past of voting delay
      await moveBlocks(votingDelay + 1);
      //try to cast a vote from vot1 address
      const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(
        propertyOwner1.address
      );
      await expect(
        daoContract
          .connect(propertyOwner1)
          .vote(proposalId, 1, ownerMerkleProof)
      )
        .to.emit(daoContract, "voted")
        .withArgs(proposalId, 1, propertyOwner1.address);
    });
  });
  describe("execute function testcases", function () {
    it("Only owner can call execute function", async () => {
      const tx = await daoContract
        .connect(propertyManager)
        .propose(
          tokenId,
          amount,
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        );
      //get the proposal Id
      const proposalId = (await tx.wait()).events[0].args.proposalId;
      //move the blocks to get past of voting delay
      await moveBlocks(votingDelay + 1);
      //try to cast a vote from vot1 address
      const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(
        propertyOwner1.address
      );
      await daoContract
        .connect(propertyOwner1)
        .vote(proposalId, 1, ownerMerkleProof);
      //move the blocks to get past of voting period
      await moveBlocks(votingPeriod + 1);
      await expect(
        daoContract.connect(propertyManager).execute(proposalId)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("owner can call execute function only if Proposal is  in Execution state", async () => {
      const tx = await daoContract
        .connect(propertyManager)
        .propose(
          tokenId,
          amount,
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        );
      //get the proposal Id
      const proposalId = (await tx.wait()).events[0].args.proposalId;
      //move the blocks to get past of voting delay
      await moveBlocks(votingDelay + 1);
      //try to cast a vote from vot1 address
      const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(
        propertyOwner1.address
      );
      await daoContract
        .connect(propertyOwner1)
        .vote(proposalId, 1, ownerMerkleProof);
      await expect(
        daoContract.connect(mogulPlatformOwnerAddress).execute(proposalId)
      ).to.be.revertedWith("Proposal is not in Execution state");
    });
    it("It should emit executed in case of successful execution", async () => {
      const tx = await daoContract
        .connect(propertyManager)
        .propose(
          tokenId,
          amount,
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        );
      //get the proposal Id
      const proposalId = (await tx.wait()).events[0].args.proposalId;
      //move the blocks to get past of voting delay
      await moveBlocks(votingDelay + 1);
      //try to cast a vote from vot1 address
      const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(
        propertyOwner1.address
      );
      await daoContract
        .connect(propertyOwner1)
        .vote(proposalId, 1, ownerMerkleProof);
      //move the blocks to get past of voting period
      await moveBlocks(votingPeriod + 1);
      await expect(
        daoContract.connect(mogulPlatformOwnerAddress).execute(proposalId)
      )
        .to.emit(daoContract, "executed")
        .withArgs(proposalId);
    });
    it("proposal details should be cleared in case of successful execution", async () => {
      const tx = await daoContract
        .connect(propertyManager)
        .propose(
          tokenId,
          amount,
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        );
      //get the proposal Id
      const proposalId = (await tx.wait()).events[0].args.proposalId;
      //move the blocks to get past of voting delay
      await moveBlocks(votingDelay + 1);
      //try to cast a vote from vot1 address
      const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(
        propertyOwner1.address
      );
      await daoContract
        .connect(propertyOwner1)
        .vote(proposalId, 1, ownerMerkleProof);
      //move the blocks to get past of voting period
      await moveBlocks(votingPeriod + 1);
      await daoContract.connect(mogulPlatformOwnerAddress).execute(proposalId);
      const proposal = await daoContract.proposals(proposalId);
      expect(proposal.amount).to.equal(BigNumber.from(0));
      expect(proposal.proposalProof).to.equal("");
    });
    it("propery manager should receive proposed amount in case of successful execution", async () => {
      const tx = await daoContract
        .connect(propertyManager)
        .propose(
          tokenId,
          amount,
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        );
      //get the proposal Id
      const proposalId = (await tx.wait()).events[0].args.proposalId;
      //move the blocks to get past of voting delay
      await moveBlocks(votingDelay + 1);
      //try to cast a vote from vot1 address
      const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(
        propertyOwner1.address
      );
      await daoContract
        .connect(propertyOwner1)
        .vote(proposalId, 1, ownerMerkleProof);
      //move the blocks to get past of voting period
      await moveBlocks(votingPeriod + 1);
      const proposalManagerBalanceBefore = await provider.getBalance(
        propertyManager.address
      );
      await daoContract.connect(mogulPlatformOwnerAddress).execute(proposalId);
      const proposalManagerBalanceAfter = await provider.getBalance(
        propertyManager.address
      );
      expect(proposalManagerBalanceAfter).to.equal(
        proposalManagerBalanceBefore.add(BigNumber.from(amount))
      );
    });
    it("should keep the proposal, if something went wrong during transfer funds from reserve contract", async () => {
      const tx = await daoContract
        .connect(propertyManager)
        .propose(
          tokenId,
          ethers.utils.parseEther("0.6"),
          withdrawFundsFrom,
          proposalProof,
          ownersRootHash
        );

      //get the proposal Id
      const proposalId = (await tx.wait()).events[0].args.proposalId;
      //move the blocks to get past of voting delay
      await moveBlocks(votingDelay + 1);
      //try to cast a vote from vot1 address
      const ownerMerkleProof = mogulDAOMerkleTree.getOwnerProof(
        propertyOwner1.address
      );
      await daoContract
        .connect(propertyOwner1)
        .vote(proposalId, 1, ownerMerkleProof);
      //move the blocks to get past of voting period
      await moveBlocks(votingPeriod + 1);
      await expect(
        daoContract.connect(mogulPlatformOwnerAddress).execute(proposalId)
      ).to.be.revertedWith("Not enough funds in the Vacancy reserve");
      // proposal should be there after proposal execution
      const proposal = await daoContract.proposals(proposalId);
      expect(proposal.amount).to.equal(ethers.utils.parseEther("0.6"));
      expect(proposal.proposalProof).to.equal(proposalProof);
    });
  });
});
