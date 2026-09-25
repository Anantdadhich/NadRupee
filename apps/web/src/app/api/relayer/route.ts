import { NextRequest, NextResponse } from "next/server";
import {
  checkJobIdempotency,
  checkRelayerHealth,
  getRelayerWalletClient,
  type RelayerAction,
} from "@/lib/relayer/service";
import { ESCROW_CONTRACT_ADDRESS } from "@/lib/contracts/config";
import { escrowAbi } from "@/lib/contracts/escrowAbi";
import { publicClient } from "@/lib/monad/chain";

const ALLOWED_ACTIONS: RelayerAction[] = [
  "releasePartialWithSig",
  "releaseRemainderWithSig",
  "cancelJobWithSig",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const { action, jobId, deadline, signature } = body;

    // 1. Parameter Validation
    if (!action || !ALLOWED_ACTIONS.includes(action as RelayerAction)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid action '${action}'. Must be one of: ${ALLOWED_ACTIONS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (jobId === undefined || jobId === null || isNaN(Number(jobId)) || Number(jobId) <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing 'jobId'. Must be a positive integer." },
        { status: 400 }
      );
    }

    if (
      deadline === undefined ||
      deadline === null ||
      isNaN(Number(deadline)) ||
      Number(deadline) <= 0
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing 'deadline'. Must be a unix timestamp in seconds." },
        { status: 400 }
      );
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (Number(deadline) < currentTimestamp) {
      return NextResponse.json(
        {
          success: false,
          error: `Signature has expired. Deadline: ${deadline}, current time: ${currentTimestamp}.`,
        },
        { status: 400 }
      );
    }

    if (
      !signature ||
      typeof signature !== "string" ||
      !signature.startsWith("0x") ||
      signature.length !== 132
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid ECDSA signature format. Expected 65-byte hex string (0x + 130 hex chars).",
        },
        { status: 400 }
      );
    }

    // 2. Relayer Wallet Health & Gas Check
    const relayerHealth = await checkRelayerHealth();
    if (!relayerHealth.isConfigured) {
      return NextResponse.json(
        {
          success: false,
          error: "Relayer service is unconfigured. Set RELAYER_PRIVATE_KEY on the server.",
        },
        { status: 503 }
      );
    }

    if (parseFloat(relayerHealth.balanceMon) === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Relayer wallet (${relayerHealth.address}) has 0 MON. Cannot sponsor gas on Monad Testnet.`,
        },
        { status: 503 }
      );
    }

    const numericJobId = BigInt(jobId);
    const numericDeadline = BigInt(deadline);

    // 3. Idempotency Check Before Broadcasting
    // Reads on-chain state to prevent submitting duplicate signatures and wasting relayer gas
    const idempotency = await checkJobIdempotency(numericJobId, action as RelayerAction);

    if (idempotency.alreadyProcessed) {
      return NextResponse.json(
        {
          success: true,
          alreadyProcessed: true,
          jobId: jobId.toString(),
          state: idempotency.state,
          stateLabel: idempotency.stateLabel,
          message: idempotency.message,
        },
        { status: 200 }
      );
    }

    if (!idempotency.proceed) {
      return NextResponse.json(
        {
          success: false,
          alreadyProcessed: false,
          jobId: jobId.toString(),
          state: idempotency.state,
          stateLabel: idempotency.stateLabel,
          error: idempotency.errorMessage || "Cannot execute action for job in current state.",
        },
        { status: 400 }
      );
    }

    // 4. Broadcast Meta-Transaction via Relayer Wallet
    const walletClient = getRelayerWalletClient();

    let txHash: `0x${string}`;
    try {
      txHash = await walletClient.writeContract({
        address: ESCROW_CONTRACT_ADDRESS,
        abi: escrowAbi,
        functionName: action as any,
        args: [numericJobId, numericDeadline, signature as `0x${string}`],
      });
    } catch (broadcastErr: any) {
      console.error(`[Relayer] Broadcast error on ${action}:`, broadcastErr);

      // Re-check if it reverted due to a race condition (e.g., parallel request succeeded right before)
      const postCheck = await checkJobIdempotency(numericJobId, action as RelayerAction);
      if (postCheck.alreadyProcessed) {
        return NextResponse.json(
          {
            success: true,
            alreadyProcessed: true,
            jobId: jobId.toString(),
            state: postCheck.state,
            stateLabel: postCheck.stateLabel,
            message: postCheck.message,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            broadcastErr?.shortMessage ||
            broadcastErr?.message ||
            "Failed to broadcast meta-transaction to Monad Testnet.",
        },
        { status: 500 }
      );
    }

    // 5. Wait for Transaction Confirmation on Monad Testnet (sub-second finality)
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 30_000,
    });

    return NextResponse.json(
      {
        success: receipt.status === "success",
        alreadyProcessed: false,
        txHash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
        action,
        jobId: jobId.toString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Relayer Route Exception]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Internal server error processing relayer request.",
      },
      { status: 500 }
    );
  }
}
