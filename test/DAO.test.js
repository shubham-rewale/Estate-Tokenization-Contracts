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
const provider = waffle.provider
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

  //In blocks
  const votingDelay = 10;
  const votingPeriod = 100;

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
    const owners = [propertyOwner1.address, propertyOwner2.address, propertyOwner3.address];
    mogulDAOMerkleTree = new MogulDAOMerkleTree(owners);
    Token = await ethers.getContractFactory("Token");
    MaintenanceReserve = await ethers.getContractFactory("MaintenanceReserve");
    VacancyReserve = await ethers.getContractFactory("VacancyReserve");
    RentalProperties = await ethers.getContractFactory("RentalProperties");
    DAOContract = await ethers.getContractFactory("DAO");
    //Deploy the token contract
    token = await upgrades.deployProxy(Token, [], {
      initializer: "initialize",
    },{ kind: "uups" });
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
  // describe("Reserve contracts ", function () {
  //  it("Reserve contracts should have balance that has sent to it", async () => {
    
  //   expect(await provider.getBalance(maintenanceReserve.address)).to.equal(
  //     ethers.utils.parseEther("0.5")
  //   );
  //   expect(await provider.getBalance(vacancyReserve.address)).to.equal(
  //     ethers.utils.parseEther("0.5")
  //   );
  // });


  // it("Only DAO contract should be able to forward funds from reserve contracts", async () => {
  //   await expect(
  //     maintenanceReserve.withdrawFromMaintenanceReserve(
  //       0,
  //       1000,
  //       propertyManager.address
  //     )
  //   ).to.be.revertedWith(
  //     "Withdraw function can only be called through DAO contract"
  //   );

  //   await expect(
  //     vacancyReserve.withdrawFromVacancyReserve(
  //       0,
  //       1000,
  //       propertyManager.address
  //     )
  //   ).to.be.revertedWith(
  //     "Withdraw function can only be called through DAO contract"
  //   );
  // });
  describe("Propose Function", function () {
    // it("Should not be able to call initialize after contract deployment", async () => {
    //   await expect(
    //     daoContract.initialize(votingDelay, votingPeriod, propertyManager.address)
    //   ).to.be.revertedWith("Initializable: contract is already initialized");
    // });

    it("Property Managers should be able to make a proposal", async () => {
      const tokenId = 0;
      const amount = 1000;
      // withdrawFundsFrom = 0 means withdraw funds from maintenance reserve , 1 means from withdraw funds from vacancy reserve
      const withdrawFundsFrom = 0;
      const proposalProof = "Proposal proof";
      const ownersRootHash = mogulDAOMerkleTree.getOwnersRootHash();
  
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
    });
  
  })
})
// });
