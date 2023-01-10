const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer, PropertyManager, ...addrs] = await ethers.getSigners();
  const RentalProperties = await ethers.getContractFactory("RentalProperties");
  console.log("Deploying from account ", deployer.address);

  const rentalProperties = await upgrades.deployProxy(
    RentalProperties,
    [
      "0xC7a999Fb934b2585d546D667Dc4A49d72012B676",
      "0x945334a1271b7976ECFf39a3782182607e283b3D",
      "0x9C35F5FA175cA719082217D6C79cd181143438eE",
      process.env.PROPERTY_MANAGER,
    ],
    {
      initializer: "initialize",
    },
    { kind: "uups" }
  );

  await rentalProperties.deployed();
  console.log("RentalProperties deployed at", rentalProperties.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
