import { type Address, type WalletClient, parseUnits } from "viem";
import { publicClient } from "@/lib/monad/chain";
import {
  ESCROW_CONTRACT_ADDRESS,
  ESCROW_EIP712_DOMAIN,
  ESCROW_SIGNATURE_TYPES,
  AUSD_CONTRACT_ADDRESS,
  AUSD_DECIMALS,
  AUSD_EIP712_DOMAIN,
  AUSD_PERMIT_TYPES,
} from "@/lib/contracts/config";
import { escrowAbi } from "@/lib/contracts/escrowAbi";
import { getAusdNonce } from "@/lib/contracts/escrowClient";


export interface RelayResult {
  success: boolean;
  alreadyProcessed?: boolean;
  txHash?: `0x${string}`;
  blockNumber?: string;
  gasUsed?: string;
  stateLabel?: string;
  message?: string;
  error?: string;
}

/**
 * Fetches the current on-chain nonce for the specified client account.
 * Crucial: Must be fetched immediately prior to signature creation.
 */
export async function getClientNonce(clientAddress: Address): Promise<bigint> {
  if (
    !ESCROW_CONTRACT_ADDRESS ||
    ESCROW_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    throw new Error(
      "Escrow contract address is not configured. Please deploy Escrow.sol to Monad testnet and set NEXT_PUBLIC_ESCROW_ADDRESS in .env.local."
    );
  }
  return publicClient.readContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: escrowAbi,
    functionName: "nonces",
    args: [clientAddress],
  });
}

/**
 * Signs and relays a gasless partial release (80% instant payout)
 */
export async function relayReleasePartial(params: {
  walletClient: WalletClient;
  jobId: bigint;
  clientAddress: Address;
  deadlineMinutes?: number;
}): Promise<RelayResult> {
  const { walletClient, jobId, clientAddress, deadlineMinutes = 30 } = params;

  if (!walletClient.account) {
    throw new Error("WalletClient account is not connected.");
  }

  // 1. Fresh on-chain nonce lookup
  const nonce = await getClientNonce(clientAddress);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMinutes * 60);

  // 2. Sign EIP-712 typed data with user's passkey-derived wallet
  const signature = await walletClient.signTypedData({
    account: walletClient.account,
    domain: {
      ...ESCROW_EIP712_DOMAIN,
      verifyingContract: ESCROW_CONTRACT_ADDRESS,
    },
    types: {
      ReleasePartial: ESCROW_SIGNATURE_TYPES.ReleasePartial,
    },
    primaryType: "ReleasePartial",
    message: {
      jobId,
      nonce,
      deadline,
    },
  });

  // 3. Post to backend relayer for sponsored gas broadcast
  const res = await fetch("/api/relayer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "releasePartialWithSig",
      jobId: jobId.toString(),
      deadline: deadline.toString(),
      signature,
    }),
  });

  const data = await res.json();
  if (!res.ok && !data.alreadyProcessed) {
    throw new Error(data.error || "Failed to relay partial release transaction");
  }

  return data;
}

/**
 * Signs and relays a gasless remainder release (20% completion payout)
 */
export async function relayReleaseRemainder(params: {
  walletClient: WalletClient;
  jobId: bigint;
  clientAddress: Address;
  deadlineMinutes?: number;
}): Promise<RelayResult> {
  const { walletClient, jobId, clientAddress, deadlineMinutes = 30 } = params;

  if (!walletClient.account) {
    throw new Error("WalletClient account is not connected.");
  }

  const nonce = await getClientNonce(clientAddress);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMinutes * 60);

  const signature = await walletClient.signTypedData({
    account: walletClient.account,
    domain: {
      ...ESCROW_EIP712_DOMAIN,
      verifyingContract: ESCROW_CONTRACT_ADDRESS,
    },
    types: {
      ReleaseRemainder: ESCROW_SIGNATURE_TYPES.ReleaseRemainder,
    },
    primaryType: "ReleaseRemainder",
    message: {
      jobId,
      nonce,
      deadline,
    },
  });

  const res = await fetch("/api/relayer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "releaseRemainderWithSig",
      jobId: jobId.toString(),
      deadline: deadline.toString(),
      signature,
    }),
  });

  const data = await res.json();
  if (!res.ok && !data.alreadyProcessed) {
    throw new Error(data.error || "Failed to relay remainder release transaction");
  }

  return data;
}

