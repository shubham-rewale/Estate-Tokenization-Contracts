const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("ethers");
const MogulDAOMarkleTree = require("../utils/markleTree");
const { moveBlocks } = require("../utils/helper");

//In blocks
const votingDelay = 10;
const votingPeriod = 100;
// const mogulDAOMarkleTree = new MogulDAOMarkleTree();
describe("Mogul DAO ", function () {
  let deployer;
  let propertyManager;
  let owner1;
  let owner2;
  let owner3;
  let addrs;
  let MockDAO;
  let mockDAO;
  let mogulDAOMarkleTree;
  beforeEach(async () => {
    [deployer, propertyManager, owner1, owner2, owner3, ...addrs] =
      await ethers.getSigners();
    const owners = [owner1.address, owner2.address, owner3.address];
    mogulDAOMarkleTree = new MogulDAOMarkleTree(owners);
    MockDAO = await ethers.getContractFactory("MockDAO");
    mockDAO = await upgrades.deployProxy(
      MockDAO,
      [votingDelay, votingPeriod, propertyManager.address],
      {
        initializer: "initialize",
      }
    );
    await mockDAO.deployed();
  });
  it("Deployer should be the owner of the contract", async () => {
    expect(await mockDAO.owner()).to.equal(deployer.address);
  });

  it("Property Managers should be able to make a proposal", async () => {
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const ownersRootHash = mogulDAOMarkleTree.getOwnersRootHash();

    //try to propose from deployer account
    await expect(
      mockDAO.propose(amount, proposalProof, ownersRootHash)
    ).to.be.revertedWith("Caller is not property manager");

    await expect(
      mockDAO
        .connect(propertyManager)
        .propose(amount, proposalProof, ownersRootHash)
    ).to.emit(mockDAO, "proposalInitiated");
  });

  it("Voters should wait for delay period before casting vote", async () => {
    //make a proposal.
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const ownersRootHash = mogulDAOMarkleTree.getOwnersRootHash();
    const tx = await mockDAO
      .connect(propertyManager)
      .propose(amount, proposalProof, ownersRootHash);
    //get the proposal Id
    const proposalId = (await tx.wait()).events[0].args.proposalId;
    //try to cast a vote from vot1 address
    const ownerMarkleProof = mogulDAOMarkleTree.getOwnerProof(owner1.address);
    await expect(
      mockDAO.connect(owner1).vote(proposalId, 1, ownerMarkleProof)
    ).to.be.revertedWith("Voting is not active");
  });

  it("Voters should be able to vote for a proposal", async () => {
    //make a proposal. From pro1 address
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const ownersRootHash = mogulDAOMarkleTree.getOwnersRootHash();
    const tx = await mockDAO
      .connect(propertyManager)
      .propose(amount, proposalProof, ownersRootHash);
    //get the proposal Id
    const proposalId = (await tx.wait()).events[0].args.proposalId;
    //move the blocks to get past of voting delay
    await moveBlocks(votingDelay + 1);
    //try to cast a vote from vot1 address
    const ownerMarkleProof = mogulDAOMarkleTree.getOwnerProof(owner1.address);
    await expect(
      mockDAO.connect(owner1).vote(proposalId, 1, ownerMarkleProof)
    ).to.emit(mockDAO, "voted");
  });
  it("Voters should not be able to vote twice for a proposal", async () => {
    //make a proposal. From pro1 address
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const ownersRootHash = mogulDAOMarkleTree.getOwnersRootHash();
    const tx = await mockDAO
      .connect(propertyManager)
      .propose(amount, proposalProof, ownersRootHash);
    //get the proposal Id
    const proposalId = (await tx.wait()).events[0].args.proposalId;
    //move the blocks to get past of voting delay
    await moveBlocks(votingDelay + 1);
    //try to cast a vote from owner1 address
    const ownerMarkleProof = mogulDAOMarkleTree.getOwnerProof(owner1.address);
    await mockDAO.connect(owner1).vote(proposalId, 1, ownerMarkleProof);
    //try to vote to the same proposal twice
    await expect(
      mockDAO.connect(owner1).vote(proposalId, 1, ownerMarkleProof)
    ).to.be.revertedWith("Cannot vote multiple times to the same proposal");
  });
  it("Only owner should be able to call the execute function", async () => {
    //make a proposal. From pro1 address
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const ownersRootHash = mogulDAOMarkleTree.getOwnersRootHash();
    const tx = await mockDAO
      .connect(propertyManager)
      .propose(amount, proposalProof, ownersRootHash);
    //get the proposal Id
    const proposalId = (await tx.wait()).events[0].args.proposalId;
    //move the blocks to get past of voting delay
    await moveBlocks(votingDelay + 1);
    //try to cast a vote from owner1 address
    const ownerMarkleProof = mogulDAOMarkleTree.getOwnerProof(owner1.address);
    await mockDAO.connect(owner1).vote(proposalId, 1, ownerMarkleProof);

    //Now try to execute from different account
    await expect(
      mockDAO.connect(propertyManager).execute(proposalId)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should not able to execute a proposal in its voting period", async () => {
    //make a proposal. From pro1 address
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const ownersRootHash = mogulDAOMarkleTree.getOwnersRootHash();
    const tx = await mockDAO
      .connect(propertyManager)
      .propose(amount, proposalProof, ownersRootHash);
    //get the proposal Id
    const proposalId = (await tx.wait()).events[0].args.proposalId;
    //move the blocks to get past of voting delay
    await moveBlocks(votingDelay + 1);
    //try to cast a vote from owner1 address
    const ownerMarkleProof = mogulDAOMarkleTree.getOwnerProof(owner1.address);
    await mockDAO.connect(owner1).vote(proposalId, 1, ownerMarkleProof);

    //try to execute
    await expect(mockDAO.execute(proposalId)).to.be.revertedWith(
      "Proposal is not in Execution state"
    );
  });
  it("deployer should be able to execute a proposal when it's in execution state", async () => {
    //make a proposal. From pro1 address
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const ownersRootHash = mogulDAOMarkleTree.getOwnersRootHash();
    const tx = await mockDAO
      .connect(propertyManager)
      .propose(amount, proposalProof, ownersRootHash);
    //get the proposal Id
    const proposalId = (await tx.wait()).events[0].args.proposalId;
    //move the blocks to get past of voting delay
    await moveBlocks(votingDelay + 1);
    //try to cast a vote from owner1 address
    const ownerMarkleProof = mogulDAOMarkleTree.getOwnerProof(owner1.address);
    await mockDAO.connect(owner1).vote(proposalId, 1, ownerMarkleProof);

    await moveBlocks(votingPeriod + 1);

    await expect(mockDAO.execute(proposalId)).to.emit(mockDAO, "executed");
  });
});
