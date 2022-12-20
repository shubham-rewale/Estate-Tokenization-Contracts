// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/TimersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeCastUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";

///@title A DAO contract
///@notice Use this contract create a proposal, vote & executed.After execution of a successful proposal, property manager will receive the desired amount from maintenance reserve.
contract MockDAO is OwnableUpgradeable, UUPSUpgradeable {
    using SafeCastUpgradeable for uint256;
    using TimersUpgradeable for TimersUpgradeable.BlockNumber;
    ///@notice Defined a proposal state
    enum ProposalState {
        Pending,
        Active,
        ExecutionPeriod
    }
    ///@notice unique proposal id representing each proposal
    uint256 public proposalId;
    ///@dev Time delay (in block numbers) between any proposal creation and start of voting for it.
    uint256 public votingDelay;
    ///@dev Time (in block number) for voting duration of any proposal
    uint256 public votingPeriod;
    ///@notice Address of the property manager
    address public propertyManager;
    ///@dev Address of the Reserve contract . In which reserves are maintained
    address public ReserveContractAddress;

    ///@dev Describing a proposal structure
    struct Proposal {
        TimersUpgradeable.BlockNumber voteStart;
        TimersUpgradeable.BlockNumber voteEnd;
        uint256 tokenId;
        uint256 amount;
        bytes32 votersRootHash;
        string proposalProof;
    }
    ///@dev Describing voting for a proposal
    struct Voting {
        uint64 forVote;
        uint64 against;
        uint64 abstain;
        mapping(bytes32 => bool) isVoted;
    }

    ///@dev Event to notify a proposal creation.
    event proposalInitiated(
        uint256 proposalId,
        uint256 tokenId,
        uint256 presentBlockNumber,
        uint256 votingWillStartAt,
        uint256 votingWillEndAt
    );
    ///@dev To notify a voting for a proposal
    event voted(uint256 proposalId, uint256 vote, address voter);
    ///@dev To notify execution of a proposal
    event executed(uint256 proposalId);

    ///@dev Collection of proposals. Unique proposalId representing the corresponding proposal.
    mapping(uint256 => Proposal) public proposals;
    ///@dev voting collection for each proposal . Proposal id representing its voting information
    mapping(uint256 => Voting) public votings;

    ///@custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    ///@dev initialization of this contract
    ///@param _votingDelay Representing the votingDelay
    ///@param _votingPeriod Representing the votingPeriod
    ///@param _propertyManager Address of the property manager
    function initialize(
        uint256 _votingDelay,
        uint256 _votingPeriod,
        address _propertyManager
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        setVotingDelayAndPeriod(_votingDelay, _votingPeriod);
        setPropertyManager(_propertyManager);
    }

    ///@param _votingDelay, in number of block, between the proposal is created and the vote starts. This can be increased to leave time for users to buy voting power, before the voting of a proposal starts.
    ///@param _votingPeriod in number of blocks, between the vote start and vote ends.The {votingDelay} can delay the start of the vote. This must be considered when setting the voting duration compared to the voting delay.
    ///@dev Owner can call this function To change voting delay and voting period.
    function setVotingDelayAndPeriod(
        uint256 _votingDelay,
        uint256 _votingPeriod
    ) public onlyOwner {
        votingDelay = _votingDelay;
        votingPeriod = _votingPeriod;
    }

    ///@dev Owner call this function to change the property manager
    ///@param _propertyManager Address of the new property manager
    function setPropertyManager(address _propertyManager) public onlyOwner {
        require(
            _propertyManager != address(0),
            "property manager address cannot be zero"
        );
        propertyManager = _propertyManager;
    }

    ///@dev Call this function to get information about proposal state.
    ///@param _proposalId Id of the proposal.
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

    ///@dev Owner can call this function to set Reserve contract address
    ///@param _reserveContractAddress Reserve contract address
    function setResrveContractAddress(address _reserveContractAddress)
        external
        onlyOwner
    {
        require(
            _reserveContractAddress != address(0),
            "Reserve Contract address can be empty"
        );
        ReserveContractAddress = _reserveContractAddress;
    }

    ///@notice Call this function to make a proposal .Currently only property manager can call this function.
    ///@param _tokenId tokenID representing the property
    ///@param _amount Requested Amount form reserve
    ///@param _proposalProof Any external link for proposal proof
    ///@param _votersRootHash property owners root hash at the time of proposal creation.
    function propose(
        uint256 _tokenId,
        uint256 _amount,
        string calldata _proposalProof,
        bytes32 _votersRootHash
    ) external {
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
        proposals[proposalId].tokenId = _tokenId;
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
        emit proposalInitiated(
            proposalId - 1,
            _tokenId,
            block.number,
            start,
            deadline
        );
    }

    ///@dev voters (owners of the property) can call this function to vote for a certain proposal
    ///@param _proposalId Id Representing the proposal
    ///@param _vote 0 -> Against , 1-> For, 2 -> Abstain
    ///@param _voterMarkleProof markle proof for voter (owner of the property)
    function vote(
        uint256 _proposalId,
        uint8 _vote,
        bytes32[] memory _voterMarkleProof
    ) external {
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

    ///@dev Owner call this function to execute a the proposal after voting period is over for that proposal
    ///@param _proposalId Id Representing the proposal
    ///@dev If voting is successful, then the property manager will get the desired amount transferred to his account from reserve contract
    function execute(uint256 _proposalId)
        external
        onlyOwner
        returns (bool result)
    {
        require(
            getProposalState(_proposalId) == ProposalState.ExecutionPeriod,
            "Proposal is not in Execution state"
        );
        require(
            ReserveContractAddress != address(0),
            "Resserve contract address cannot be empty"
        );
        result = isVotingSuccessful(_proposalId);
        bool isTransferSuccessful;
        if (result) {
            bytes memory payload = abi.encodeWithSignature(
                "withdrawFromMaintenanceReserve(uint256,uint256,address)",
                proposals[_proposalId].tokenId,
                proposals[_proposalId].amount,
                propertyManager
            );
            (isTransferSuccessful, ) = ReserveContractAddress.call{value: 0}(
                payload
            );
        }

        require(
            !(result && !isTransferSuccessful),
            "send to property manager failed"
        );
        delete proposals[_proposalId];
        delete votings[_proposalId];
        emit executed(_proposalId);
        return result;
    }

    ///@dev for development purpose to get the current block number . Might delete later
    function getCurrentBlock() external view returns (uint256 blockNumber) {
        return block.number;
    }

    ///@dev to get the result of a voting
    function isVotingSuccessful(uint256 _proposalId)
        internal
        view
        returns (bool result)
    {
        Voting storage voting = votings[_proposalId];
        return voting.forVote + voting.abstain > voting.against;
    }

    // Need to add this function because of UUPS proxy
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
