import { type Address } from "viem";

export enum JobState {
  None = 0,
  Funded = 1,
  PartiallyReleased = 2,
  Completed = 3,
  Cancelled = 4,
}

export const JOB_STATE_LABELS: Record<JobState, string> = {
  [JobState.None]: "None",
  [JobState.Funded]: "Funded (Locked)",
  [JobState.PartiallyReleased]: "80% Released",
  [JobState.Completed]: "Completed",
  [JobState.Cancelled]: "Cancelled",
};

export const MONAD_CHAIN_ID = 10143;
export const AUSD_DECIMALS = 6;
export const DEFAULT_PARTIAL_BPS = 8000; // 80% instant payout
export const DEFAULT_TIMEOUT_WINDOW = 604800; // 7 days in seconds

// Agora Public API
export const AGORA_METRICS_API = "https://api.agora.finance/v0/metrics";

// Monad Testnet Contract Addresses
export const ESCROW_CONTRACT_ADDRESS: Address = (
  process.env.NEXT_PUBLIC_ESCROW_ADDRESS ||
  process.env.ESCROW_ADDRESS ||
  "0x0000000000000000000000000000000000000000"
) as Address;

export const AUSD_CONTRACT_ADDRESS: Address = (
  process.env.NEXT_PUBLIC_AUSD_ADDRESS ||
  process.env.AUSD_ADDRESS ||
  "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC"
) as Address;

export const ESCROW_EIP712_DOMAIN = {
  name: "NadRupee Escrow",
  version: "1",
  chainId: BigInt(MONAD_CHAIN_ID),
  verifyingContract: ESCROW_CONTRACT_ADDRESS,
} as const;

export const ESCROW_SIGNATURE_TYPES = {
  ReleasePartial: [
    { name: "jobId", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  ReleaseRemainder: [
    { name: "jobId", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  CancelJob: [
    { name: "jobId", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export interface EscrowJob {
  jobId: bigint;
  client: Address;
  createdAt: bigint;
  timeoutWindow: number;
  freelancer: Address;
  state: JobState;
  amount: bigint;
  partialAmount: bigint;
  remainderAmount: bigint;
  metadataHash: `0x${string}`;
}
