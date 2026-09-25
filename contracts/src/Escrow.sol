// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20, IERC20Permit} from "./IERC20.sol";

/**
 * @notice Lightweight, robust library for safe ERC-20 token transfers.
 */
library SafeTransferLib {
    error TransferFailed();
    error TransferFromFailed();

    function safeTransfer(IERC20 token, address to, uint256 amount) internal {
        (bool success, bytes memory data) = address(token).call(
            abi.encodeCall(IERC20.transfer, (to, amount))
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert TransferFailed();
        }
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) = address(token).call(
            abi.encodeCall(IERC20.transferFrom, (from, to, amount))
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert TransferFromFailed();
        }
    }
}

/**
 * @notice Cryptographic library for secure ECDSA signature verification.
 */
library ECDSA {
    error InvalidSignatureLength();
    error InvalidSignatureS();
    error InvalidSignatureV();
    error InvalidSigner();

    function recover(bytes32 hash, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) revert InvalidSignatureLength();

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            revert InvalidSignatureS();
        }

        if (v != 27 && v != 28) {
            revert InvalidSignatureV();
        }

        address signer = ecrecover(hash, v, r, s);
        if (signer == address(0)) revert InvalidSigner();

        return signer;
    }
}

/**
 * @notice Gas-efficient reentrancy guard without external dependencies.
 */
abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = _NOT_ENTERED;
    }

    function _nonReentrantBefore() private {
        if (_status == _ENTERED) revert ReentrancyGuardReentrantCall();
        _status = _ENTERED;
    }

    function _nonReentrantAfter() private {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }
}

/**
 * @title Escrow
 * @notice Production-grade instant-partial-payout escrow protocol on Monad.
 * @dev Settles in ERC-20 stablecoins (e.g. AUSD). Supports EIP-712 gasless meta-transactions
 *      for Monad x402 facilitator integration and EIP-2612 1-click permit onboarding.
 */
