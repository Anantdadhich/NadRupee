import {
  createWalletClient,
  http,
  formatEther,
  type Address,
  type Hex,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet, publicClient } from "@/lib/monad/chain";
import {
  ESCROW_CONTRACT_ADDRESS,
  JobState,
  JOB_STATE_LABELS,
} from "@/lib/contracts/config";
import { escrowAbi } from "@/lib/contracts/escrowAbi";

export const MIN_RELAYER_BALANCE_MON = 0.05; // Alert if relayer balance drops below 0.05 MON

/**
 * Normalizes private key hex string
 */
function getRelayerPrivateKey(): `0x${string}` | null {
  const key = process.env.RELAYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!key) return null;
  const cleaned = key.trim();
  if (cleaned.startsWith("0x")) return cleaned as `0x${string}`;
  return `0x${cleaned}` as `0x${string}`;
}

/**
 * Returns the relayer account if configured
 */
export function getRelayerAccount() {
  const privateKey = getRelayerPrivateKey();
  if (!privateKey) {
    return null;
  }
  try {
    return privateKeyToAccount(privateKey);
  } catch (err) {
    console.error("[Relayer] Failed to derive account from private key:", err);
    return null;
  }
}

/**
 * Returns a Viem WalletClient backed by the relayer's private key targeting Monad Testnet
 */
export function getRelayerWalletClient() {
  const account = getRelayerAccount();
  if (!account) {
    throw new Error(
      "Relayer private key is not configured. Set RELAYER_PRIVATE_KEY in .env.local"
    );
  }

  return createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  });
}

/**
 * Inspects relayer wallet balance and health
 */
export async function checkRelayerHealth() {
  const account = getRelayerAccount();
  if (!account) {
    return {
      status: "unconfigured" as const,
      isConfigured: false,
      address: null,
      balanceMon: "0",
      balanceWei: "0",
      isLowBalance: true,
      minRecommendedMon: MIN_RELAYER_BALANCE_MON.toString(),
      message:
        "RELAYER_PRIVATE_KEY is not configured in environment variables.",
    };
  }

  try {
    const balanceWei = await publicClient.getBalance({
      address: account.address,
    });
    const balanceMon = formatEther(balanceWei);
    const balanceNum = parseFloat(balanceMon);
    const isLowBalance = balanceNum < MIN_RELAYER_BALANCE_MON;

    return {
      status: isLowBalance ? ("low_balance" as const) : ("healthy" as const),
      isConfigured: true,
      address: account.address,
      balanceMon,
      balanceWei: balanceWei.toString(),
      isLowBalance,
      minRecommendedMon: MIN_RELAYER_BALANCE_MON.toString(),
      message: isLowBalance
        ? `Warning: Relayer MON balance (${balanceMon} MON) is below recommended ${MIN_RELAYER_BALANCE_MON} MON threshold. Please faucet more MON on Monad Testnet.`
        : "Relayer wallet is adequately funded and operational.",
    };
  } catch (error: any) {
    return {
      status: "rpc_error" as const,
      isConfigured: true,
      address: account.address,
      balanceMon: "0",
      balanceWei: "0",
      isLowBalance: true,
      minRecommendedMon: MIN_RELAYER_BALANCE_MON.toString(),
      message: `Failed to query relayer balance from Monad RPC: ${error?.message || error}`,
    };
  }
}

export type RelayerAction =
  | "releasePartialWithSig"
  | "releaseRemainderWithSig"
  | "cancelJobWithSig";

export interface IdempotencyCheckResult {
  proceed: boolean;
  alreadyProcessed: boolean;
  state?: JobState;
  stateLabel?: string;
  errorMessage?: string;
  message?: string;
}

/**
 * Performs an on-chain idempotency check via publicClient.readContract before broadcasting.
 * Prevents duplicate transactions, wasted relayer gas, and confusing client reverts.
 */
