const moveBlocks = async (number) => {
  for (let i = 0; i < number; i++) {
    await network.provider.send("evm_mine");
  }
};

module.exports = {
  moveBlocks,
};
