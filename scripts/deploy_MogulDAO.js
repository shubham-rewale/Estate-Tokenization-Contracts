const { ethers, upgrades } = require("hardhat");

async function main() {
  const MockDAO = await ethers.getContractFactory("MockDAO");

  const mockDAO = await upgrades.deployProxy(
    MockDAO,
    [
      5,
      20,
      "0x0c33da77e19deba12d78c1001718ab4f6997fae0b64a2a81651cb902e1296e28",
    ],
    { initializer: "initialize" }
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
