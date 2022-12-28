// const chai = require("chai");
// const { solidity } = require("ethereum-waffle");
// chai.use(solidity);
// const { ethers, upgrades} = require("hardhat");
// const { BigNumber } = require("ethers");
// const expect = chai.expect;
// const helpers = require("@nomicfoundation/hardhat-network-helpers");
// require("dotenv").config();

// describe("VacancyReserve testcases", function () {
//   let propertyManager;
//   let DAOContract;
//   let mogulPlatformOwnerAddress;
//   let propertyOwner1;
//   let propertyOwner2;
//   let propertyOwner3;
//   let tenant;
//   let unauthorizedUserAddress;
//   let Token;
//   let MaintenanceReserve;
//   let VacancyReserve;
//   let RentalProperties;
//   let token;
//   let maintenanceReserve ;
//   let vacancyReserve;
//   let rentalProperties ;

//   beforeEach(async () => {
//     [mogulPlatformOwnerAddress,propertyManager,propertyOwner1, propertyOwner2, propertyOwner3,unauthorizedUserAddress,tenant,DAOContract, ...addrs]=await ethers.getSigners();
//     Token = await ethers.getContractFactory("Token");
//     MaintenanceReserve = await ethers.getContractFactory(
//       "MaintenanceReserve"
//     );
//     VacancyReserve = await ethers.getContractFactory(
//       "VacancyReserve"
//     );
//     RentalProperties = await ethers.getContractFactory(
//       "RentalProperties"
//     );
//     //Deploy the token contract
//   token = await upgrades.deployProxy(
//     Token,[],
//     {
//       initializer: "initialize",
//     }
//   );
//   await token.deployed();
//   console.log("token contract address",token.address);

//   //Deploy the maintenance reserve contract
//   maintenanceReserve = await upgrades.deployProxy(
//         MaintenanceReserve,
//         [propertyManager.address],
//         {
//           initializer: "initialize",
//         },
//         { kind: "uups" }
//       );
//       await maintenanceReserve.deployed();

//       console.log("maintenanceReserve contract address",maintenanceReserve.address);

//     //Deploy the vacancy reserve contract
//     vacancyReserve = await upgrades.deployProxy(
//     VacancyReserve,
//     [propertyManager.address],
//     {
//       initializer: "initialize",
//     },
//     { kind: "uups" }
//   );
//   await vacancyReserve.deployed();
//   console.log("vacancyReserve contract address",vacancyReserve.address);

//    //Deploy the rental properties contract
//    rentalProperties = await upgrades.deployProxy(
//     RentalProperties,
// [token.address,maintenanceReserve.address,vacancyReserve.address,propertyManager.address],
//     {
//       initializer: "initialize",
//     },
//     { kind: "uups" }
//   );
//   await rentalProperties.deployed();
//   console.log("rentalProperties contract address",rentalProperties.address);

//   //set the rentalProperties contract address in the maintenanceReserve contract
//   await maintenanceReserve.connect(propertyManager).setRentalPropertiesContractAddr(rentalProperties.address);
//   //set the rentalProperties contract address in the vacancyReserve contract
//   await vacancyReserve.connect(propertyManager).setRentalPropertiesContractAddr(rentalProperties.address);

