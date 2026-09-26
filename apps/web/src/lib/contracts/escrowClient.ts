import {
  type Address,
  type WalletClient,
  parseUnits,
  formatUnits,
  encodePacked,
  keccak256,
  parseEventLogs,
} from "viem";
import { publicClient, monadTestnet } from "@/lib/monad/chain";
import {
  ESCROW_CONTRACT_ADDRESS,
  AUSD_CONTRACT_ADDRESS,
  AUSD_DECIMALS,
  JobState,
  type EscrowJob,
} from "./config";
import { escrowAbi } from "./escrowAbi";
import { ausdAbi } from "./ausdAbi";

export interface OnChainJobDetails {
  jobId: bigint;
  client: Address;
  freelancer: Address;
  amount: bigint;
  amountFormatted: string;
  partialAmount: bigint;
  partialAmountFormatted: string;
  remainderAmount: bigint;
  remainderAmountFormatted: string;
  state: JobState;
  createdAt: bigint;
  timeoutWindow: number;
  metadataHash: `0x${string}`;
  txHash?: string;
  deliverableTitle?: string;
}

/**
 * Fetches real on-chain AUSD balance for a given address
 */
export async function getAusdBalance(account: Address): Promise<{
  balanceWei: bigint;
  balanceFormatted: string;
}> {
  if (
    !AUSD_CONTRACT_ADDRESS ||
    AUSD_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    return { balanceWei: BigInt(0), balanceFormatted: "0.00" };
  }

  try {
    const bal = await publicClient.readContract({
      address: AUSD_CONTRACT_ADDRESS,
      abi: ausdAbi,
      functionName: "balanceOf",
      args: [account],
    });
    return {
      balanceWei: bal,
      balanceFormatted: formatUnits(bal, AUSD_DECIMALS),
    };
  } catch (error) {
    console.warn("[AUSD] Failed to read balance from Monad RPC:", error);
    return { balanceWei: BigInt(0), balanceFormatted: "0.00" };
  }
}

/**
 * Fetches a single job from Escrow.sol on Monad Testnet
 */
export async function getOnChainJob(
  jobId: bigint
): Promise<OnChainJobDetails | null> {
  if (
    !ESCROW_CONTRACT_ADDRESS ||
    ESCROW_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    return null;
  }

  try {
    const raw = await publicClient.readContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: escrowAbi,
      functionName: "getJob",
      args: [jobId],
    });

    return {
      jobId,
      client: raw.client,
      freelancer: raw.freelancer,
      amount: raw.amount,
      amountFormatted: formatUnits(raw.amount, AUSD_DECIMALS),
      partialAmount: raw.partialAmount,
      partialAmountFormatted: formatUnits(raw.partialAmount, AUSD_DECIMALS),
      remainderAmount: raw.remainderAmount,
      remainderAmountFormatted: formatUnits(raw.remainderAmount, AUSD_DECIMALS),
      state: raw.state as JobState,
      createdAt: raw.createdAt,
      timeoutWindow: raw.timeoutWindow,
      metadataHash: raw.metadataHash,
    };
  } catch (error) {
    console.error(`[Escrow] Failed to read job #${jobId}:`, error);
    return null;
  }
}

/**
 * Reads all jobs for a client or freelancer using Escrow.sol batch getters
 */
export async function getJobsForAccount(
  account: Address,
  role: "client" | "freelancer"
): Promise<OnChainJobDetails[]> {
  if (
    !ESCROW_CONTRACT_ADDRESS ||
    ESCROW_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    return [];
  }

  try {
    const jobIds = await publicClient.readContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: escrowAbi,
      functionName: role === "client" ? "getClientJobs" : "getFreelancerJobs",
      args: [account],
    });

    if (!jobIds || jobIds.length === 0) return [];

    const jobs = await publicClient.readContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: escrowAbi,
      functionName: "getJobs",
      args: [jobIds as bigint[]],
    });

    return jobs.map((raw, idx) => {
      const jId = jobIds[idx];
      let storedTx: string | undefined;
      let storedTitle: string | undefined;
      if (typeof window !== "undefined") {
        storedTx = localStorage.getItem(`nadrupee_job_tx_${jId.toString()}`) || undefined;
        storedTitle = localStorage.getItem(`nadrupee_job_title_${jId.toString()}`) || undefined;
      }

      return {
        jobId: jId,
        client: raw.client,
        freelancer: raw.freelancer,
        amount: raw.amount,
        amountFormatted: formatUnits(raw.amount, AUSD_DECIMALS),
        partialAmount: raw.partialAmount,
        partialAmountFormatted: formatUnits(raw.partialAmount, AUSD_DECIMALS),
        remainderAmount: raw.remainderAmount,
        remainderAmountFormatted: formatUnits(raw.remainderAmount, AUSD_DECIMALS),
        state: raw.state as JobState,
        createdAt: raw.createdAt,
        timeoutWindow: raw.timeoutWindow,
        metadataHash: raw.metadataHash,
        txHash: storedTx,
        deliverableTitle: storedTitle,
      };
    });
  } catch (error) {
    console.warn(`[Escrow] Failed to query ${role} jobs:`, error);
    return [];
  }
}

