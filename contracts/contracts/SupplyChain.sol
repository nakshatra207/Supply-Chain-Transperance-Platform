// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SupplyChain
/// @notice Tamper-evident record of organic-farming batch creation, supply-chain
///         events, and certificate hashes. Stores only metadata and hashes —
///         never documents, files, or personal data.
contract SupplyChain {
    address public owner;

    struct Product {
        string batchId;
        address farmer;
        uint256 createdAt;
        bool exists;
    }

    struct SupplyChainEvent {
        string batchId;
        string eventType;
        address participant;
        uint256 timestamp;
        bytes32 dataHash;
        string location;
    }

    struct Certificate {
        string batchId;
        string certificateId;
        bytes32 certificateHash;
        address verifier;
        uint256 timestamp;
        Status status;
    }

    enum Status {
        PENDING,
        VERIFIED,
        REJECTED,
        EXPIRED
    }

    mapping(string => Product) public products; // batchId => Product
    mapping(string => SupplyChainEvent[]) public batchEvents; // batchId => events
    mapping(string => Certificate) public certificates; // batchId => certificate

    event ProductCreated(string indexed batchId, address indexed farmer, uint256 timestamp);
    event SupplyChainEventAdded(string indexed batchId, string eventType, address indexed participant, uint256 timestamp);
    event CertificateHashAdded(string indexed batchId, string certificateId, bytes32 certificateHash, address indexed verifier);

    modifier onlyOwner() {
        require(msg.sender == owner, "SupplyChain: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Registers a new product batch on-chain. Anyone with backend access
    /// (the platform's signer wallet) can call this; role checks happen off-chain
    /// in the application layer for this MVP.
    function createProduct(string calldata batchId, address farmer) external {
        require(!products[batchId].exists, "SupplyChain: batch already exists");
        products[batchId] = Product({
            batchId: batchId,
            farmer: farmer,
            createdAt: block.timestamp,
            exists: true
        });
        emit ProductCreated(batchId, farmer, block.timestamp);
    }

    /// @notice Appends a supply-chain event (e.g. DISPATCHED, RECEIVED_BY_RETAILER)
    /// to a batch's history.
    function addSupplyChainEvent(
        string calldata batchId,
        string calldata eventType,
        address participant,
        bytes32 dataHash,
        string calldata location
    ) external {
        require(products[batchId].exists, "SupplyChain: batch does not exist");
        batchEvents[batchId].push(
            SupplyChainEvent({
                batchId: batchId,
                eventType: eventType,
                participant: participant,
                timestamp: block.timestamp,
                dataHash: dataHash,
                location: location
            })
        );
        emit SupplyChainEventAdded(batchId, eventType, participant, block.timestamp);
    }

    /// @notice Records a certificate's SHA-256 hash for a batch.
    function addCertificateHash(
        string calldata batchId,
        string calldata certificateId,
        bytes32 certificateHash,
        address verifier
    ) external {
        require(products[batchId].exists, "SupplyChain: batch does not exist");
        certificates[batchId] = Certificate({
            batchId: batchId,
            certificateId: certificateId,
            certificateHash: certificateHash,
            verifier: verifier,
            timestamp: block.timestamp,
            status: Status.VERIFIED
        });
        emit CertificateHashAdded(batchId, certificateId, certificateHash, verifier);
    }

    /// @notice Returns the number of events recorded for a batch.
    function getEventCount(string calldata batchId) external view returns (uint256) {
        return batchEvents[batchId].length;
    }

    /// @notice Returns a single event by index for a batch.
    function getEvent(string calldata batchId, uint256 index)
        external
        view
        returns (
            string memory eventType,
            address participant,
            uint256 timestamp,
            bytes32 dataHash,
            string memory location
        )
    {
        SupplyChainEvent storage e = batchEvents[batchId][index];
        return (e.eventType, e.participant, e.timestamp, e.dataHash, e.location);
    }
}
