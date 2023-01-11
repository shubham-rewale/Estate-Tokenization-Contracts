// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/TimersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeCastUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import "./interfaces/IMaintenanceReserve.sol";
import "./interfaces/IVacancyReserve.sol";

///@title A DAO contract
///@notice Use this contract create a proposal, vote & executed.After execution of a successful proposal, property manager will receive the desired amount from maintenance reserve.
contract DAO is OwnableUpgradeable, UUPSUpgradeable {
    using SafeCastUpgradeable for uint256;
    using TimersUpgradeable for TimersUpgradeable.BlockNumber;
    ///@notice Defined a proposal state
    enum ProposalState {
        Pending,
        Active,
        ExecutionPeriod
    }
    ///@notice Defined all available withdrawable funds contract
    enum ReserveContracts {
        MaintenanceReserve,
        VacancyReserve
    }
    ///@notice unique proposal id representing each proposal
    // uint256 public proposalId;
    ///@dev Time delay (in block numbers) between any proposal creation and start of voting for it.
    uint256 public votingDelay;
    ///@dev Time (in block number) for voting duration of any proposal
    uint256 public votingPeriod;
    ///@notice Address of the property manager
    address public propertyManager;
    ///@dev Address of the Maintenance Reserve contract . In which reserves are maintained
    IMaintenanceReserve public MaintenanceReserve;
    ///@dev Address of the Vacancy Reserve contract . In which reserves are maintained
    IVacancyReserve public VacancyReserve;

    ///@dev Describing a proposal structure
    struct Proposal {
        TimersUpgradeable.BlockNumber voteStart;
        TimersUpgradeable.BlockNumber voteEnd;
        uint256 tokenId;
        uint256 amount;
        ReserveContracts withdrawFundsFrom;
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
        ReserveContracts withdrawFundsFrom,
        uint256 presentBlockNumber,
        uint256 votingWillStartAt,
        uint256 votingWillEndAt
    );
    ///@dev event to notify editing of a proposal
    event proposalEdited(uint256 proposalId, uint256 tokenId);
    ///@dev To notify a voting for a proposal
    event voted(
        uint256 tokenId,
        uint256 proposalId,
        uint256 vote,
        address voter
    );
    ///@dev To notify execution of a proposal
    event executed(uint256 tokenId, uint256 proposalId);

    ///@dev Collection of proposals. Unique proposalId representing the corresponding proposal.
    // mapping(uint256 => Proposal) public proposals;
    ///@dev voting collection for each proposal .
    ///@dev token ID => proposalId => Voting
    mapping(uint256 => mapping(uint256 => Voting)) public votings;
    ///@dev token Id to proposal Id counter mapping
    mapping(uint256 => uint256) public proposalCounter;
    ///@dev token ID => proposalId => Proposal
    mapping(uint256 => mapping(uint256 => Proposal)) public proposals;

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
    function getProposalState(uint256 _tokenId, uint256 _proposalId)
        public
        view
        returns (ProposalState state)
    {
        Proposal memory proposal = proposals[_tokenId][_proposalId];
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
    ///@param _maintenanceReserveAddress Reserve contract address
    function setMaintenanceReserveAddress(
        IMaintenanceReserve _maintenanceReserveAddress
    ) external onlyOwner {
        require(
            _maintenanceReserveAddress != IMaintenanceReserve(address(0)),
            "maintenance Reserve Contract address can be empty"
        );
        MaintenanceReserve = _maintenanceReserveAddress;
    }

    ///@dev Owner can call this function to set Reserve contract address
    ///@param _vacancyReserveAddress vacancy Reserve contract address
    function setVacancyReserveAddress(IVacancyReserve _vacancyReserveAddress)
        external
        onlyOwner
    {
        require(
            _vacancyReserveAddress != IVacancyReserve(address(0)),
            "vacancy Reserve Contract address can be empty"
        );
        VacancyReserve = _vacancyReserveAddress;
    }

    ///@notice Call this function to make a proposal .Currently only property manager can call this function.
    ///@param _tokenId tokenID representing the property
    ///@param _amount Requested Amount form reserve
    ///@param _withdrawFundsFrom mention the contract from which proposers wants to withdraw funds
    ///@notice _withdrawFundsFrom -> 0 ->  withdraw from MaintenanceReserve, _withdrawFundsFrom -> 1 ->  withdraw from VacancyReserve
    ///@param _proposalProof Any external link for proposal proof
    ///@param _votersRootHash property owners root hash at the time of proposal creation.
    function propose(
        uint256 _tokenId,
        uint256 _amount,
        ReserveContracts _withdrawFundsFrom,
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
        proposals[_tokenId][proposalCounter[_tokenId]].tokenId = _tokenId;
        proposals[_tokenId][proposalCounter[_tokenId]].amount = _amount;
        proposals[_tokenId][proposalCounter[_tokenId]]
            .withdrawFundsFrom = _withdrawFundsFrom;
        proposals[_tokenId][proposalCounter[_tokenId]]
            .proposalProof = _proposalProof;
        proposals[_tokenId][proposalCounter[_tokenId]]
            .votersRootHash = _votersRootHash;
        uint64 start = block.number.toUint64() + votingDelay.toUint64();
        uint64 deadline = start + votingPeriod.toUint64();
        proposals[_tokenId][proposalCounter[_tokenId]].voteStart.setDeadline(
            start
        );
        proposals[_tokenId][proposalCounter[_tokenId]].voteEnd.setDeadline(
            deadline
        );
        //increment the proposalId
        proposalCounter[_tokenId] = proposalCounter[_tokenId] + 1;
        //emit events
        emit proposalInitiated(
            proposalCounter[_tokenId] - 1,
            _tokenId,
            _withdrawFundsFrom,
            block.number,
            start,
            deadline
        );
    }

    ///@dev property manager can call this function to edit the proposal which are on pending state
    ///@param _proposalId ProposalID referring that proposal that manager wants to modify
    ///@param _tokenId updated tokenId
    ///@param _amount updated amount
    ///@param _proposalProof updated  proposal proof
    ///@param _votersRootHash  updated voter root hash
    function editProposal(
        uint256 _proposalId,
        uint256 _tokenId,
        uint256 _amount,
        ReserveContracts _withdrawFundsFrom,
        string calldata _proposalProof,
        bytes32 _votersRootHash
    ) external {
        require(
            msg.sender == propertyManager,
            "Caller is not property manager"
        );
        require(
            getProposalState(_tokenId, _proposalId) == ProposalState.Pending,
            "Proposal not in pending state"
        );
        require(_amount != 0, "Amount should be greater than 0");
        require(
            bytes(_proposalProof).length != 0,
            "proposalProof cannot be empty"
        );
        require(_votersRootHash != bytes32(0), "Root hash cannot be empty");

        Proposal storage proposal = proposals[_tokenId][_proposalId];

        proposal.tokenId = _tokenId;
        proposal.amount = _amount;
        proposal.withdrawFundsFrom = _withdrawFundsFrom;
        proposal.proposalProof = _proposalProof;
        proposal.votersRootHash = _votersRootHash;

        //emit the event
        emit proposalEdited(proposalCounter[_tokenId], _tokenId);
    }

    ///@dev voters (owners of the property) can call this function to vote for a certain proposal
    ///@param _proposalId Id Representing the proposal
    ///@param _vote 0 -> Against , 1-> For, 2 -> Abstain
    ///@param _voterMerkleProof Merkle proof for voter (owner of the property)
    function vote(
        uint256 _tokenId,
        uint256 _proposalId,
        uint8 _vote,
        bytes32[] memory _voterMerkleProof
    ) external {
        require(
            MerkleProofUpgradeable.verify(
                _voterMerkleProof,
                proposals[_tokenId][_proposalId].votersRootHash,
                keccak256(abi.encodePacked(msg.sender))
            ),
            "Invalid proof .Voter is not whitelisted"
        );
        require(
            getProposalState(_tokenId, _proposalId) == ProposalState.Active,
            "Voting is not active"
        );
        require(_vote == 0 || _vote == 1 || _vote == 2, "Invalid vote id");

        bytes32 voteHash = keccak256(
            abi.encodePacked(msg.sender, _tokenId, _proposalId)
        );
        require(
            !votings[_tokenId][_proposalId].isVoted[voteHash],
            "Cannot vote multiple times to the same proposal"
        );
        if (_vote == 0) {
            votings[_tokenId][_proposalId].against++;
        } else if (_vote == 1) {
            votings[_tokenId][_proposalId].forVote++;
        } else {
            votings[_tokenId][_proposalId].abstain++;
        }
        votings[_tokenId][_proposalId].isVoted[voteHash] = true;
        emit voted(_tokenId, _proposalId, _vote, msg.sender);
    }

    ///@dev Owner call this function to execute a the proposal after voting period is over for that proposal
    ///@param _proposalId Id Representing the proposal
    ///@dev If voting is successful, then the property manager will get the desired amount transferred to his account from reserve contract
    function execute(uint256 _tokenId, uint256 _proposalId)
        external
        onlyOwner
        returns (bool result)
    {
        require(
            getProposalState(_tokenId, _proposalId) ==
                ProposalState.ExecutionPeriod,
            "Proposal is not in Execution state"
        );
        require(
            MaintenanceReserve != IMaintenanceReserve(address(0)),
            "Invalid Maintenance Resserve contract address"
        );
        require(
            VacancyReserve != IVacancyReserve(address(0)),
            "Invalid Vacancy Resserve contract address"
        );
        result = isVotingSuccessful(_tokenId, _proposalId);
        if (result) {
            handleTransfer(_tokenId, _proposalId);
        }
        delete proposals[_tokenId][_proposalId];
        delete votings[_tokenId][_proposalId];
        emit executed(_tokenId, _proposalId);
        return result;
    }

    ///@dev handles transfer of funds from a reserve contract
    ///@param _proposalId proposal ID
    ///returns a bool whether this transfer is successful or not
    function handleTransfer(uint256 _tokenId, uint256 _proposalId) internal {
        Proposal memory proposal = proposals[_tokenId][_proposalId];
        if (proposal.withdrawFundsFrom == ReserveContracts.MaintenanceReserve) {
            MaintenanceReserve.withdrawFromMaintenanceReserve(
                proposal.tokenId,
                proposal.amount,
                payable(propertyManager)
            );
            return;
        }
        if (proposal.withdrawFundsFrom == ReserveContracts.VacancyReserve) {
            VacancyReserve.withdrawFromVacancyReserve(
                proposal.tokenId,
                proposal.amount,
                payable(propertyManager)
            );
            return;
        }
    }

    ///@dev to get the result of a voting
    function isVotingSuccessful(uint256 _tokenId, uint256 _proposalId)
        internal
        view
        returns (bool result)
    {
        Voting storage voting = votings[_tokenId][_proposalId];
        return voting.forVote + voting.abstain > voting.against;
    }

    // Need to add this function because of UUPS proxy
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
