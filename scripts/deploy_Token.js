const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const Token = await ethers.getContractFactory("Token");
  console.log("Deploying from account ", deployer.address);

  const token = await upgrades.deployProxy(
    Token,
    [],
    {
      initializer: "initialize",
    },
    { kind: "uups" }
  );

  await token.deployed();
  console.log("Token deployed at", token.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
