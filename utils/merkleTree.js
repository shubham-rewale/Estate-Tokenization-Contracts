const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

class MogulDAOMerkleTree {
  constructor(propertyOwnerAddresses) {
    this.propertyOwnerAddresses = propertyOwnerAddresses;

    const leafNodes = this.propertyOwnerAddresses.map((addr) =>
      keccak256(addr)
    );
    this.propertyOwnersMerkleTree = new MerkleTree(leafNodes, keccak256, {
      sortPairs: true,
    });
  }

  getOwnersRootHash() {
    const rootHash = this.propertyOwnersMerkleTree.getHexRoot();
    return rootHash;
  }

  getOwnerProof(ownerAddress) {
    const proof = this.propertyOwnersMerkleTree.getHexProof(
      keccak256(ownerAddress)
    );
    return proof;
  }
}

module.exports = MogulDAOMerkleTree;
