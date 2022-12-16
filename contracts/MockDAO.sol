// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/TimersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeCastUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";

contract MockDAO is OwnableUpgradeable {
    using SafeCastUpgradeable for uint256;
    using TimersUpgradeable for TimersUpgradeable.BlockNumber;
    enum ProposalState {
        Pending,
        Active,
        ExecutionPeriod
    }
    //proposal Id
    uint256 public proposalId; //* Note any proposer can propose same proposal twice , One thing we can improve here we can use some hash to create proposal Id (using proposal details) to detect same proposal . so that no two same proposal Id exists.
    uint256 public votingDelay;
    uint256 public votingPeriod;
    address public propertyManager;

    //events
    event proposalInitiated(
        uint256 proposalId,
        uint256 presentBlockNumber,
        uint256 votingWillStartAt,
        uint256 votingWillEndAt
    );
    event voted(uint256 proposalId, uint8 vote, address voter);
    event executed(uint256 proposalId);
    //map each proposal with corresponding proposal id
    mapping(uint256 => Proposal) public proposals;
    //map each votings with corresponding proposal id
    mapping(uint256 => Voting) public votings;

    struct Proposal {
        TimersUpgradeable.BlockNumber voteStart;
        TimersUpgradeable.BlockNumber voteEnd;
        bytes32 votersRootHash;
        uint256 amount;
        string proposalProof;
    }

    struct Voting {
        uint64 forVote;
        uint64 against;
        uint64 abstain;
        mapping(bytes32 => bool) isVoted;
    }

    function initialize(
        uint256 _votingDelay,
        uint256 _votingPeriod,
        address _propertyManager
    ) public initializer {
        __Ownable_init();
        setVotingDelayAndPeriod(_votingDelay, _votingPeriod);
        setPropertyManager(_propertyManager);
    }

    /**
    @dev votingDelay, in number of block, between the proposal is created and the vote starts. This can be increased to
    leave time for users to buy voting power, before the voting of a proposal starts.
    @dev votingPeriod in number of blocks, between the vote start and vote ends.
    The {votingDelay} can delay the start of the vote. This must be considered when setting the voting
    duration compared to the voting delay.
     */
    function setVotingDelayAndPeriod(
        uint256 _votingDelay,
        uint256 _votingPeriod
    ) internal {
        votingDelay = _votingDelay;
        votingPeriod = _votingPeriod;
    }

    //To set the property manager
    function setPropertyManager(address _propertyManager) public onlyOwner {
        require(
            _propertyManager != address(0),
            "property manager address cannot be zero"
        );
        propertyManager = _propertyManager;
    }

    //need to validate
    function propose(
        uint256 _amount,
        string calldata _proposalProof,
        bytes32 _votersRootHash
    ) public {
        require(
            msg.sender == propertyManager,
            "Caller is not property manager"
        );
        require(_amount != 0, "Amount should be greater than 0");
        require(
            bytes(_proposalProof).length != 0,
            "proposalProof cannot be empty"
        );
        require(_votersRootHash != bytes32(0), "Root hash cannot be empty");
        proposals[proposalId].amount = _amount;
        proposals[proposalId].proposalProof = _proposalProof;
        proposals[proposalId].votersRootHash = _votersRootHash;
        uint64 start = block.number.toUint64() + votingDelay.toUint64();
        uint64 deadline = start + votingPeriod.toUint64();
        proposals[proposalId].voteStart.setDeadline(start);
        proposals[proposalId].voteEnd.setDeadline(deadline);
        //increment the proposalId
        proposalId++;
        //emit events
        emit proposalInitiated(proposalId - 1, block.number, start, deadline);
    }

    //get proposal state
    function getProposalState(uint256 _proposalId)
        public
        view
        returns (ProposalState state)
    {
        Proposal memory proposal = proposals[_proposalId];
        require(proposal.amount != 0, "Proposal not exists");
        uint64 start = proposal.voteStart.getDeadline();
        uint64 deadline = proposal.voteEnd.getDeadline();

        //before the voting period starts it's in pending state
        if (block.number < start) {
            return ProposalState.Pending;
        }
        //in the voting state
        else if (block.number <= deadline) {
            return ProposalState.Active;
        }
        //voting period is over and waiting for execution of the proposal
        else {
            return ProposalState.ExecutionPeriod;
        }
    }

    /**
    @dev _vote 0 -> Against
    _vote 1-> For
    _vote 2 -> Abstain
    */
    function vote(
        uint256 _proposalId,
        uint8 _vote,
        bytes32[] memory _voterMarkleProof
    ) public {
        require(
            MerkleProofUpgradeable.verify(
                _voterMarkleProof,
                proposals[_proposalId].votersRootHash,
                keccak256(abi.encodePacked(msg.sender))
            ),
            "Invalid proof .Voter is not whitelisted"
        );
        require(
            getProposalState(_proposalId) == ProposalState.Active,
            "Voting is not active"
        );
        require(_vote == 0 || _vote == 1 || _vote == 2, "Invalid vote id");

        bytes32 voteHash = keccak256(abi.encodePacked(msg.sender, _proposalId));
        require(
            !votings[_proposalId].isVoted[voteHash],
            "Cannot vote multiple times to the same proposal"
        );
        if (_vote == 0) {
            votings[_proposalId].against++;
        } else if (_vote == 1) {
            votings[_proposalId].forVote++;
        } else {
            votings[_proposalId].abstain++;
        }
        votings[_proposalId].isVoted[voteHash] = true;
        emit voted(_proposalId, _vote, msg.sender);
    }

    //execute the proposal
    //need to update who can access this function
    function execute(uint256 _proposalId)
        public
        onlyOwner
        returns (bool success)
    {
        require(
            getProposalState(_proposalId) == ProposalState.ExecutionPeriod,
            "Proposal is not in Execution state"
        );

        bool result = isVotingSuccesful(votings[_proposalId]);

        delete proposals[_proposalId];
        delete votings[_proposalId];
        emit executed(_proposalId);
        return result;
    }

    function getCurrentBlock() public view returns (uint256 blockNumber) {
        return block.number;
    }

    function isVotingSuccesful(Voting storage _voting)
        internal
        view
        returns (bool success)
    {
        return _voting.forVote + _voting.abstain > _voting.against;
    }
}
