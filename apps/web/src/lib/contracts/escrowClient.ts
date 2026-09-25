import {
  type Address,
  type WalletClient,
  parseUnits,
  formatUnits,
  encodePacked,
  keccak256,
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

    return jobs.map((raw, idx) => ({
      jobId: jobIds[idx],
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
    }));
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

  return { txHash, jobId: undefined };
}
