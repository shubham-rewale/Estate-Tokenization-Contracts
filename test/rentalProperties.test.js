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
  let tokenId = 0;
  let rentalPeriodIndays = 10;

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
		const owners = [propertyOwner1.address, propertyOwner2.address, propertyOwner3.address];

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
			.safeTransferFrom(propertyOwner1.address, propertyOwner2.address, tokenId, 30, "0x");
		//transfer 15 token to owner 3
		await token
			.connect(propertyOwner1)
			.safeTransferFrom(propertyOwner1.address, propertyOwner3.address, tokenId, 20, "0x");
	});

	describe("enterRentalPropertyDetails testcases", function () {
		it("Only property manager should be able to call this function", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			let propertyStatus = await rentalProperties.getPropertyStatus(tokenId);
			expect(await propertyStatus[0]).to.equal("Property is currently vacant");
		});
		it("user other than property manager should not be able to enter the details of rental property", async () => {
			await expect(
				rentalProperties.connect(propertyOwner1).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"))
			).to.be.revertedWith("Caller is not the Property Manager");
		});
		it("property manager should not be able to enter the details of rental property for a non existing property", async () => {
      let randomTokenId = 1;
			await expect(
				rentalProperties.connect(propertyManager).enterRentalPropertyDetails(randomTokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"))
			).to.be.revertedWith("Property with the given Token Id does not exist");
		});
		it("property manager should not be able to enter the details of already registered rental property", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await expect(
				rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"))
			).to.be.revertedWith("Property already registered for renting");
		});
		it("Property Maintenance Reserve should be more than zero", async () => {
			await expect(
				rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("0"), ethers.utils.parseEther("2"))
			).to.be.revertedWith("Property Maintenance Reserve should be more than zero");
		});
		it("Property vacancy Reserve should be more than zero", async () => {
			await expect(
				rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("0"))
			).to.be.revertedWith("Property Vacancy Reserve should be more than zero");
		});
	});

	describe("updateReserveCapAmount testcases", function () {
		it("Only property manager should be able to update ReserveCap", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await expect(
				rentalProperties.connect(propertyManager).updateReserveCapAmount(tokenId, ethers.utils.parseEther("0"), ethers.utils.parseEther("2.6"))
			)
				.to.emit(vacancyReserve, "VacancyReserveCapUpdated")
				.withArgs(tokenId, ethers.utils.parseEther("2.6"));
		});
		it("user other than property manager should not be able to update ReserveCap ", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await expect(
				rentalProperties.connect(propertyOwner1).updateReserveCapAmount(tokenId, ethers.utils.parseEther("0"), ethers.utils.parseEther("2.6"))
			).to.be.revertedWith("Caller is not the Property Manager");
		});
		it("Only property manager should be able to call this function:testing of MaintenanceReserveCapUpdated", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await expect(
				rentalProperties.connect(propertyManager).updateReserveCapAmount(tokenId, ethers.utils.parseEther("2.5"), ethers.utils.parseEther("0"))
			)
				.to.emit(maintenanceReserve, "MaintenanceReserveCapUpdated")
				.withArgs(tokenId, ethers.utils.parseEther("2.5"));
		});
	});

	describe("initiateRentalPeriod testcases", function () {
		it("Only property manager should be able to call this function:initiateRentalPeriod", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await rentalProperties
				.connect(propertyManager)
				.initiateRentalPeriod(tokenId, tenant.address, rentalPeriodIndays, ethers.utils.parseEther("0.5"), ethers.utils.parseEther("1"), {
          value: ethers.utils.parseEther("5"),
        });
			let propertyStatus = await rentalProperties.getPropertyStatus(tokenId);
      expect(await rentalProperties.getPropertyRentDeposits(tokenId)).to.equal(ethers.utils.parseEther("3.5"));
			expect(propertyStatus[0]).to.equal("Property is currently occupied");
			expect(propertyStatus[1]).to.equal(tenant.address);
			expect(propertyStatus[2]).to.equal(BigNumber.from(10));
			expect(propertyStatus[3]).to.equal(BigNumber.from(0));
			expect(propertyStatus[4]).to.equal(BigNumber.from("350000000000000000"));
		});
		it("user other than property manager should not be able to call this function:initiateRentalPeriod", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await expect(
				rentalProperties
					.connect(propertyOwner1)
					.initiateRentalPeriod(tokenId, tenant.address, rentalPeriodIndays, ethers.utils.parseEther("0.5"), ethers.utils.parseEther("1"), {
						value: ethers.utils.parseEther("5"),
					})
			).to.be.revertedWith("Caller is not the Property Manager");
		});
		it("property manager should not be able to initiate rental period for a non listing property", async () => {
      let randomTokenId = 1;
			await expect(
				rentalProperties
					.connect(propertyManager)
					.initiateRentalPeriod(randomTokenId, tenant.address, rentalPeriodIndays, ethers.utils.parseEther("0.5"), ethers.utils.parseEther("1"))
			).to.be.revertedWith("Property is not listed for the rental period initiation");
		});
		it("property manager should not be able to initiate rental period for already occupied property", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await rentalProperties
				.connect(propertyManager)
				.initiateRentalPeriod(tokenId, tenant.address, rentalPeriodIndays, ethers.utils.parseEther("0.5"), ethers.utils.parseEther("1"), {
          value: ethers.utils.parseEther("5"),
        });
			await expect(
				rentalProperties
					.connect(propertyManager)
					.initiateRentalPeriod(tokenId, tenant.address, rentalPeriodIndays, ethers.utils.parseEther("0.5"), ethers.utils.parseEther("1"), {
						value: ethers.utils.parseEther("5"),
					})
			).to.be.revertedWith("Property is already occupied");
		});
		it("property manager should not be able to initiate rental period if Tenant address is zero address ", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await expect(
				rentalProperties
					.connect(propertyManager)
					.initiateRentalPeriod(tokenId, ethers.constants.AddressZero, rentalPeriodIndays, ethers.utils.parseEther("0.5"), ethers.utils.parseEther("1"), {
            value: ethers.utils.parseEther("5"),
          })
			).to.be.revertedWith("Provide Valid Tenant address");
		});
		it("property manager should not be able to initiate rental period if msg.value is zero ", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await expect(
				rentalProperties
					.connect(propertyManager)
					.initiateRentalPeriod(tokenId, tenant.address, rentalPeriodIndays, ethers.utils.parseEther("0.5"), ethers.utils.parseEther("1"), {
            value: ethers.utils.parseEther("0")})
			).to.be.revertedWith(
				"Please deposite rent for the whole month while initiating rental period"
			);
		});
    it("Amount towards Maintenance Reserve should be less than Rent Amount", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("6.5"), ethers.utils.parseEther("2"));
			await expect(rentalProperties
				.connect(propertyManager)
				.initiateRentalPeriod(tokenId, tenant.address, rentalPeriodIndays, ethers.utils.parseEther("6"), ethers.utils.parseEther("1"), {
          value: ethers.utils.parseEther("5"),
        })).to.be.revertedWith("Amount towards Maintenance Reserve should be less than Rent Amount");
		});
    it("Please provide amount for the MaintenanceReserve less than or equal to its deficit", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await expect(rentalProperties
				.connect(propertyManager)
				.initiateRentalPeriod(tokenId, tenant.address, rentalPeriodIndays, ethers.utils.parseEther("2.5"), ethers.utils.parseEther("1"), {
          value: ethers.utils.parseEther("5"),
        })).to.be.revertedWith("Please provide amount for the MaintenanceReserve less than or equal to its deficit");
		});
    it("Amount towards Vacancy Reserve should be less than Rent Amount", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await expect(rentalProperties
				.connect(propertyManager)
				.initiateRentalPeriod(tokenId, tenant.address, rentalPeriodIndays, ethers.utils.parseEther("0.5"), ethers.utils.parseEther("5"), {
          value: ethers.utils.parseEther("5"),
        })).to.be.revertedWith("Amount towards Vacancy Reserve should be less than Rent Amount");
		});
    it("Please provide amount for the VacancyReserve less than or equal to its deficit", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await expect(rentalProperties
				.connect(propertyManager)
				.initiateRentalPeriod(tokenId, tenant.address, rentalPeriodIndays, ethers.utils.parseEther("0.5"), ethers.utils.parseEther("3"), {
          value: ethers.utils.parseEther("5"),
        })).to.be.revertedWith("Please provide amount for the VacancyReserve less than or equal to its deficit");
		});
	});

	describe("distributeRentAmount testcases", function () {
		it("only property manager should be able to call distributeRentAmount function", async () => {
			await rentalProperties
				.connect(propertyManager)
				.enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await rentalProperties
				.connect(propertyManager)
				.initiateRentalPeriod(tokenId, tenant.address, rentalPeriodIndays, ethers.utils.parseEther("0.5"), ethers.utils.parseEther("1"), {
					value: ethers.utils.parseEther("5"),
				});
			await expect(
				rentalProperties
					.connect(propertyManager)
					.distributeRentAmount(tokenId, [
						propertyOwner1.address,
						propertyOwner2.address,
						propertyOwner3.address,
					])
			)
				.to.emit(rentalProperties, "RentDistributed")
				.withArgs(
					0,
					[propertyOwner1.address, propertyOwner2.address, propertyOwner3.address],
					[
						BigNumber.from("175000000000000000"),
						BigNumber.from("105000000000000000"),
						BigNumber.from("70000000000000000"),
					]
				);
		});
		it("User other than property manager should not be able to call distributeRentAmount function", async () => {
			await rentalProperties
				.connect(propertyManager)
				.enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await rentalProperties
				.connect(propertyManager)
				.initiateRentalPeriod(tokenId, tenant.address, rentalPeriodIndays, ethers.utils.parseEther("0.5"), ethers.utils.parseEther("1"), {
					value: ethers.utils.parseEther("5"),
				});
			await expect(
				rentalProperties
					.connect(propertyOwner1)
					.distributeRentAmount(tokenId, [
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
					.distributeRentAmount(tokenId, [
						propertyOwner1.address,
						propertyOwner2.address,
						propertyOwner3.address,
					])
			).to.be.revertedWith("Property is not listed for the rental process");
		});
		it("property manager should not be able to distributeRentAmount for a non occupied property", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await expect(
				rentalProperties
					.connect(propertyManager)
					.distributeRentAmount(tokenId, [
						propertyOwner1.address,
						propertyOwner2.address,
						propertyOwner3.address,
					])
			).to.be.revertedWith("Property is not currently occupied");
		});
		it("property manager should not be able to call distributeRentAmount function before 24 hours", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await rentalProperties
				.connect(propertyManager)
				.initiateRentalPeriod(tokenId, tenant.address, rentalPeriodIndays, ethers.utils.parseEther("0.5"), ethers.utils.parseEther("1"), {
					value: ethers.utils.parseEther("5"),
				});
			await rentalProperties
				.connect(propertyManager)
				.distributeRentAmount(tokenId, [
					propertyOwner1.address,
					propertyOwner2.address,
					propertyOwner3.address,
				]);
			await expect(
				rentalProperties
					.connect(propertyManager)
					.distributeRentAmount(tokenId, [
						propertyOwner1.address,
						propertyOwner2.address,
						propertyOwner3.address,
					])
			).to.be.revertedWith("Wait for the next rent distribution cycle");
		});
		it("property manager should be able to call distributeRentAmount function again after 24 hours", async () => {
			await rentalProperties
				.connect(propertyManager)
				.enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await rentalProperties
				.connect(propertyManager)
				.initiateRentalPeriod(tokenId, tenant.address, rentalPeriodIndays, ethers.utils.parseEther("0.5"), ethers.utils.parseEther("1"), {
					value: ethers.utils.parseEther("5"),
				});
			await rentalProperties
				.connect(propertyManager)
				.distributeRentAmount(tokenId, [
					propertyOwner1.address,
					propertyOwner2.address,
					propertyOwner3.address,
				]);
			await helpers.time.increase(24 * 60 * 60);
			await expect(
				rentalProperties
					.connect(propertyManager)
					.distributeRentAmount(tokenId, [
						propertyOwner1.address,
						propertyOwner2.address,
						propertyOwner3.address,
					])
			)
				.to.emit(rentalProperties, "RentDistributed")
				.withArgs(
					0,
					[propertyOwner1.address, propertyOwner2.address, propertyOwner3.address],
					[
						BigNumber.from("175000000000000000"),
          BigNumber.from("105000000000000000"),
          BigNumber.from("70000000000000000"),
					]
				);
		});
  	it("RentalPeriod should be terminated after the completion of rental days", async () => {
			await rentalProperties
				.connect(propertyManager)
				.enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await rentalProperties
				.connect(propertyManager)
				.initiateRentalPeriod(tokenId, tenant.address,4, ethers.utils.parseEther("0.5"), ethers.utils.parseEther("1"), {
					value: ethers.utils.parseEther("5"),
				});
			await rentalProperties
				.connect(propertyManager)
				.distributeRentAmount(tokenId, [
					propertyOwner1.address,
					propertyOwner2.address,
					propertyOwner3.address,
				]);
			await helpers.time.increase(24 * 60 * 60);
			await 
				rentalProperties
					.connect(propertyManager)
					.distributeRentAmount(tokenId, [
						propertyOwner1.address,
						propertyOwner2.address,
						propertyOwner3.address,
					]);
          await helpers.time.increase(24 * 60 * 60);
          await 
            rentalProperties
              .connect(propertyManager)
              .distributeRentAmount(tokenId, [
                propertyOwner1.address,
                propertyOwner2.address,
                propertyOwner3.address,
              ]);
              await helpers.time.increase(24 * 60 * 60);
              await expect(
                rentalProperties
                  .connect(propertyManager)
                  .distributeRentAmount(tokenId, [
                    propertyOwner1.address,
                    propertyOwner2.address,
                    propertyOwner3.address,
                  ])).to.emit(rentalProperties,"RentalPeriodTerminated");
    });
	});

	describe("terminateRentalPeriod testcases", function () {
		it("Only property manager should  be able to call this function : testing of terminateRentalPeriod", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await rentalProperties
				.connect(propertyManager)
				.initiateRentalPeriod(tokenId, tenant.address, rentalPeriodIndays, ethers.utils.parseEther("0.5"), ethers.utils.parseEther("1"), {
          				value: ethers.utils.parseEther("5"),
          			});
			await rentalProperties.connect(propertyManager).terminateRentalPeriod(tokenId);
			let propertyStatus = await rentalProperties.getPropertyStatus(tokenId);
			expect(propertyStatus[0]).to.equal("Property is currently vacant");
			expect(propertyStatus[1]).to.equal("0x0000000000000000000000000000000000000000");
		});
		it("User other than property manager should  be able to call this function : testing of terminateRentalPeriod", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await rentalProperties
				.connect(propertyManager)
				.initiateRentalPeriod(tokenId, tenant.address, rentalPeriodIndays, ethers.utils.parseEther("0.5"), ethers.utils.parseEther("1"), {
          value: ethers.utils.parseEther("5"),
        });
			await expect(
				rentalProperties.connect(propertyOwner1).terminateRentalPeriod(tokenId)
			).to.be.revertedWith("Caller is not the Property Manager");
		});
		it("property manager should not be able to terminateRentalPeriod of a non listing property", async () => {
			await expect(
				rentalProperties.connect(propertyManager).terminateRentalPeriod(tokenId)
			).to.be.revertedWith("Property is not listed for the rental process");
		});
		it("property manager should not be able to terminateRentalPeriod of a non occupied property", async () => {
			await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(tokenId, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"));
			await expect(
				rentalProperties.connect(propertyManager).terminateRentalPeriod(tokenId)
			).to.be.revertedWith("Property is already vacant");
		});
	});
});
