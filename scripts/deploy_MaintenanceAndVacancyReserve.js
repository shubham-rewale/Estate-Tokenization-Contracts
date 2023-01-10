const { ethers, upgrades } = require("hardhat");
require("dotenv").config({ path: "../.env" });

async function main() {
  const [deployer, PropertyManager, ...addrs] = await ethers.getSigners();

  const MaintenanceReserve = await ethers.getContractFactory(
    "MaintenanceReserve"
  );
  const VacancyReserve = await ethers.getContractFactory("VacancyReserve");
  console.log("Deploying from account ", deployer.address);
  const maintenanceReserve = await upgrades.deployProxy(
    MaintenanceReserve,
    [process.env.PROPERTY_MANAGER],
    {
      initializer: "initialize",
    },
    { kind: "uups" }
  );
  await maintenanceReserve.deployed();
  console.log("Maintenance Reserve deployed at", maintenanceReserve.address);

  const vacancyReserve = await upgrades.deployProxy(
    VacancyReserve,
    [process.env.PROPERTY_MANAGER],
    {
      initializer: "initialize",
    },
    { kind: "uups" }
  );
  await vacancyReserve.deployed();
  console.log("Vacancy Reserve deployed at", vacancyReserve.address);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
