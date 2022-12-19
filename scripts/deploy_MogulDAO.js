const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const MockDAO = await ethers.getContractFactory("MockDAO");
  console.log("Deploying from account ", deployer.address);
  const mockDAO = await upgrades.deployProxy(
    MockDAO,
    [5, 20, deployer.address],
    { initializer: "initialize" },
    { kind: "uups" }
  );
  // this deploy proxy first time will deploy 3 contracts .a) ProxyAdmin , b) proxy ,c) implementation contract
  // if we try to deploy it again the only the proxy contract will get deployed(means proxy contract address will be change)
  //this is the address of proxy contract
  await mockDAO.deployed();
  console.log("DAO deployed at", mockDAO.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