//   //mint a token
//   await token.connect(mogulPlatformOwnerAddress).mintNewPropertyToken("xyz",100,propertyOwner1.address);
//   //tranfer 20 token to owner 2
//   await token.connect(propertyOwner1).safeTransferFrom(propertyOwner1.address,propertyOwner2.address,0,30,"0x");
//   //transfer 15 token to owner 3
//   await token.connect(propertyOwner1).safeTransferFrom(propertyOwner1.address,propertyOwner3.address,0,20,"0x");
//   await rentalProperties.connect(propertyManager).enterRentalPropertyDetails(0,500000,500000);
//   await rentalProperties.connect(propertyManager).initiateRentalPeriod(0,tenant.address,10,250000,250000,{ value: BigNumber.from("1000000000000000000")});
//   });
//   describe("setPropertyManagerAddress function testcases",function(){
//     it("Only owner should be able to set property manager address",async()=>{
//         await expect(vacancyReserve.connect(unauthorizedUserAddress).setPropertyManagerAddress(unauthorizedUserAddress.address)).to.be.revertedWith("Ownable: caller is not the owner");
//     });
//     it("property manager address can't be zero address",async()=>{
//         await expect(vacancyReserve.connect(mogulPlatformOwnerAddress).setPropertyManagerAddress(ethers.constants.AddressZero)).to.be.revertedWith("Provide Valid Property Manager Address");
//     });
// });
// describe("setRentalPropertiesContractAddr function testcases",function(){
//     it("Only propertyManager should be able to set Rental Contract address",async()=>{
//         await expect(vacancyReserve.connect(unauthorizedUserAddress).setRentalPropertiesContractAddr(unauthorizedUserAddress.address)).to.be.revertedWith("Caller is not the Property Manager");
//     });
//     it("rental contract address can't be zero address",async()=>{
//         await expect(vacancyReserve.connect(propertyManager).setRentalPropertiesContractAddr(ethers.constants.AddressZero)).to.be.revertedWith("Provide Valid Rental Contract Address");
//     });
// });
// describe("setDAOContractAddr function testcases",function(){
//     it("Only propertyManager should be able to set DAO Contract address",async()=>{
//         await expect(vacancyReserve.connect(unauthorizedUserAddress).setDAOContractAddr(unauthorizedUserAddress.address)).to.be.revertedWith("Caller is not the Property Manager");
//     });
//     it("DAO contract address can't be zero address",async()=>{
//         await expect(vacancyReserve.connect(propertyManager).setDAOContractAddr(ethers.constants.AddressZero)).to.be.revertedWith("Provide Valid DAO Contract Address");
//     });
// });
// describe("checkMaintenanceReserve function testcases",function(){
//     it("Only propertyManager should be able to set DAO Contract address",async()=>{
//        const result= await vacancyReserve.checkVacancyReserve(0);
//        expect(result[0]).to.equal(BigNumber.from("500000"));
//        expect(result[1]).to.equal(BigNumber.from("250000"));
//        expect(result[2]).to.equal(BigNumber.from("250000"));
//     });
// });
// describe("setMaintenanceReserveCap function testcases",function(){
//     it("Only RentalProperties contract should be able to set vacancy reserve cap",async()=>{
//         await expect(vacancyReserve.connect(propertyManager).setVacancyReserveCap(0,2500000)).to.be.revertedWith("setVacancyReserveCap() can only be called through RentalProperties contract");
//     });
//     it("New Maintenance Reserve Cap should be greater than or equal to existing Reserve amount",async()=>{
//         await expect(rentalProperties.connect(propertyManager).updateReserveCapAmount(0,0,200000)).to.be.revertedWith("New Vacancy Reserve Cap should be greater than or equal to existing Reserve amount");
//     });
//     it("Property manager should be able to update reserve cap amount",async()=>{
//         await rentalProperties.connect(propertyManager).updateReserveCapAmount(0,0,600000);
//         const result= await vacancyReserve.checkVacancyReserve(0);
//        expect(result[0]).to.equal(BigNumber.from("600000"));
//        expect(result[1]).to.equal(BigNumber.from("250000"));
//        expect(result[2]).to.equal(BigNumber.from("350000"));
//     });
// });
// describe("restoreVacancyReserve function testcases",function(){
//     it("It should be reverted with :- Vacancy Reserve for this Property already have enough Funds",async()=>{
//         await vacancyReserve.connect(propertyManager).restoreVacancyReserve(0,{value:250000});
//         await expect(vacancyReserve.connect(propertyManager).restoreVacancyReserve(0,{value:50000})).to.be.revertedWith("Vacancy Reserve for this Property already have enough Funds");
//     });
//     it("It should be reverted with :-Amount is more than the deficit in the vacancy reserve",async()=>{
//         await expect(vacancyReserve.connect(propertyManager).restoreVacancyReserve(0,{value:350000})).to.be.revertedWith("Amount is more than the deficit in the Vacancy reserve");
//     });
//     it("It should restore reserve with given value and emit FundsAddedToVacancyReserve event",async()=>{
//         await expect(vacancyReserve.connect(propertyManager).restoreVacancyReserve(0,{value:50000})).to.emit(vacancyReserve,"FundsAddedToVacancyReserve").withArgs(0,50000);

//     });
// });
// describe("withdrawFromVacancyReserve function testcases",function(){
//     it("Withdraw function can only be called through DAO contract",async()=>{
//         vacancyReserve.connect(propertyManager).setDAOContractAddr(DAOContract.address);
//         await expect(vacancyReserve.connect(propertyManager).withdrawFromVacancyReserve(0,1000,tenant.address)).to.be.revertedWith("Withdraw function can only be called by DAO contract");
//     });
//     it("recepient address can't be zero ",async()=>{
//         vacancyReserve.connect(propertyManager).setDAOContractAddr(DAOContract.address);
//         await expect(vacancyReserve.connect(DAOContract).withdrawFromVacancyReserve(0,1000,ethers.constants.AddressZero)).to.be.revertedWith("Invalid Recepient Address");
//     });
//     it("Can't withdraw amount more than funds in the vacancy reserve",async()=>{
//         vacancyReserve.connect(propertyManager).setDAOContractAddr(DAOContract.address);
//         await expect(vacancyReserve.connect(DAOContract).withdrawFromVacancyReserve(0,600000,tenant.address)).to.be.revertedWith("Not enough funds in the Vacancy reserve");
//     });
//     it("Can't withdraw amount more than funds in the vacancy reserve",async()=>{
//         await vacancyReserve.connect(propertyManager).setDAOContractAddr(DAOContract.address);
//         let tenantInitialbalance=await tenant.getBalance();
//         let expectedBalance=tenantInitialbalance.add(BigNumber.from(5000));
//         await vacancyReserve.connect(DAOContract).withdrawFromVacancyReserve(0,5000,tenant.address);
//         expect(await tenant.getBalance()).to.equal(expectedBalance);
//     });
// });
// });
