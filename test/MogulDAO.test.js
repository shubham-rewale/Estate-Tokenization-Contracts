const { expect } = require("chai");
const { ethers, upgrades, waffle } = require("hardhat");
const { BigNumber } = require("ethers");
const MogulDAOMarkleTree = require("../utils/markleTree");
const { moveBlocks } = require("../utils/helper");

const provider = waffle.provider;

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
  let MockReserveContract;
  let mockReserveContract;
  let mogulDAOMarkleTree;
  beforeEach(async () => {
    [deployer, propertyManager, owner1, owner2, owner3, ...addrs] =
      await ethers.getSigners();
    const owners = [owner1.address, owner2.address, owner3.address];
    mogulDAOMarkleTree = new MogulDAOMarkleTree(owners);
    MockDAO = await ethers.getContractFactory("MockDAO");
    MockReserveContract = await ethers.getContractFactory(
      "MockReserveContract"
    );

    //Deploy the DAO contract
    mockDAO = await upgrades.deployProxy(
      MockDAO,
      [votingDelay, votingPeriod, propertyManager.address],
      {
        initializer: "initialize",
      },
      { kind: "uups" }
    );
    await mockDAO.deployed();

    /** Deploy the reserve contract  */
    mockReserveContract = await upgrades.deployProxy(
      MockReserveContract,
      [mockDAO.address],
      { initializer: "initialize" },
      {
        kind: "uups",
      }
    );
    await mockReserveContract.deployed();

    //Send some ethers to the reserve contract from deployer account
    await deployer.sendTransaction({
      to: mockReserveContract.address,
      value: ethers.utils.parseEther("1.0"),
    });

    //set the reserve contract address in the DAO contract
    await mockDAO.setResrveContractAddress(mockReserveContract.address);
  });
  it("Deployer should be the owner of DAO the contract", async () => {
    expect(await mockDAO.owner()).to.equal(deployer.address);
  });

  it("Reserve contract should have balance that has sent to it", async () => {
    expect(await mockReserveContract.balanceOf()).to.equal(
      ethers.utils.parseEther("1.0")
    );
  });

  it("Only DAO contract can call withdrawFromMaintenanceReserve to forward funds", async () => {
    await expect(
      mockReserveContract.withdrawFromMaintenanceReserve(
        0,
        1000,
        propertyManager.address
      )
    ).to.be.revertedWith(
      "Only DAO contract can call withdrawFromMaintenanceReserve"
    );
  });

  it("Should not be call initialize after contract deployment", async () => {
    await expect(
      mockDAO.initialize(votingDelay, votingPeriod, propertyManager.address)
    ).to.be.revertedWith("Initializable: contract is already initialized");
  });

  it("Property Managers should be able to make a proposal", async () => {
    const tokenId = 0;
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const ownersRootHash = mogulDAOMarkleTree.getOwnersRootHash();

    //try to propose from deployer account
    await expect(
      mockDAO.propose(tokenId, amount, proposalProof, ownersRootHash)
    ).to.be.revertedWith("Caller is not property manager");

    await expect(
      mockDAO
        .connect(propertyManager)
        .propose(tokenId, amount, proposalProof, ownersRootHash)
    ).to.emit(mockDAO, "proposalInitiated");
  });

  it("Voters should wait for delay period before casting vote", async () => {
    //make a proposal.
    const tokenId = 0;
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const ownersRootHash = mogulDAOMarkleTree.getOwnersRootHash();
    const tx = await mockDAO
      .connect(propertyManager)
      .propose(tokenId, amount, proposalProof, ownersRootHash);
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
    const tokenId = 0;
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const ownersRootHash = mogulDAOMarkleTree.getOwnersRootHash();
    const tx = await mockDAO
      .connect(propertyManager)
      .propose(tokenId, amount, proposalProof, ownersRootHash);
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
    const tokenId = 0;
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const ownersRootHash = mogulDAOMarkleTree.getOwnersRootHash();
    const tx = await mockDAO
      .connect(propertyManager)
      .propose(tokenId, amount, proposalProof, ownersRootHash);
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
    const tokenId = 0;
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const ownersRootHash = mogulDAOMarkleTree.getOwnersRootHash();
    const tx = await mockDAO
      .connect(propertyManager)
      .propose(tokenId, amount, proposalProof, ownersRootHash);
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
    const tokenId = 0;
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const ownersRootHash = mogulDAOMarkleTree.getOwnersRootHash();
    const tx = await mockDAO
      .connect(propertyManager)
      .propose(tokenId, amount, proposalProof, ownersRootHash);
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
    const tokenId = 0;
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const ownersRootHash = mogulDAOMarkleTree.getOwnersRootHash();
    const tx = await mockDAO
      .connect(propertyManager)
      .propose(tokenId, amount, proposalProof, ownersRootHash);
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

  it("Manager should receive amount for a successful execution of a proposal", async () => {
    //make a proposal. From pro1 address
    const tokenId = 0;
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const ownersRootHash = mogulDAOMarkleTree.getOwnersRootHash();
    const tx = await mockDAO
      .connect(propertyManager)
      .propose(tokenId, amount, proposalProof, ownersRootHash);
    //get the proposal Id
    const proposalId = (await tx.wait()).events[0].args.proposalId;
    //move the blocks to get past of voting delay
    await moveBlocks(votingDelay + 1);
    //try to cast a vote from owner1 address
    const ownerMarkleProof = mogulDAOMarkleTree.getOwnerProof(owner1.address);
    await mockDAO.connect(owner1).vote(proposalId, 1, ownerMarkleProof);

    await moveBlocks(votingPeriod + 1);
    const proposalManagerBalanceBefore = await provider.getBalance(
      propertyManager.address
    );
    await expect(mockDAO.execute(proposalId)).to.emit(mockDAO, "executed");

    const proposalManagerBalanceAfter = await provider.getBalance(
      propertyManager.address
    );

    expect(proposalManagerBalanceAfter).to.equal(
      proposalManagerBalanceBefore.add(BigNumber.from(amount))
    );

    //proposal should be deleted after proposal execution
    const proposal = await mockDAO.proposals(proposalId);
    expect(proposal.amount).to.equal(BigNumber.from(0));
    expect(proposal.proposalProof).to.equal("");
  });

  it("Manager should not receive amount for an unsuccessful execution of a proposal", async () => {
    //make a proposal. From pro1 address
    const tokenId = 0;
    const amount = 1000;
    const proposalProof = "Proposal proof";
    const ownersRootHash = mogulDAOMarkleTree.getOwnersRootHash();
    const tx = await mockDAO
      .connect(propertyManager)
      .propose(tokenId, amount, proposalProof, ownersRootHash);
    //get the proposal Id
    const proposalId = (await tx.wait()).events[0].args.proposalId;
    //move the blocks to get past of voting delay
    await moveBlocks(votingDelay + 1);
    //try to cast a vote from owner1 address
    const ownerMarkleProof = mogulDAOMarkleTree.getOwnerProof(owner1.address);

    //vote against the proposal
    await mockDAO.connect(owner1).vote(proposalId, 0, ownerMarkleProof);

    await moveBlocks(votingPeriod + 1);
    const proposalManagerBalanceBefore = await provider.getBalance(
      propertyManager.address
    );
    await expect(mockDAO.execute(proposalId)).to.emit(mockDAO, "executed");

    const proposalManagerBalanceAfter = await provider.getBalance(
      propertyManager.address
    );

    expect(proposalManagerBalanceAfter).to.equal(proposalManagerBalanceBefore);

    //proposal should be deleted after proposal execution
    const proposal = await mockDAO.proposals(proposalId);
    expect(proposal.amount).to.equal(BigNumber.from(0));
    expect(proposal.proposalProof).to.equal("");
  });

  it("should keep the proposal, if something went wrong on low level call to reserve contract", async () => {
    //make a proposal. From pro1 address
    const tokenId = 0;
    //reserve contract has 1 ether . Request amount for 2 ether
    const amount = ethers.utils.parseEther("2");
    const proposalProof = "Proposal proof";
    const ownersRootHash = mogulDAOMarkleTree.getOwnersRootHash();
    const tx = await mockDAO
      .connect(propertyManager)
      .propose(tokenId, amount, proposalProof, ownersRootHash);
    //get the proposal Id
    const proposalId = (await tx.wait()).events[0].args.proposalId;
    //move the blocks to get past of voting delay
    await moveBlocks(votingDelay + 1);
    //try to cast a vote from owner1 address
    const ownerMarkleProof = mogulDAOMarkleTree.getOwnerProof(owner1.address);

    //vote for the proposal
    await mockDAO.connect(owner1).vote(proposalId, 1, ownerMarkleProof);

    await moveBlocks(votingPeriod + 1);
    const proposalManagerBalanceBefore = await provider.getBalance(
      propertyManager.address
    );

    await expect(mockDAO.execute(proposalId)).to.be.revertedWith(
      "send to property manager failed"
    );

    // proposal should be there after proposal execution
    const proposal = await mockDAO.proposals(proposalId);
    expect(proposal.amount).to.equal(amount);
    expect(proposal.proposalProof).to.equal(proposalProof);
  });
});