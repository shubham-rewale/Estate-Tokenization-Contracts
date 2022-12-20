const { waffle } = require("hardhat");
const provider = waffle.provider;

const moveBlocks = async (number) => {
  for (let i = 0; i < number; i++) {
    await provider.send("evm_mine");
  }
};

module.exports = {
  moveBlocks,
};