contract Escrow is ReentrancyGuard {
    using SafeTransferLib for IERC20;

    enum JobState {
        None,
        Funded,
        PartiallyReleased,
        Completed,
        Cancelled
    }

    struct Job {
        address client;           // 20 bytes - slot 0
        uint64 createdAt;         // 8 bytes  - slot 0
        uint32 timeoutWindow;     // 4 bytes  - slot 0 (32 bytes total)
        address freelancer;       // 20 bytes - slot 1
        JobState state;           // 1 byte   - slot 1
        uint128 amount;           // 16 bytes - slot 2
        uint128 partialAmount;    // 16 bytes - slot 2 (32 bytes total)
        uint128 remainderAmount;  // 16 bytes - slot 3
        bytes32 metadataHash;     // 32 bytes - slot 4
    }

    uint256 public constant BPS_DENOMINATOR = 10000;

    IERC20 public immutable token;
    uint256 public immutable partialBps;
    uint256 public immutable defaultTimeoutWindow;

    uint256 public jobCount;
    mapping(uint256 => Job) public jobs;

    // Index tracking for sub-second dashboard queries
    mapping(address => uint256[]) private _clientJobs;
    mapping(address => uint256[]) private _freelancerJobs;

    // EIP-712 Meta-Transactions state
    mapping(address => uint256) public nonces;
    bytes32 private immutable _INITIAL_DOMAIN_SEPARATOR;
    uint256 private immutable _INITIAL_CHAIN_ID;

    bytes32 public constant RELEASE_PARTIAL_TYPEHASH =
        keccak256("ReleasePartial(uint256 jobId,uint256 nonce,uint256 deadline)");
    bytes32 public constant RELEASE_REMAINDER_TYPEHASH =
        keccak256("ReleaseRemainder(uint256 jobId,uint256 nonce,uint256 deadline)");
    bytes32 public constant CANCEL_JOB_TYPEHASH =
        keccak256("CancelJob(uint256 jobId,uint256 nonce,uint256 deadline)");

    event JobFunded(
        uint256 indexed jobId,
        address indexed client,
        address indexed freelancer,
        uint256 amount
    );
    event PartialReleased(uint256 indexed jobId, uint256 amount);
    event RemainderReleased(uint256 indexed jobId, uint256 amount);
    event JobCancelled(uint256 indexed jobId);
    event TimeoutExtended(uint256 indexed jobId, uint32 newTimeoutWindow);

    error InvalidToken();
    error InvalidPartialPercentage();
    error InvalidTimeoutWindow();
    error InvalidFreelancer();
    error ClientCannotBeFreelancer();
    error ZeroAmount();
    error AmountTooSmall();
    error JobDoesNotExist(uint256 jobId);
    error InvalidJobState(uint256 jobId, JobState expected, JobState actual);
    error UnauthorizedCaller(address caller);
    error SignatureExpired();
    error InvalidSignature();
    error AmountExceedsUint128();

    /**
     * @param _token ERC-20 token address used for settlement (e.g. AUSD)
     * @param _partialBps Percentage in basis points for partial release (e.g. 8000 = 80%)
     * @param _timeoutWindow Default timeout in seconds after which remainder can be released automatically (7 days)
     */
    constructor(
        address _token,
        uint256 _partialBps,
        uint256 _timeoutWindow
    ) {
        if (_token == address(0)) revert InvalidToken();
        if (_partialBps == 0 || _partialBps >= BPS_DENOMINATOR) revert InvalidPartialPercentage();
        if (_timeoutWindow == 0) revert InvalidTimeoutWindow();

        token = IERC20(_token);
        partialBps = _partialBps;
        defaultTimeoutWindow = _timeoutWindow;

        _INITIAL_CHAIN_ID = block.chainid;
        _INITIAL_DOMAIN_SEPARATOR = _computeDomainSeparator();
    }

    // =========================================================================
    // Core Escrow Lifecycle
    // =========================================================================

    /**
     * @notice Client deposits stablecoins to fund a new freelance job.
     * @param freelancer Address of the freelancer to receive payouts
     * @param amount Total amount of stablecoins to lock in escrow
     * @return jobId Unique identifier for the created job
     */
    function createJob(address freelancer, uint256 amount) external returns (uint256 jobId) {
        return createJob(freelancer, amount, bytes32(0));
    }

    /**
     * @notice Client deposits stablecoins with optional invoice/agreement metadata hash.
     * @param freelancer Address of the freelancer to receive payouts
     * @param amount Total amount of stablecoins to lock in escrow
     * @param metadataHash Hash of the job specifications, milestone terms, or invoice
     * @return jobId Unique identifier for the created job
     */
    function createJob(
        address freelancer,
        uint256 amount,
        bytes32 metadataHash
    ) public nonReentrant returns (uint256 jobId) {
        if (freelancer == address(0)) revert InvalidFreelancer();
        if (freelancer == msg.sender) revert ClientCannotBeFreelancer();
        if (amount == 0) revert ZeroAmount();
        if (amount > type(uint128).max) revert AmountExceedsUint128();

        uint256 partialAmt = (amount * partialBps) / BPS_DENOMINATOR;
        uint256 remainderAmt = amount - partialAmt;

        if (partialAmt == 0 || remainderAmt == 0) revert AmountTooSmall();

        jobId = ++jobCount;

        jobs[jobId] = Job({
            client: msg.sender,
            createdAt: uint64(block.timestamp),
            timeoutWindow: uint32(defaultTimeoutWindow),
            freelancer: freelancer,
            state: JobState.Funded,
            amount: uint128(amount),
            partialAmount: uint128(partialAmt),
            remainderAmount: uint128(remainderAmt),
            metadataHash: metadataHash
        });

        _clientJobs[msg.sender].push(jobId);
        _freelancerJobs[freelancer].push(jobId);

        emit JobFunded(jobId, msg.sender, freelancer, amount);

        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice 1-Click job funding combining EIP-2612 permit and job creation in a single transaction.
     */
    function createJobWithPermit(
        address freelancer,
        uint256 amount,
        bytes32 metadataHash,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 jobId) {
        IERC20Permit(address(token)).permit(msg.sender, address(this), amount, deadline, v, r, s);
        return createJob(freelancer, amount, metadataHash);
    }

    /**
     * @notice Releases the majority percentage (default 80%) of the job's locked amount to the freelancer.
     * @dev Callable once per job after funding is confirmed. Authorized for client or freelancer.
     * @param jobId The identifier of the job
     */
    function releasePartial(uint256 jobId) external nonReentrant {
        _executePartialRelease(jobId, msg.sender);
    }

    /**
     * @notice Gasless partial release signed off-chain and executed by Monad x402 facilitator or relayer.
     */
    function releasePartialWithSig(
        uint256 jobId,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        if (block.timestamp > deadline) revert SignatureExpired();

        Job storage job = jobs[jobId];
        if (job.state == JobState.None) revert JobDoesNotExist(jobId);

        bytes32 structHash = keccak256(
            abi.encode(RELEASE_PARTIAL_TYPEHASH, jobId, nonces[job.client]++, deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), structHash));
        address signer = ECDSA.recover(digest, signature);

        if (signer != job.client && signer != job.freelancer) revert InvalidSignature();

        _executePartialRelease(jobId, signer);
    }

    function _executePartialRelease(uint256 jobId, address caller) internal {
        Job storage job = jobs[jobId];
        if (job.state == JobState.None) revert JobDoesNotExist(jobId);
        if (job.state != JobState.Funded) {
            revert InvalidJobState(jobId, JobState.Funded, job.state);
        }

        if (caller != job.client && caller != job.freelancer) {
            revert UnauthorizedCaller(caller);
        }

        uint256 payout = job.partialAmount;
        job.state = JobState.PartiallyReleased;

        emit PartialReleased(jobId, payout);

        token.safeTransfer(job.freelancer, payout);
    }

    /**
     * @notice Releases the remaining balance to the freelancer.
     * @dev Callable by the client (marking completion) or by anyone after timeoutWindow has elapsed.
     * @param jobId The identifier of the job
     */
    function releaseRemainder(uint256 jobId) external nonReentrant {
        _executeRemainderRelease(jobId, msg.sender);
    }

    /**
     * @notice Gasless remainder release signed off-chain by the client and submitted via x402 facilitator.
     */
    function releaseRemainderWithSig(
        uint256 jobId,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        if (block.timestamp > deadline) revert SignatureExpired();

        Job storage job = jobs[jobId];
        if (job.state == JobState.None) revert JobDoesNotExist(jobId);

        bytes32 structHash = keccak256(
            abi.encode(RELEASE_REMAINDER_TYPEHASH, jobId, nonces[job.client]++, deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), structHash));
        address signer = ECDSA.recover(digest, signature);

        if (signer != job.client) revert InvalidSignature();

        _executeRemainderRelease(jobId, signer);
    }

    function _executeRemainderRelease(uint256 jobId, address caller) internal {
        Job storage job = jobs[jobId];
        if (job.state == JobState.None) revert JobDoesNotExist(jobId);
        if (job.state != JobState.PartiallyReleased) {
            revert InvalidJobState(jobId, JobState.PartiallyReleased, job.state);
        }

        bool isClient = caller == job.client;
        bool isTimedOut = block.timestamp >= uint256(job.createdAt) + uint256(job.timeoutWindow);

        if (!isClient && !isTimedOut) {
            revert UnauthorizedCaller(caller);
        }

        uint256 payout = job.remainderAmount;
        job.state = JobState.Completed;

        emit RemainderReleased(jobId, payout);

        token.safeTransfer(job.freelancer, payout);
    }

    /**
     * @notice Refunds the client the full locked amount.
     * @dev Only callable before releasePartial has been executed for that job.
     * @param jobId The identifier of the job
     */
    function cancelJob(uint256 jobId) external nonReentrant {
        _executeCancelJob(jobId, msg.sender);
    }

    /**
     * @notice Gasless cancellation signed off-chain by the client and submitted via facilitator.
     */
    function cancelJobWithSig(
        uint256 jobId,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        if (block.timestamp > deadline) revert SignatureExpired();

        Job storage job = jobs[jobId];
        if (job.state == JobState.None) revert JobDoesNotExist(jobId);

        bytes32 structHash = keccak256(
            abi.encode(CANCEL_JOB_TYPEHASH, jobId, nonces[job.client]++, deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), structHash));
        address signer = ECDSA.recover(digest, signature);

        if (signer != job.client) revert InvalidSignature();

        _executeCancelJob(jobId, signer);
    }

    function _executeCancelJob(uint256 jobId, address caller) internal {
        Job storage job = jobs[jobId];
        if (job.state == JobState.None) revert JobDoesNotExist(jobId);
        if (job.state != JobState.Funded) {
            revert InvalidJobState(jobId, JobState.Funded, job.state);
        }

        if (caller != job.client) {
            revert UnauthorizedCaller(caller);
        }

        uint256 refundAmount = job.amount;
        job.state = JobState.Cancelled;

        emit JobCancelled(jobId);

        token.safeTransfer(job.client, refundAmount);
    }

    /**
     * @notice Allows the client to extend the dispute/completion timeout window.
     */
    function extendTimeout(uint256 jobId, uint32 extensionSeconds) external {
        Job storage job = jobs[jobId];
        if (job.state == JobState.None) revert JobDoesNotExist(jobId);
        if (msg.sender != job.client) revert UnauthorizedCaller(msg.sender);
        if (job.state != JobState.Funded && job.state != JobState.PartiallyReleased) {
            revert InvalidJobState(jobId, JobState.PartiallyReleased, job.state);
        }
        if (extensionSeconds == 0) revert InvalidTimeoutWindow();

        job.timeoutWindow += extensionSeconds;
        emit TimeoutExtended(jobId, job.timeoutWindow);
    }

    // =========================================================================
    // EIP-712 Helpers
    // =========================================================================

    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        return block.chainid == _INITIAL_CHAIN_ID ? _INITIAL_DOMAIN_SEPARATOR : _computeDomainSeparator();
    }

    function _computeDomainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("NadRupee Escrow")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    // =========================================================================
    // View Functions & Batch Dashboard Getters
    // =========================================================================

    /**
     * @notice Fetches the details of a given job.
     */
    function getJob(uint256 jobId) external view returns (Job memory) {
        Job memory job = jobs[jobId];
        if (job.state == JobState.None) revert JobDoesNotExist(jobId);
        return job;
    }

    /**
     * @notice Batch fetches multiple jobs by IDs in a single RPC call for dashboard performance.
     */
    function getJobs(uint256[] calldata jobIds) external view returns (Job[] memory result) {
        result = new Job[](jobIds.length);
        for (uint256 i = 0; i < jobIds.length; i++) {
            result[i] = jobs[jobIds[i]];
        }
    }

    /**
     * @notice Fetches list of job IDs created by a specific client.
     */
    function getClientJobIds(address client) external view returns (uint256[] memory) {
        return _clientJobs[client];
    }

    /**
     * @notice Fetches list of job IDs assigned to a specific freelancer.
     */
    function getFreelancerJobIds(address freelancer) external view returns (uint256[] memory) {
        return _freelancerJobs[freelancer];
    }

    function getClientJobCount(address client) external view returns (uint256) {
        return _clientJobs[client].length;
    }

    function getFreelancerJobCount(address freelancer) external view returns (uint256) {
        return _freelancerJobs[freelancer].length;
    }

    function timeoutWindow() external view returns (uint256) {
        return defaultTimeoutWindow;
    }
}
