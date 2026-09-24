// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "./IERC20.sol";

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

    modifier nonReentrant() {
        if (_status == _ENTERED) revert ReentrancyGuardReentrantCall();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

/**
 * @title Escrow
 * @notice Escrow contract for instant-partial-payout freelance milestone payments on Monad.
 * @dev Settles in an ERC-20 stablecoin (e.g. AUSD). Completely self-contained with zero external dependencies.
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
        address client;
        address freelancer;
        uint256 amount;
        uint256 partialAmount;
        uint256 remainderAmount;
        uint256 createdAt;
        JobState state;
    }

    uint256 public constant BPS_DENOMINATOR = 10000;

    IERC20 public immutable token;
    uint256 public immutable partialBps;
    uint256 public immutable timeoutWindow;

    uint256 public jobCount;
    mapping(uint256 => Job) public jobs;

    event JobFunded(
        uint256 indexed jobId,
        address indexed client,
        address indexed freelancer,
        uint256 amount
    );
    event PartialReleased(uint256 indexed jobId, uint256 amount);
    event RemainderReleased(uint256 indexed jobId, uint256 amount);
    event JobCancelled(uint256 indexed jobId);

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

    /**
     * @param _token ERC-20 token address used for settlement (e.g. AUSD)
     * @param _partialBps Percentage in basis points for partial release (e.g. 8000 = 80%)
     * @param _timeoutWindow Timeout in seconds after which remainder can be released automatically (default 7 days)
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
        timeoutWindow = _timeoutWindow;
    }

    /**
     * @notice Client deposits stablecoins to fund a new freelance job.
     * @param freelancer Address of the freelancer to receive payouts
     * @param amount Total amount of stablecoins to lock in escrow
     * @return jobId Unique identifier for the created job
     */
    function createJob(address freelancer, uint256 amount)
        external
        nonReentrant
        returns (uint256 jobId)
    {
        if (freelancer == address(0)) revert InvalidFreelancer();
        if (freelancer == msg.sender) revert ClientCannotBeFreelancer();
        if (amount == 0) revert ZeroAmount();

        uint256 partialAmt = (amount * partialBps) / BPS_DENOMINATOR;
        uint256 remainderAmt = amount - partialAmt;

        if (partialAmt == 0 || remainderAmt == 0) revert AmountTooSmall();

        jobId = ++jobCount;

        jobs[jobId] = Job({
            client: msg.sender,
            freelancer: freelancer,
            amount: amount,
            partialAmount: partialAmt,
            remainderAmount: remainderAmt,
            createdAt: block.timestamp,
            state: JobState.Funded
        });

        emit JobFunded(jobId, msg.sender, freelancer, amount);

        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Releases the majority percentage (default 80%) of the job's locked amount to the freelancer.
     * @dev Callable once per job after funding is confirmed. Authorized for client or freelancer.
     * @param jobId The identifier of the job
     */
    function releasePartial(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        if (job.state == JobState.None) revert JobDoesNotExist(jobId);
        if (job.state != JobState.Funded) {
            revert InvalidJobState(jobId, JobState.Funded, job.state);
        }

        if (msg.sender != job.client && msg.sender != job.freelancer) {
            revert UnauthorizedCaller(msg.sender);
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
        Job storage job = jobs[jobId];
        if (job.state == JobState.None) revert JobDoesNotExist(jobId);
        if (job.state != JobState.PartiallyReleased) {
            revert InvalidJobState(jobId, JobState.PartiallyReleased, job.state);
        }

        bool isClient = msg.sender == job.client;
        bool isTimedOut = block.timestamp >= job.createdAt + timeoutWindow;

        if (!isClient && !isTimedOut) {
            revert UnauthorizedCaller(msg.sender);
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
        Job storage job = jobs[jobId];
        if (job.state == JobState.None) revert JobDoesNotExist(jobId);
        if (job.state != JobState.Funded) {
            revert InvalidJobState(jobId, JobState.Funded, job.state);
        }

        if (msg.sender != job.client) {
            revert UnauthorizedCaller(msg.sender);
        }

        uint256 refundAmount = job.amount;
        job.state = JobState.Cancelled;

        emit JobCancelled(jobId);

        token.safeTransfer(job.client, refundAmount);
    }

    /**
     * @notice Fetches the details of a given job.
     * @param jobId The identifier of the job
     * @return job The Job struct details
     */
    function getJob(uint256 jobId) external view returns (Job memory) {
        Job memory job = jobs[jobId];
        if (job.state == JobState.None) revert JobDoesNotExist(jobId);
        return job;
    }
}
