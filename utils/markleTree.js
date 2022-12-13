const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

class MogulDAOMarkleTree {
  constructor(propertyOwnerAddresses) {
    this.propertyOwnerAddresses = propertyOwnerAddresses;
    this.propertyOwnersMarkleTree;
  }

  getOwnersRootHash() {
    const leafNodes = this.propertyOwnerAddresses.map((addr) =>
      keccak256(addr)
    );
    this.propertyOwnersMarkleTree = new MerkleTree(leafNodes, keccak256, {
      sortPairs: true,
    });
    const rootHash = this.propertyOwnersMarkleTree.getHexRoot();
    return rootHash;
  }

  getOwnerProof(ownerAddress) {
    const proof = this.propertyOwnersMarkleTree.getHexProof(
      keccak256(ownerAddress)
    );
    return proof;
  }
}

module.exports = MogulDAOMarkleTree;
