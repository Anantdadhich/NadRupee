export const MONAD_CHAIN_ID = 10143;
export const MONAD_RPC_URL = 'https://testnet-rpc.monad.xyz';
export const MONAD_EXPLORER_URL = 'https://testnet.monadexplorer.com';

// Contract Addresses deployed on Monad Testnet
export const ESCROW_CONTRACT_ADDRESS = '0xBEe8F42f71ffFb7f2b34224ef5B88671Db2D97C4';
export const AUSD_CONTRACT_ADDRESS = '0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC';
export const RELAYER_ADDRESS = '0x47Cc14B5D120E404d6fddf86C136B392529d1123';

// 1-Click Pre-Configured Testnet Passkey EOA (Deterministic)
export const TESTNET_PASSKEY_ADDRESS = '0xCf098B151d867CE2874FC13CAED17b81E1f73688';

export const KNOWN_FREELANCERS: Record<string, string> = {
  '@arjun.monad': '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  '@priya.dev': '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  '@rohit.sol': '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
};

export enum JobState {
  None = 0,
  Funded = 1,
  PartiallyReleased = 2,
  Completed = 3,
  Cancelled = 4,
}

export const JOB_STATE_LABELS: Record<JobState, string> = {
  [JobState.None]: 'None',
  [JobState.Funded]: 'Funded (Locked)',
  [JobState.PartiallyReleased]: '80% Released',
  [JobState.Completed]: 'Completed',
  [JobState.Cancelled]: 'Cancelled',
};

export interface EscrowJobItem {
  id: string;
  title: string;
  client: string;
  freelancer: string;
  amountUsd: number;
  partialAmountUsd: number;
  remainderAmountUsd: number;
  state: JobState;
  createdAt: string;
  txHash: string;
}

export interface TransactionLedgerItem {
  id: string;
  type: 'Job funded' | 'Payment received' | 'Cash out' | 'Advance claimed';
  description: string;
  amountInr: number;
  amountUsd: number;
  isCredit: boolean;
  timestamp: string;
  referenceCode?: string;
  onchainTxHash?: string;
}

export const INITIAL_JOBS: EscrowJobItem[] = [
  {
    id: '1',
    title: 'Smart Contract Security Audit & Integration',
    client: '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7',
    freelancer: TESTNET_PASSKEY_ADDRESS,
    amountUsd: 1000,
    partialAmountUsd: 800,
    remainderAmountUsd: 200,
    state: JobState.Funded,
    createdAt: 'Just now',
    txHash: '0xeb811ab986f51ce4323f38cb3b475b837a1d7c162bac3b881773608dd754e4b7',
  },
  {
    id: '2',
    title: 'DeFi Liquidity Engine Mobile UI Design',
    client: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    freelancer: TESTNET_PASSKEY_ADDRESS,
    amountUsd: 650,
    partialAmountUsd: 520,
    remainderAmountUsd: 130,
    state: JobState.PartiallyReleased,
    createdAt: '1 day ago',
    txHash: '0xa41c7b8d3f11e987c234a90123efd5b88671db2d97c410143a9012a055bd4e0e',
  },
];
