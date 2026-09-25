// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Escrow} from "../src/Escrow.sol";
import {AUSD} from "../src/AUSD.sol";

contract EscrowTest is Test {
    Escrow public escrow;
    AUSD public token;

    uint256 internal clientPrivateKey = 0xA11CE;
    uint256 internal freelancerPrivateKey = 0xB0B;
    uint256 internal unauthorizedPrivateKey = 0xBAD;

    address public client;
    address public freelancer;
    address public unauthorized;

    uint256 public constant DEFAULT_PARTIAL_BPS = 8000; // 80%
    uint256 public constant DEFAULT_TIMEOUT_WINDOW = 7 days;
    uint256 public constant INITIAL_BALANCE = 100_000 * 1e6; // 100,000 AUSD (6 decimals)
    uint256 public constant JOB_AMOUNT = 1_000 * 1e6; // 1,000 AUSD

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

    function setUp() public {
        client = vm.addr(clientPrivateKey);
        freelancer = vm.addr(freelancerPrivateKey);
        unauthorized = vm.addr(unauthorizedPrivateKey);

        token = new AUSD();
        escrow = new Escrow(address(token), DEFAULT_PARTIAL_BPS, DEFAULT_TIMEOUT_WINDOW);

        token.mint(client, INITIAL_BALANCE);
        vm.prank(client);
        token.approve(address(escrow), type(uint256).max);
    }

    // =========================================================================
    // Constructor Validations
    // =========================================================================

    function test_Constructor_RevertsIf_TokenIsZero() public {
        vm.expectRevert(Escrow.InvalidToken.selector);
        new Escrow(address(0), DEFAULT_PARTIAL_BPS, DEFAULT_TIMEOUT_WINDOW);
    }

    function test_Constructor_RevertsIf_PartialBpsZero() public {
        vm.expectRevert(Escrow.InvalidPartialPercentage.selector);
        new Escrow(address(token), 0, DEFAULT_TIMEOUT_WINDOW);
    }

    function test_Constructor_RevertsIf_PartialBps10000OrGreater() public {
        vm.expectRevert(Escrow.InvalidPartialPercentage.selector);
        new Escrow(address(token), 10000, DEFAULT_TIMEOUT_WINDOW);

        vm.expectRevert(Escrow.InvalidPartialPercentage.selector);
        new Escrow(address(token), 12000, DEFAULT_TIMEOUT_WINDOW);
    }

    function test_Constructor_RevertsIf_TimeoutZero() public {
        vm.expectRevert(Escrow.InvalidTimeoutWindow.selector);
        new Escrow(address(token), DEFAULT_PARTIAL_BPS, 0);
    }

    function test_Constructor_SetsParametersCorrectly() public view {
        assertEq(address(escrow.token()), address(token));
        assertEq(escrow.partialBps(), DEFAULT_PARTIAL_BPS);
        assertEq(escrow.timeoutWindow(), DEFAULT_TIMEOUT_WINDOW);
        assertEq(escrow.jobCount(), 0);
    }

    // =========================================================================
    // createJob Tests
    // =========================================================================

    function test_CreateJob_HappyPath() public {
        vm.expectEmit(true, true, true, true);
        emit JobFunded(1, client, freelancer, JOB_AMOUNT);

        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        assertEq(jobId, 1);
        assertEq(escrow.jobCount(), 1);
        assertEq(token.balanceOf(address(escrow)), JOB_AMOUNT);
        assertEq(token.balanceOf(client), INITIAL_BALANCE - JOB_AMOUNT);

        Escrow.Job memory job = escrow.getJob(jobId);
        assertEq(job.client, client);
        assertEq(job.freelancer, freelancer);
        assertEq(job.amount, JOB_AMOUNT);
        assertEq(job.partialAmount, 800 * 1e6);
        assertEq(job.remainderAmount, 200 * 1e6);
        assertEq(job.createdAt, block.timestamp);
        assertEq(uint8(job.state), uint8(Escrow.JobState.Funded));

        // Index checks
        assertEq(escrow.getClientJobCount(client), 1);
        assertEq(escrow.getFreelancerJobCount(freelancer), 1);
    }

    function test_CreateJob_WithMetadataHash() public {
        bytes32 docHash = keccak256("Milestone 1: Smart contract delivery");

        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT, docHash);

        Escrow.Job memory job = escrow.getJob(jobId);
        assertEq(job.metadataHash, docHash);
    }

    function test_CreateJobWithPermit_HappyPath() public {
        address newClient = vm.addr(0x999);
        uint256 amount = 500 * 1e6;
        token.mint(newClient, amount);

        // Sign EIP-2612 permit
        bytes32 structHash = keccak256(
            abi.encode(
                token.PERMIT_TYPEHASH(),
                newClient,
                address(escrow),
                amount,
                token.nonces(newClient),
                block.timestamp + 1 hours
            )
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0x999, digest);

        // 1-Click execute
        vm.prank(newClient);
        uint256 jobId = escrow.createJobWithPermit(
            freelancer,
            amount,
            keccak256("Permit Job"),
            block.timestamp + 1 hours,
            v,
            r,
            s
        );

        assertEq(jobId, 1);
        assertEq(token.balanceOf(address(escrow)), amount);
    }

    function test_CreateJob_RevertsIf_ZeroAmount() public {
        vm.prank(client);
        vm.expectRevert(Escrow.ZeroAmount.selector);
        escrow.createJob(freelancer, 0);
    }

    function test_CreateJob_RevertsIf_AmountTooSmall() public {
        vm.prank(client);
        vm.expectRevert(Escrow.AmountTooSmall.selector);
        escrow.createJob(freelancer, 1);
    }

    function test_CreateJob_RevertsIf_FreelancerIsZero() public {
        vm.prank(client);
        vm.expectRevert(Escrow.InvalidFreelancer.selector);
        escrow.createJob(address(0), JOB_AMOUNT);
    }

    function test_CreateJob_RevertsIf_ClientIsFreelancer() public {
        vm.prank(client);
        vm.expectRevert(Escrow.ClientCannotBeFreelancer.selector);
        escrow.createJob(client, JOB_AMOUNT);
    }

    // =========================================================================
    // releasePartial Tests
    // =========================================================================

    function test_ReleasePartial_HappyPath_ByClient() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        uint256 expectedPartial = 800 * 1e6;

        vm.expectEmit(true, false, false, true);
        emit PartialReleased(jobId, expectedPartial);

        vm.prank(client);
        escrow.releasePartial(jobId);

        assertEq(token.balanceOf(freelancer), expectedPartial);
        assertEq(token.balanceOf(address(escrow)), 200 * 1e6);

        Escrow.Job memory job = escrow.getJob(jobId);
        assertEq(uint8(job.state), uint8(Escrow.JobState.PartiallyReleased));
    }

    function test_ReleasePartial_HappyPath_ByFreelancer() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        uint256 expectedPartial = 800 * 1e6;

        vm.expectEmit(true, false, false, true);
        emit PartialReleased(jobId, expectedPartial);

        vm.prank(freelancer);
        escrow.releasePartial(jobId);

        assertEq(token.balanceOf(freelancer), expectedPartial);
    }

    function test_ReleasePartialWithSig_HappyPath() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = escrow.nonces(client);

        bytes32 structHash = keccak256(
            abi.encode(escrow.RELEASE_PARTIAL_TYPEHASH(), jobId, nonce, deadline)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", escrow.DOMAIN_SEPARATOR(), structHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(clientPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Submitted gaslessly by relayer/facilitator
        vm.prank(unauthorized);
        escrow.releasePartialWithSig(jobId, deadline, signature);

        assertEq(token.balanceOf(freelancer), 800 * 1e6);
    }

    function test_ReleasePartialWithSig_RevertsIf_Expired() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        bytes memory emptySig = new bytes(65);
        vm.expectRevert(Escrow.SignatureExpired.selector);
        escrow.releasePartialWithSig(jobId, block.timestamp - 1, emptySig);
    }

    function test_ReleasePartial_RevertsIf_JobDoesNotExist() public {
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(Escrow.JobDoesNotExist.selector, 999));
        escrow.releasePartial(999);
    }

    function test_ReleasePartial_RevertsIf_UnauthorizedCaller() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSelector(Escrow.UnauthorizedCaller.selector, unauthorized));
        escrow.releasePartial(jobId);
    }

    function test_ReleasePartial_RevertsIf_DoubleReleaseAttempt() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        vm.prank(client);
        escrow.releasePartial(jobId);

        vm.prank(client);
        vm.expectRevert(
            abi.encodeWithSelector(
                Escrow.InvalidJobState.selector,
                jobId,
                Escrow.JobState.Funded,
                Escrow.JobState.PartiallyReleased
            )
        );
        escrow.releasePartial(jobId);
    }

    function test_ReleasePartial_RevertsIf_JobCancelled() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        vm.prank(client);
        escrow.cancelJob(jobId);

        vm.prank(client);
        vm.expectRevert(
            abi.encodeWithSelector(
                Escrow.InvalidJobState.selector,
                jobId,
                Escrow.JobState.Funded,
                Escrow.JobState.Cancelled
            )
        );
        escrow.releasePartial(jobId);
    }

    // =========================================================================
    // releaseRemainder Tests
    // =========================================================================

    function test_ReleaseRemainder_HappyPath_ByClientBeforeTimeout() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        vm.prank(client);
        escrow.releasePartial(jobId);

        uint256 expectedRemainder = 200 * 1e6;

        vm.expectEmit(true, false, false, true);
        emit RemainderReleased(jobId, expectedRemainder);

        vm.warp(block.timestamp + 1 days);
        vm.prank(client);
        escrow.releaseRemainder(jobId);

        assertEq(token.balanceOf(freelancer), JOB_AMOUNT);
        assertEq(token.balanceOf(address(escrow)), 0);

        Escrow.Job memory job = escrow.getJob(jobId);
        assertEq(uint8(job.state), uint8(Escrow.JobState.Completed));
    }

    function test_ReleaseRemainderWithSig_HappyPath() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        vm.prank(client);
        escrow.releasePartial(jobId);

        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = escrow.nonces(client);

        bytes32 structHash = keccak256(
            abi.encode(escrow.RELEASE_REMAINDER_TYPEHASH(), jobId, nonce, deadline)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", escrow.DOMAIN_SEPARATOR(), structHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(clientPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Submitted by relayer
        vm.prank(unauthorized);
        escrow.releaseRemainderWithSig(jobId, deadline, signature);

        assertEq(token.balanceOf(freelancer), JOB_AMOUNT);
    }

    function test_ReleaseRemainder_HappyPath_AfterTimeout_ByFreelancer() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        vm.prank(client);
        escrow.releasePartial(jobId);

        vm.warp(block.timestamp + DEFAULT_TIMEOUT_WINDOW);

        vm.prank(freelancer);
        escrow.releaseRemainder(jobId);

        assertEq(token.balanceOf(freelancer), JOB_AMOUNT);
    }

    function test_ReleaseRemainder_HappyPath_AfterTimeout_ByAnyone() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        vm.prank(client);
        escrow.releasePartial(jobId);

        vm.warp(block.timestamp + DEFAULT_TIMEOUT_WINDOW + 1 hours);

        vm.prank(unauthorized);
        escrow.releaseRemainder(jobId);

        assertEq(token.balanceOf(freelancer), JOB_AMOUNT);
    }

    function test_ReleaseRemainder_RevertsIf_UnauthorizedCallerBeforeTimeout() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        vm.prank(client);
        escrow.releasePartial(jobId);

        vm.warp(block.timestamp + 3 days);

        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSelector(Escrow.UnauthorizedCaller.selector, unauthorized));
        escrow.releaseRemainder(jobId);
    }

    function test_ReleaseRemainder_RevertsIf_NotPartiallyReleased() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        vm.prank(client);
        vm.expectRevert(
            abi.encodeWithSelector(
                Escrow.InvalidJobState.selector,
                jobId,
                Escrow.JobState.PartiallyReleased,
                Escrow.JobState.Funded
            )
        );
        escrow.releaseRemainder(jobId);
    }

    function test_ReleaseRemainder_RevertsIf_DoubleReleaseAttempt() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        vm.prank(client);
        escrow.releasePartial(jobId);

        vm.prank(client);
        escrow.releaseRemainder(jobId);

        vm.prank(client);
        vm.expectRevert(
            abi.encodeWithSelector(
                Escrow.InvalidJobState.selector,
                jobId,
                Escrow.JobState.PartiallyReleased,
                Escrow.JobState.Completed
            )
        );
        escrow.releaseRemainder(jobId);
    }

    function test_ReleaseRemainder_RevertsIf_JobDoesNotExist() public {
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(Escrow.JobDoesNotExist.selector, 999));
        escrow.releaseRemainder(999);
    }

    // =========================================================================
    // cancelJob Tests
    // =========================================================================

    function test_CancelJob_HappyPath_BeforePartialRelease() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        assertEq(token.balanceOf(client), INITIAL_BALANCE - JOB_AMOUNT);

        vm.expectEmit(true, false, false, false);
        emit JobCancelled(jobId);

        vm.prank(client);
        escrow.cancelJob(jobId);

        assertEq(token.balanceOf(client), INITIAL_BALANCE);
        assertEq(token.balanceOf(address(escrow)), 0);

        Escrow.Job memory job = escrow.getJob(jobId);
        assertEq(uint8(job.state), uint8(Escrow.JobState.Cancelled));
    }

    function test_CancelJobWithSig_HappyPath() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = escrow.nonces(client);

        bytes32 structHash = keccak256(
            abi.encode(escrow.CANCEL_JOB_TYPEHASH(), jobId, nonce, deadline)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", escrow.DOMAIN_SEPARATOR(), structHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(clientPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(unauthorized);
        escrow.cancelJobWithSig(jobId, deadline, signature);

        assertEq(token.balanceOf(client), INITIAL_BALANCE);
    }

    function test_CancelJob_RevertsIf_CalledAfterPartialRelease() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        vm.prank(client);
        escrow.releasePartial(jobId);

        vm.prank(client);
        vm.expectRevert(
            abi.encodeWithSelector(
                Escrow.InvalidJobState.selector,
                jobId,
                Escrow.JobState.Funded,
                Escrow.JobState.PartiallyReleased
            )
        );
        escrow.cancelJob(jobId);
    }

    function test_CancelJob_RevertsIf_UnauthorizedCaller() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        vm.prank(freelancer);
        vm.expectRevert(abi.encodeWithSelector(Escrow.UnauthorizedCaller.selector, freelancer));
        escrow.cancelJob(jobId);
    }

    function test_CancelJob_RevertsIf_AlreadyCancelled() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        vm.prank(client);
        escrow.cancelJob(jobId);

        vm.prank(client);
        vm.expectRevert(
            abi.encodeWithSelector(
                Escrow.InvalidJobState.selector,
                jobId,
                Escrow.JobState.Funded,
                Escrow.JobState.Cancelled
            )
        );
        escrow.cancelJob(jobId);
    }

    function test_CancelJob_RevertsIf_JobDoesNotExist() public {
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(Escrow.JobDoesNotExist.selector, 999));
        escrow.cancelJob(999);
    }

    // =========================================================================
    // Extend Timeout Tests
    // =========================================================================

    function test_ExtendTimeout_HappyPath() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        vm.expectEmit(true, false, false, true);
        emit TimeoutExtended(jobId, uint32(DEFAULT_TIMEOUT_WINDOW + 3 days));

        vm.prank(client);
        escrow.extendTimeout(jobId, 3 days);

        Escrow.Job memory job = escrow.getJob(jobId);
        assertEq(job.timeoutWindow, DEFAULT_TIMEOUT_WINDOW + 3 days);
    }

    function test_ExtendTimeout_RevertsIf_CallerNotClient() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        vm.prank(freelancer);
        vm.expectRevert(abi.encodeWithSelector(Escrow.UnauthorizedCaller.selector, freelancer));
        escrow.extendTimeout(jobId, 3 days);
    }

    // =========================================================================
    // View Functions & Batch Query Tests
    // =========================================================================

    function test_BatchQuery_GetJobs() public {
        vm.prank(client);
        uint256 job1 = escrow.createJob(freelancer, 100 * 1e6);
        vm.prank(client);
        uint256 job2 = escrow.createJob(freelancer, 200 * 1e6);

        uint256[] memory ids = new uint256[](2);
        ids[0] = job1;
        ids[1] = job2;

        Escrow.Job[] memory batch = escrow.getJobs(ids);
        assertEq(batch.length, 2);
        assertEq(batch[0].amount, 100 * 1e6);
        assertEq(batch[1].amount, 200 * 1e6);

        uint256[] memory clientJobs = escrow.getClientJobIds(client);
        assertEq(clientJobs.length, 2);
        assertEq(clientJobs[0], job1);
        assertEq(clientJobs[1], job2);

        uint256[] memory freelancerJobs = escrow.getFreelancerJobIds(freelancer);
        assertEq(freelancerJobs.length, 2);
    }

    function test_GetJob_RevertsIf_JobDoesNotExist() public {
        vm.expectRevert(abi.encodeWithSelector(Escrow.JobDoesNotExist.selector, 123));
        escrow.getJob(123);
    }

    // =========================================================================
    // Fuzz Testing & Accounting Integrity
    // =========================================================================

    function testFuzz_FullLifecycle(uint256 amount) public {
        amount = bound(amount, 100, 10_000_000 * 1e6);

        token.mint(client, amount);

        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, amount);

        Escrow.Job memory job = escrow.getJob(jobId);
        assertEq(job.partialAmount + job.remainderAmount, amount);

        uint256 freelancerBalBefore = token.balanceOf(freelancer);

        vm.prank(client);
        escrow.releasePartial(jobId);
        assertEq(token.balanceOf(freelancer), freelancerBalBefore + job.partialAmount);

        vm.prank(client);
        escrow.releaseRemainder(jobId);
        assertEq(token.balanceOf(freelancer), freelancerBalBefore + amount);
    }

    function testFuzz_CreateAndCancel(uint256 amount) public {
        amount = bound(amount, 100, 10_000_000 * 1e6);

        token.mint(client, amount);
        uint256 clientBalBefore = token.balanceOf(client);

        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, amount);

        assertEq(token.balanceOf(client), clientBalBefore - amount);

        vm.prank(client);
        escrow.cancelJob(jobId);

        assertEq(token.balanceOf(client), clientBalBefore);
    }

    // =========================================================================
    // Advanced Production Edge Cases
    // =========================================================================

    function test_CreateJob_RevertsIf_AmountExceedsUint128() public {
        uint256 hugeAmount = uint256(type(uint128).max) + 1;
        vm.prank(client);
        vm.expectRevert(Escrow.AmountExceedsUint128.selector);
        escrow.createJob(freelancer, hugeAmount);
    }

    function test_ExtendTimeout_RevertsIf_JobDoesNotExist() public {
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(Escrow.JobDoesNotExist.selector, 999));
        escrow.extendTimeout(999, 1 days);
    }

    function test_ExtendTimeout_RevertsIf_ZeroExtension() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        vm.prank(client);
        vm.expectRevert(Escrow.InvalidTimeoutWindow.selector);
        escrow.extendTimeout(jobId, 0);
    }

    function test_ExtendTimeout_RevertsIf_JobCancelled() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);
        vm.prank(client);
        escrow.cancelJob(jobId);

        vm.prank(client);
        vm.expectRevert(
            abi.encodeWithSelector(
                Escrow.InvalidJobState.selector,
                jobId,
                Escrow.JobState.PartiallyReleased,
                Escrow.JobState.Cancelled
            )
        );
        escrow.extendTimeout(jobId, 1 days);
    }

    function test_ReleasePartialWithSig_RevertsIf_InvalidSigner() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash = keccak256(
            abi.encode(escrow.RELEASE_PARTIAL_TYPEHASH(), jobId, escrow.nonces(client), deadline)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", escrow.DOMAIN_SEPARATOR(), structHash)
        );
        // Signed by unauthorized
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(unauthorizedPrivateKey, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        vm.expectRevert(Escrow.InvalidSignature.selector);
        escrow.releasePartialWithSig(jobId, deadline, sig);
    }

    function test_ReleaseRemainderWithSig_RevertsIf_Expired() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        bytes memory emptySig = new bytes(65);
        vm.expectRevert(Escrow.SignatureExpired.selector);
        escrow.releaseRemainderWithSig(jobId, block.timestamp - 1, emptySig);
    }

    function test_ReleaseRemainderWithSig_RevertsIf_InvalidSigner() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);
        vm.prank(client);
        escrow.releasePartial(jobId);

        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash = keccak256(
            abi.encode(escrow.RELEASE_REMAINDER_TYPEHASH(), jobId, escrow.nonces(client), deadline)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", escrow.DOMAIN_SEPARATOR(), structHash)
        );
        // Signed by unauthorized instead of client
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(unauthorizedPrivateKey, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        vm.expectRevert(Escrow.InvalidSignature.selector);
        escrow.releaseRemainderWithSig(jobId, deadline, sig);
    }

    function test_CancelJobWithSig_RevertsIf_Expired() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        bytes memory emptySig = new bytes(65);
        vm.expectRevert(Escrow.SignatureExpired.selector);
        escrow.cancelJobWithSig(jobId, block.timestamp - 1, emptySig);
    }

    function test_CancelJobWithSig_RevertsIf_InvalidSigner() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob(freelancer, JOB_AMOUNT);

        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash = keccak256(
            abi.encode(escrow.CANCEL_JOB_TYPEHASH(), jobId, escrow.nonces(client), deadline)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", escrow.DOMAIN_SEPARATOR(), structHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(unauthorizedPrivateKey, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        vm.expectRevert(Escrow.InvalidSignature.selector);
        escrow.cancelJobWithSig(jobId, deadline, sig);
    }
}

