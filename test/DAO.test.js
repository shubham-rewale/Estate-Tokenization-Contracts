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
    Token = await ethers.getContractFactory("Token");
    MaintenanceReserve = await ethers.getContractFactory("MaintenanceReserve");
    VacancyReserve = await ethers.getContractFactory("VacancyReserve");
    RentalProperties = await ethers.getContractFactory("RentalProperties");
    DAOContract = await ethers.getContractFactory("DAO");
    //Deploy the token contract
    token = await upgrades.deployProxy(Token, [], {
      initializer: "initialize",
    });
    await token.deployed();
    console.log("token contract address", token.address);

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

    console.log(
      "maintenanceReserve contract address",
      maintenanceReserve.address
    );

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
    console.log("vacancyReserve contract address", vacancyReserve.address);

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
    console.log("rentalProperties contract address", rentalProperties.address);

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
    console.log("DAO  contract address", daoContract.address);

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
});