/**
 * Creates an onchain escrow job with real AUSD token transfer
 */
export async function createOnChainJob(params: {
  walletClient: WalletClient;
  freelancerAddress: Address;
  amountUsd: number;
  deliverableTitle: string;
}): Promise<{ txHash: `0x${string}`; jobId?: bigint }> {
  const { walletClient, freelancerAddress, amountUsd, deliverableTitle } = params;

  if (!walletClient.account) {
    throw new Error("Wallet account is not connected.");
  }

  if (
    !ESCROW_CONTRACT_ADDRESS ||
    ESCROW_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    throw new Error(
      "Escrow contract address is not configured. Please deploy Escrow.sol to Monad testnet and set NEXT_PUBLIC_ESCROW_ADDRESS in .env.local."
    );
  }

  const clientAddress = walletClient.account.address;
  const amountWei = parseUnits(amountUsd.toString(), AUSD_DECIMALS);
  const metadataHash = keccak256(encodePacked(["string"], [deliverableTitle]));

  // 1. Check current token allowance
  const currentAllowance = await publicClient.readContract({
    address: AUSD_CONTRACT_ADDRESS,
    abi: ausdAbi,
    functionName: "allowance",
    args: [clientAddress, ESCROW_CONTRACT_ADDRESS],
  });

  // 2. Approve Escrow contract if allowance is insufficient
  if (currentAllowance < amountWei) {
    const approveHash = await walletClient.writeContract({
      account: walletClient.account,
      chain: monadTestnet,
      address: AUSD_CONTRACT_ADDRESS,
      abi: ausdAbi,
      functionName: "approve",
      args: [ESCROW_CONTRACT_ADDRESS, amountWei],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  // 3. Call Escrow.createJob
  const txHash = await walletClient.writeContract({
    account: walletClient.account,
    chain: monadTestnet,
    address: ESCROW_CONTRACT_ADDRESS,
    abi: escrowAbi,
    functionName: "createJob",
    args: [freelancerAddress, amountWei, metadataHash],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  let createdJobId: bigint | undefined;
  try {
    const events = parseEventLogs({
      abi: escrowAbi,
      eventName: "JobCreated",
      logs: receipt.logs,
    });
    if (events.length > 0 && events[0].args?.jobId !== undefined) {
      createdJobId = events[0].args.jobId;
    }
  } catch (err) {
    console.warn("Could not parse JobCreated event logs:", err);
  }

  // Persist txHash & title for this job in localStorage for explorer navigation
  if (typeof window !== "undefined") {
    if (createdJobId !== undefined) {
      localStorage.setItem(`nadrupee_job_tx_${createdJobId.toString()}`, txHash);
      localStorage.setItem(`nadrupee_job_title_${createdJobId.toString()}`, deliverableTitle);
    }
    // Also record in client transaction history
    try {
      const historyKey = `nadrupee_history_${clientAddress.toLowerCase()}`;
      const existing = JSON.parse(localStorage.getItem(historyKey) || "[]");
      existing.unshift({
        type: "Job funded",
        jobId: createdJobId ? createdJobId.toString() : "Pending",
        amountUsd,
        deliverable: deliverableTitle,
        txHash,
        timestamp: new Date().toUTCString(),
      });
      localStorage.setItem(historyKey, JSON.stringify(existing.slice(0, 50)));

      // Also record in freelancer transaction history
      const freelancerHistoryKey = `nadrupee_history_${freelancerAddress.toLowerCase()}`;
      const freelancerExisting = JSON.parse(localStorage.getItem(freelancerHistoryKey) || "[]");
      freelancerExisting.unshift({
        type: "Job funded",
        jobId: createdJobId ? createdJobId.toString() : "New Contract",
        amountUsd,
        deliverable: deliverableTitle,
        txHash,
        timestamp: new Date().toUTCString(),
      });
      localStorage.setItem(freelancerHistoryKey, JSON.stringify(freelancerExisting.slice(0, 50)));
    } catch (e) {
      console.warn("Failed to cache history in localStorage:", e);
    }
  }

  return { txHash, jobId: createdJobId };
}
