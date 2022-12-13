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
  let pro1;
  let pro2;
  let pro3;
  let vot1;
  let vot2;
  let vot3;
  let addrs;
  let MockDAO;
  let mockDAO;
  let mogulDAOMarkleTree;
  beforeEach(async () => {
    [deployer, pro1, pro2, pro3, vot1, vot2, vot3, ...addrs] =
      await ethers.getSigners();
    const proposers = [pro1.address, pro2.address, pro3.address];
    const voters = [vot1.address, vot2.address, vot3.address];
    mogulDAOMarkleTree = new MogulDAOMarkleTree(proposers, voters);
    MockDAO = await ethers.getContractFactory("MockDAO");
    mockDAO = await upgrades.deployProxy(
      MockDAO,
      [votingDelay, votingPeriod, mogulDAOMarkleTree.getProposersRootHash()],
      {
        initializer: "initialize",
      }
    );
    await mockDAO.deployed();
  });
  it("Deployer should be the owner of the contract", async () => {
    expect(await mockDAO.owner()).to.equal(deployer.address);
  });

  it("Non proposers should not be able to propose a proposal", async () => {
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const votersRootHash = mogulDAOMarkleTree.getVotersRootHash();
    const proposerMarkleProof = mogulDAOMarkleTree.getProposerProof(
      vot1.address
    );

    await expect(
      mockDAO
        .connect(vot1)
        .propose(amount, proposalProof, votersRootHash, proposerMarkleProof)
    ).to.be.revertedWith("Invalid proof .Proposer is not whitelisted");
  });

  it("Proposers should be able to make a proposal", async () => {
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const votersRootHash = mogulDAOMarkleTree.getVotersRootHash();
    const proposerMarkleProof = mogulDAOMarkleTree.getProposerProof(
      pro1.address
    );

    await expect(
      mockDAO
        .connect(pro1)
        .propose(amount, proposalProof, votersRootHash, proposerMarkleProof)
    ).to.emit(mockDAO, "proposalInitiated");
  });

  it("Voters should wait for delay period before casting vote", async () => {
    //make a proposal. From pro1 address
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const votersRootHash = mogulDAOMarkleTree.getVotersRootHash();
    const proposerMarkleProof = mogulDAOMarkleTree.getProposerProof(
      pro1.address
    );
    const tx = await mockDAO
      .connect(pro1)
      .propose(amount, proposalProof, votersRootHash, proposerMarkleProof);
    //get the proposal Id
    const proposalId = (await tx.wait()).events[0].args.proposalId;
    //try to cast a vote from vot1 address
    const voterMarkleProof = mogulDAOMarkleTree.getVoterProof(vot1.address);
    await expect(
      mockDAO.connect(vot1).vote(proposalId, 1, voterMarkleProof)
    ).to.be.revertedWith("Voting is not active");
  });

  it("Voters should be able to vote for a proposal", async () => {
    //make a proposal. From pro1 address
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const votersRootHash = mogulDAOMarkleTree.getVotersRootHash();
    const proposerMarkleProof = mogulDAOMarkleTree.getProposerProof(
      pro1.address
    );
    const tx = await mockDAO
      .connect(pro1)
      .propose(amount, proposalProof, votersRootHash, proposerMarkleProof);
    //get the proposal Id
    const proposalId = (await tx.wait()).events[0].args.proposalId;
    //move the blocks to get past of voting delay
    await moveBlocks(votingDelay + 1);
    //try to cast a vote from vot1 address
    const voterMarkleProof = mogulDAOMarkleTree.getVoterProof(vot1.address);
    await expect(
      mockDAO.connect(vot1).vote(proposalId, 1, voterMarkleProof)
    ).to.emit(mockDAO, "voted");
  });
  it("Voters should not be able to vote twice for a proposal", async () => {
    //make a proposal. From pro1 address
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const votersRootHash = mogulDAOMarkleTree.getVotersRootHash();
    const proposerMarkleProof = mogulDAOMarkleTree.getProposerProof(
      pro1.address
    );
    const tx = await mockDAO
      .connect(pro1)
      .propose(amount, proposalProof, votersRootHash, proposerMarkleProof);
    //get the proposal Id
    const proposalId = (await tx.wait()).events[0].args.proposalId;
    //move the blocks to get past of voting delay
    await moveBlocks(votingDelay + 1);
    //try to cast a vote from vot1 address
    const voterMarkleProof = mogulDAOMarkleTree.getVoterProof(vot1.address);
    await mockDAO.connect(vot1).vote(proposalId, 1, voterMarkleProof);

    //try to vote to the same proposal twice
    await expect(
      mockDAO.connect(vot1).vote(proposalId, 1, voterMarkleProof)
    ).to.be.revertedWith("Cannot vote multiple times to the same proposal");
  });
  it("Only owner should be able to call the execute function", async () => {
    //make a proposal. From pro1 address
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const votersRootHash = mogulDAOMarkleTree.getVotersRootHash();
    const proposerMarkleProof = mogulDAOMarkleTree.getProposerProof(
      pro1.address
    );
    const tx = await mockDAO
      .connect(pro1)
      .propose(amount, proposalProof, votersRootHash, proposerMarkleProof);
    //get the proposal Id
    const proposalId = (await tx.wait()).events[0].args.proposalId;
    //move the blocks to get past of voting delay
    await moveBlocks(votingDelay + 1);
    //cast a vote from vot1 address
    const voterMarkleProof = mogulDAOMarkleTree.getVoterProof(vot1.address);
    await mockDAO.connect(vot1).vote(proposalId, 1, voterMarkleProof);

    //Now try to execute from different account
    await expect(mockDAO.connect(pro1).execute(proposalId)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });
  it("Should not able to execute a proposal in its voting period", async () => {
    //make a proposal. From pro1 address
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const votersRootHash = mogulDAOMarkleTree.getVotersRootHash();
    const proposerMarkleProof = mogulDAOMarkleTree.getProposerProof(
      pro1.address
    );
    const tx = await mockDAO
      .connect(pro1)
      .propose(amount, proposalProof, votersRootHash, proposerMarkleProof);
    //get the proposal Id
    const proposalId = (await tx.wait()).events[0].args.proposalId;
    //move the blocks to get past of voting delay
    await moveBlocks(votingDelay + 1);
    //cast a vote from vot1 address
    const voterMarkleProof = mogulDAOMarkleTree.getVoterProof(vot1.address);
    await mockDAO.connect(vot1).vote(proposalId, 1, voterMarkleProof);

    //try to execute
    await expect(mockDAO.execute(proposalId)).to.be.revertedWith(
      "Proposal is not in Execution state"
    );
  });
  it("deployer should be able to execute a proposal when it's in execution state", async () => {
    //make a proposal. From pro1 address
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const votersRootHash = mogulDAOMarkleTree.getVotersRootHash();
    const proposerMarkleProof = mogulDAOMarkleTree.getProposerProof(
      pro1.address
    );
    const tx = await mockDAO
      .connect(pro1)
      .propose(amount, proposalProof, votersRootHash, proposerMarkleProof);
    //get the proposal Id
    const proposalId = (await tx.wait()).events[0].args.proposalId;
    //move the blocks to get past of voting delay
    await moveBlocks(votingDelay + 1);
    //cast a vote from vot1 address
    const voterMarkleProof = mogulDAOMarkleTree.getVoterProof(vot1.address);
    await mockDAO.connect(vot1).vote(proposalId, 1, voterMarkleProof);

    await moveBlocks(votingPeriod + 1);

    await expect(mockDAO.execute(proposalId)).to.emit(mockDAO, "executed");
  });
});

/**
 * https://forum.openzeppelin.com/t/openzeppelin-upgrades-step-by-step-tutorial-for-hardhat/3580
 * 
 * 
 * 
 * describe('Box (proxy)', function () {
  beforeEach(async function () {
    Box = await ethers.getContractFactory("Box");
    box = await upgrades.deployProxy(Box, [42], {initializer: 'store'});
  });
 
  // Test case
  it('retrieve returns a value previously initialized', async function () {
    // Test if the returned value is the same one
    // Note that we need to use strings to compare the 256 bit integers
    expect((await box.retrieve()).toString()).to.equal('42');
  });
});
 */