export async function checkJobIdempotency(
  jobId: bigint,
  action: RelayerAction
): Promise<IdempotencyCheckResult> {
  if (
    !ESCROW_CONTRACT_ADDRESS ||
    ESCROW_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    return {
      proceed: false,
      alreadyProcessed: false,
      errorMessage:
        "ESCROW_CONTRACT_ADDRESS is not set. Please deploy and configure the contract address.",
    };
  }

  try {
    const job = await publicClient.readContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: escrowAbi,
      functionName: "getJob",
      args: [jobId],
    });

    const currentState = job.state as JobState;
    const stateLabel = JOB_STATE_LABELS[currentState] || `Unknown (${currentState})`;

    if (currentState === JobState.None) {
      return {
        proceed: false,
        alreadyProcessed: false,
        state: currentState,
        stateLabel,
        errorMessage: `Job #${jobId.toString()} does not exist on-chain.`,
      };
    }

    if (action === "releasePartialWithSig") {
      // Target: transition Funded (1) -> PartiallyReleased (2)
      if (
        currentState === JobState.PartiallyReleased ||
        currentState === JobState.Completed
      ) {
        return {
          proceed: false,
          alreadyProcessed: true,
          state: currentState,
          stateLabel,
          message: `Job #${jobId.toString()} partial payment (80%) has already been released (current state: ${stateLabel}).`,
        };
      }
      if (currentState === JobState.Cancelled) {
        return {
          proceed: false,
          alreadyProcessed: false,
          state: currentState,
          stateLabel,
          errorMessage: `Cannot release partial payout: Job #${jobId.toString()} has been cancelled.`,
        };
      }
      if (currentState === JobState.Funded) {
        return {
          proceed: true,
          alreadyProcessed: false,
          state: currentState,
          stateLabel,
        };
      }
    }

    if (action === "releaseRemainderWithSig") {
      // Target: transition PartiallyReleased (2) -> Completed (3)
      if (currentState === JobState.Completed) {
        return {
          proceed: false,
          alreadyProcessed: true,
          state: currentState,
          stateLabel,
          message: `Job #${jobId.toString()} remainder payment has already been released and completed.`,
        };
      }
      if (currentState === JobState.Funded) {
        return {
          proceed: false,
          alreadyProcessed: false,
          state: currentState,
          stateLabel,
          errorMessage: `Job #${jobId.toString()} must have its initial 80% partial release executed before remainder release can occur.`,
        };
      }
      if (currentState === JobState.Cancelled) {
        return {
          proceed: false,
          alreadyProcessed: false,
          state: currentState,
          stateLabel,
          errorMessage: `Cannot release remainder: Job #${jobId.toString()} has been cancelled.`,
        };
      }
      if (currentState === JobState.PartiallyReleased) {
        return {
          proceed: true,
          alreadyProcessed: false,
          state: currentState,
          stateLabel,
        };
      }
    }

    if (action === "cancelJobWithSig") {
      // Target: transition Funded (1) -> Cancelled (4)
      if (currentState === JobState.Cancelled) {
        return {
          proceed: false,
          alreadyProcessed: true,
          state: currentState,
          stateLabel,
          message: `Job #${jobId.toString()} has already been cancelled.`,
        };
      }
      if (
        currentState === JobState.PartiallyReleased ||
        currentState === JobState.Completed
      ) {
        return {
          proceed: false,
          alreadyProcessed: false,
          state: currentState,
          stateLabel,
          errorMessage: `Job #${jobId.toString()} cannot be cancelled because partial funds have already been released to the freelancer.`,
        };
      }
      if (currentState === JobState.Funded) {
        return {
          proceed: true,
          alreadyProcessed: false,
          state: currentState,
          stateLabel,
        };
      }
    }

    return {
      proceed: true,
      alreadyProcessed: false,
      state: currentState,
      stateLabel,
    };
  } catch (error: any) {
    // If the contract reverts with JobDoesNotExist
    if (error?.message?.includes("JobDoesNotExist")) {
      return {
        proceed: false,
        alreadyProcessed: false,
        errorMessage: `Job #${jobId.toString()} does not exist on-chain.`,
      };
    }
    console.error("[Relayer Idempotency Check Error]:", error);
    return {
      proceed: false,
      alreadyProcessed: false,
      errorMessage: `Failed to verify job status on Monad testnet: ${error?.shortMessage || error?.message || error}`,
    };
  }
}