/**
 * Signs and relays a gasless job cancellation (pre-partial release full refund)
 */
export async function relayCancelJob(params: {
  walletClient: WalletClient;
  jobId: bigint;
  clientAddress: Address;
  deadlineMinutes?: number;
}): Promise<RelayResult> {
  const { walletClient, jobId, clientAddress, deadlineMinutes = 30 } = params;

  if (!walletClient.account) {
    throw new Error("WalletClient account is not connected.");
  }

  const nonce = await getClientNonce(clientAddress);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMinutes * 60);

  const signature = await walletClient.signTypedData({
    account: walletClient.account,
    domain: {
      ...ESCROW_EIP712_DOMAIN,
      verifyingContract: ESCROW_CONTRACT_ADDRESS,
    },
    types: {
      CancelJob: ESCROW_SIGNATURE_TYPES.CancelJob,
    },
    primaryType: "CancelJob",
    message: {
      jobId,
      nonce,
      deadline,
    },
  });

  const res = await fetch("/api/relayer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "cancelJobWithSig",
      jobId: jobId.toString(),
      deadline: deadline.toString(),
      signature,
    }),
  });

  const data = await res.json();
  if (!res.ok && !data.alreadyProcessed) {
    throw new Error(data.error || "Failed to relay job cancellation transaction");
  }

  return data;
}

/**
 * Signs an EIP-2612 permit with user's passkey and relays a gasless direct AUSD transfer
 */
export async function sendAusdGasless(params: {
  walletClient: WalletClient;
  recipientAddress: Address;
  amountUsd: number;
  deadlineMinutes?: number;
}): Promise<RelayResult> {
  const { walletClient, recipientAddress, amountUsd, deadlineMinutes = 30 } = params;

  if (!walletClient.account) {
    throw new Error("WalletClient account is not connected.");
  }

  const owner = walletClient.account.address;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMinutes * 60);

  // 1. Fetch current onchain nonce for AUSD
  const nonce = await getAusdNonce(owner);
  const amountWei = parseUnits(amountUsd.toString(), AUSD_DECIMALS);

  // 2. Fetch relayer address
  const healthRes = await fetch("/api/relayer/health");
  const healthData = await healthRes.json();
  if (!healthData.isConfigured || !healthData.address) {
    throw new Error("Gasless relayer is not configured on the server.");
  }
  const relayerAddress = healthData.address as Address;

  // 3. User signs EIP-2612 Permit typed data with passkey
  const signature = await walletClient.signTypedData({
    account: walletClient.account,
    domain: {
      ...AUSD_EIP712_DOMAIN,
      verifyingContract: AUSD_CONTRACT_ADDRESS,
    },
    types: {
      Permit: AUSD_PERMIT_TYPES.Permit,
    },
    primaryType: "Permit",
    message: {
      owner,
      spender: relayerAddress,
      value: amountWei,
      nonce,
      deadline,
    },
  });

  // 4. Submit to /api/transfer
  const res = await fetch("/api/transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner,
      recipient: recipientAddress,
      amountUsd,
      deadline: deadline.toString(),
      signature,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to execute gasless transfer");
  }

  // Record in sender's local history
  if (typeof window !== "undefined") {
    try {
      const historyKey = `nadrupee_transfers_${owner.toLowerCase()}`;
      const existing = JSON.parse(localStorage.getItem(historyKey) || "[]");
      existing.unshift({
        id: `tx-${Date.now()}`,
        type: "Sent AUSD (Gasless)",
        recipient: recipientAddress,
        amountUsd,
        txHash: data.txHash,
        timestamp: new Date().toUTCString(),
      });
      localStorage.setItem(historyKey, JSON.stringify(existing.slice(0, 50)));
    } catch (e) {
      console.warn("Failed to cache transfer history:", e);
    }
  }

  return data;
}

