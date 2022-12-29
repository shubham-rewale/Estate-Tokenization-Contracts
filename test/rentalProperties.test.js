const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("ethers");
const expect = chai.expect;
const helpers = require("@nomicfoundation/hardhat-network-helpers");
require("dotenv").config();

describe("Test Cases For Property Rental in Estate Tokenisation", function () {
  let propertyManager;
  let propertyOwner1;
  let propertyOwner2;
  let propertyOwner3;
  let mogulPlatformOwnerAddress;
  let Token;
  let MaintenanceReserve;
  let VacancyReserve;
  let RentalProperties;
  let token;
  let maintenanceReserve;
  let vacancyReserve;
  let rentalProperties;

  beforeEach(async () => {
    [
      mogulPlatformOwnerAddress,
      propertyOwner1,
      propertyOwner2,
      propertyOwner3,
      propertyManager,
      tenant,
      ...addrs
    ] = await ethers.getSigners();
    const owners = [
      propertyOwner1.address,
      propertyOwner2.address,
      propertyOwner3.address,
    ];

    Token = await ethers.getContractFactory("Token");
    MaintenanceReserve = await ethers.getContractFactory("MaintenanceReserve");
    VacancyReserve = await ethers.getContractFactory("VacancyReserve");
    RentalProperties = await ethers.getContractFactory("RentalProperties");

    //Deploy the token contract
    token = await upgrades.deployProxy(Token, [], {
      initializer: "initialize",
    });
    await token.deployed();


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
  

    //set the rentalProperties contract address in the maintenanceReserve contract
    await maintenanceReserve
      .connect(propertyManager)
      .setRentalPropertiesContractAddr(rentalProperties.address);
    //set the rentalProperties contract address in the vacancyReserve contract
    await vacancyReserve
      .connect(propertyManager)
      .setRentalPropertiesContractAddr(rentalProperties.address);

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
  });

  describe("enterRentalPropertyDetails testcases", function () {
    it("Only property manager should be able to call this function", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500, 500);
      let propertyStatus = await rentalProperties.getPropertyStatus(0);
      expect(await propertyStatus[0]).to.equal("Property is currently vacant");
    });
    it("user other than property manager should not be able to enter the details of rental property", async () => {
      await expect(
        rentalProperties
          .connect(propertyOwner1)
          .enterRentalPropertyDetails(0, 500, 500)
      ).to.be.revertedWith("Caller is not the Property Manager");
    });
    it("property manager should not be able to enter the details of rental property for a non existing property", async () => {
      await expect(
        rentalProperties
          .connect(propertyManager)
          .enterRentalPropertyDetails(1, 500, 500)
      ).to.be.revertedWith("Property with the given Token Id does not exist");
    });
    it("property manager should not be able to enter the details of already registered rental property", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500, 500);
      await expect(
        rentalProperties
          .connect(propertyManager)
          .enterRentalPropertyDetails(0, 500, 500)
      ).to.be.revertedWith("Property already registered for renting");
    });
    it("Property Maintenance Reserve should be more than zero", async () => {
      await expect(
        rentalProperties
          .connect(propertyManager)
          .enterRentalPropertyDetails(0, 0, 500)
      ).to.be.revertedWith(
        "Property Maintenance Reserve should be more than zero"
      );
    });
    it("Property vacancy Reserve should be more than zero", async () => {
      await expect(
        rentalProperties
          .connect(propertyManager)
          .enterRentalPropertyDetails(0, 500, 0)
      ).to.be.revertedWith("Property Vacancy Reserve should be more than zero");
    });
  });

  describe("updateReserveCapAmount testcases", function () {
    it("Only property manager should be able to update ReserveCap", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500, 500);
      await expect(
        rentalProperties
          .connect(propertyManager)
          .updateReserveCapAmount(0, 0, 600)
      )
        .to.emit(vacancyReserve, "VacancyReserveCapUpdated")
        .withArgs(0, 600);
    });
    it("user other than property manager should not be able to update ReserveCap ", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500, 500);
      await expect(
        rentalProperties
          .connect(propertyOwner1)
          .updateReserveCapAmount(0, 0, 600)
      ).to.be.revertedWith("Caller is not the Property Manager");
    });
    it("Only property manager should be able to call this function:testing of MaintenanceReserveCapUpdated", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500, 500);
      await expect(
        rentalProperties
          .connect(propertyManager)
          .updateReserveCapAmount(0, 600, 0)
      )
        .to.emit(maintenanceReserve, "MaintenanceReserveCapUpdated")
        .withArgs(0, 600);
    });
  });

  describe("initiateRentalPeriod testcases", function () {
    it("Only property manager should be able to call this function:initiateRentalPeriod", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500, 500);
      await rentalProperties
        .connect(propertyManager)
        .initiateRentalPeriod(0, tenant.address, 10, 250, 250, { value: 1000 });
      let propertyStatus = await rentalProperties.getPropertyStatus(0);
      expect(propertyStatus[0]).to.equal("Property is currently occupied");
      expect(propertyStatus[1]).to.equal(tenant.address);
      expect(propertyStatus[2]).to.equal(BigNumber.from(10));
      expect(propertyStatus[3]).to.equal(BigNumber.from(0));
      expect(propertyStatus[4]).to.equal(BigNumber.from(50));
    });
    it("user other than property manager should not be able to call this function:initiateRentalPeriod", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500, 500);
      await expect(
        rentalProperties
          .connect(propertyOwner1)
          .initiateRentalPeriod(0, tenant.address, 10, 250, 250, {
            value: 1000,
          })
      ).to.be.revertedWith("Caller is not the Property Manager");
    });
    it("property manager should not be able to initiate rental period for a non listing property", async () => {
      await expect(
        rentalProperties
          .connect(propertyManager)
          .initiateRentalPeriod(1, tenant.address, 10, 250, 250)
      ).to.be.revertedWith(
        "Property is not listed for the rental period initiation"
      );
    });
    it("property manager should not be able to initiate rental period for already occupied property", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500, 500);
      await rentalProperties
        .connect(propertyManager)
        .initiateRentalPeriod(0, tenant.address, 10, 250, 250, { value: 1000 });
      await expect(
        rentalProperties
          .connect(propertyManager)
          .initiateRentalPeriod(0, tenant.address, 10, 250, 250, {
            value: 1000,
          })
      ).to.be.revertedWith("Property is already occupied");
    });
    it("property manager should not be able to initiate rental period if Tenant address is zero address ", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500, 500);
      await expect(
        rentalProperties
          .connect(propertyManager)
          .initiateRentalPeriod(0, ethers.constants.AddressZero, 10, 250, 250, {
            value: 1000,
          })
      ).to.be.revertedWith("Provide Valid Tenant address");
    });
    it("property manager should not be able to initiate rental period if msg.value is zero ", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500, 500);
      await expect(
        rentalProperties
          .connect(propertyManager)
          .initiateRentalPeriod(0, tenant.address, 10, 250, 250, { value: 0 })
      ).to.be.revertedWith(
        "Please deposite rent for the whole month while initiating rental period"
      );
    });
  });
  describe("distributeRentAmount testcases", function () {
    it("only property manager should be able to call distributeRentAmount function", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500000, 500000);
      await rentalProperties
        .connect(propertyManager)
        .initiateRentalPeriod(0, tenant.address, 10, 250000, 250000, {
          value: BigNumber.from("1000000000000000000"),
        });
      await expect(
        rentalProperties
          .connect(propertyManager)
          .distributeRentAmount(0, [
            propertyOwner1.address,
            propertyOwner2.address,
            propertyOwner3.address,
          ])
      )
        .to.emit(rentalProperties, "RentDistributed")
        .withArgs(
          0,
          [
            propertyOwner1.address,
            propertyOwner2.address,
            propertyOwner3.address,
          ],
          [
            BigNumber.from("49999999999975000"),
            BigNumber.from("29999999999985000"),
            BigNumber.from("19999999999990000"),
          ]
        );
    });
    it("User other than property manager should not be able to call distributeRentAmount function", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500000, 500000);
      await rentalProperties
        .connect(propertyManager)
        .initiateRentalPeriod(0, tenant.address, 10, 250000, 250000, {
          value: BigNumber.from("1000000000000000000"),
        });
      await expect(
        rentalProperties
          .connect(propertyOwner1)
          .distributeRentAmount(0, [
            propertyOwner1.address,
            propertyOwner2.address,
            propertyOwner3.address,
          ])
      ).to.be.revertedWith("Caller is not the Property Manager");
    });
    it("property manager should not be able to distributeRentAmount for a non listing property", async () => {
      await expect(
        rentalProperties
          .connect(propertyManager)
          .distributeRentAmount(0, [
            propertyOwner1.address,
            propertyOwner2.address,
            propertyOwner3.address,
          ])
      ).to.be.revertedWith("Property is not listed for the rental process");
    });
    it("property manager should not be able to distributeRentAmount for a non occupied property", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500, 500);
      await expect(
        rentalProperties
          .connect(propertyManager)
          .distributeRentAmount(0, [
            propertyOwner1.address,
            propertyOwner2.address,
            propertyOwner3.address,
          ])
      ).to.be.revertedWith("Property is not currently occupied");
    });
    it("property manager should not be able to call this function : testing of distributeRentAmount", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500, 500);
      await rentalProperties
        .connect(propertyManager)
        .initiateRentalPeriod(0, tenant.address, 10, 250, 250, {
          value: 10000,
        });
      await expect(
        rentalProperties
          .connect(propertyManager)
          .distributeRentAmount(0, [
            propertyOwner1.address,
            propertyOwner2.address,
            propertyOwner3.address,
          ])
      )
        .to.emit(rentalProperties, "RentDistributed")
        .withArgs(
          0,
          [
            propertyOwner1.address,
            propertyOwner2.address,
            propertyOwner3.address,
          ],
          [450, 270, 180]
        );
    });
    it("property manager should not be able to call distributeRentAmount function before 24 hours", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500, 500);
      await rentalProperties
        .connect(propertyManager)
        .initiateRentalPeriod(0, tenant.address, 10, 250, 250, {
          value: 10000,
        });
      await rentalProperties
        .connect(propertyManager)
        .distributeRentAmount(0, [
          propertyOwner1.address,
          propertyOwner2.address,
          propertyOwner3.address,
        ]);
      await expect(
        rentalProperties
          .connect(propertyManager)
          .distributeRentAmount(0, [
            propertyOwner1.address,
            propertyOwner2.address,
            propertyOwner3.address,
          ])
      ).to.be.revertedWith("Wait for the next rent distribution cycle");
    });
    it("property manager should be able to call distributeRentAmount function again after 24 hours", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500000, 500000);
      await rentalProperties
        .connect(propertyManager)
        .initiateRentalPeriod(0, tenant.address, 10, 250000, 250000, {
          value: BigNumber.from("1000000000000000000"),
        });
      await rentalProperties
        .connect(propertyManager)
        .distributeRentAmount(0, [
          propertyOwner1.address,
          propertyOwner2.address,
          propertyOwner3.address,
        ]);
      await helpers.time.increase(24 * 60 * 60);
      await expect(
        rentalProperties
          .connect(propertyManager)
          .distributeRentAmount(0, [
            propertyOwner1.address,
            propertyOwner2.address,
            propertyOwner3.address,
          ])
      )
        .to.emit(rentalProperties, "RentDistributed")
        .withArgs(
          0,
          [
            propertyOwner1.address,
            propertyOwner2.address,
            propertyOwner3.address,
          ],
          [
            BigNumber.from("49999999999975000"),
            BigNumber.from("29999999999985000"),
            BigNumber.from("19999999999990000"),
          ]
        );
    });
  });
  describe("terminateRentalPeriod testcases", function () {
    it("Only property manager should  be able to call this function : testing of terminateRentalPeriod", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500, 500);
      await rentalProperties
        .connect(propertyManager)
        .initiateRentalPeriod(0, tenant.address, 10, 250, 250, { value: 1000 });
      await rentalProperties.connect(propertyManager).terminateRentalPeriod(0);
      let propertyStatus = await rentalProperties.getPropertyStatus(0);
      expect(propertyStatus[0]).to.equal("Property is currently vacant");
      expect(propertyStatus[1]).to.equal(
        "0x0000000000000000000000000000000000000000"
      );
    });
    it("User other than property manager should  be able to call this function : testing of terminateRentalPeriod", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500, 500);
      await rentalProperties
        .connect(propertyManager)
        .initiateRentalPeriod(0, tenant.address, 10, 250, 250, { value: 1000 });
      await expect(
        rentalProperties.connect(propertyOwner1).terminateRentalPeriod(0)
      ).to.be.revertedWith("Caller is not the Property Manager");
    });
    it("property manager should not be able to terminateRentalPeriod of a non listing property", async () => {
      await expect(
        rentalProperties.connect(propertyManager).terminateRentalPeriod(0)
      ).to.be.revertedWith("Property is not listed for the rental process");
    });
    it("property manager should not be able to terminateRentalPeriod of a non occupied property", async () => {
      await rentalProperties
        .connect(propertyManager)
        .enterRentalPropertyDetails(0, 500, 500);
      await expect(
        rentalProperties.connect(propertyManager).terminateRentalPeriod(0)
      ).to.be.revertedWith("Property is already vacant");
    });
  });
});
