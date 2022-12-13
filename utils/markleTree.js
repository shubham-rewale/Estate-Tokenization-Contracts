const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

class MogulDAOMarkleTree {
  constructor(proposersAddress, votersAddress) {
    this.ProposersAddress = proposersAddress;
    this.VotersAddress = votersAddress;
    this.proposerMarkleTree;
    this.voterMarkleTree;
  }

  getProposersRootHash() {
    const leafNodes = this.ProposersAddress.map((addr) => keccak256(addr));
    this.proposerMarkleTree = new MerkleTree(leafNodes, keccak256, {
      sortPairs: true,
    });
    const rootHash = this.proposerMarkleTree.getHexRoot();
    return rootHash;
  }

  getProposerProof(proposerAddress) {
    const proof = this.proposerMarkleTree.getHexProof(
      keccak256(proposerAddress)
    );
    return proof;
  }

  getVotersRootHash() {
    const leafNodes = this.VotersAddress.map((addr) => keccak256(addr));
    this.voterMarkleTree = new MerkleTree(leafNodes, keccak256, {
      sortPairs: true,
    });
    const rootHash = this.voterMarkleTree.getHexRoot();
    return rootHash;
  }

  getVoterProof(voterAddress) {
    const proof = this.voterMarkleTree.getHexProof(keccak256(voterAddress));
    return proof;
  }
}

module.exports = MogulDAOMarkleTree;
