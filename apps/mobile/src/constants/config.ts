export const MONAD_CHAIN_ID = 10143;
export const MONAD_RPC_URL = 'https://testnet-rpc.monad.xyz';
export const MONAD_EXPLORER_URL = 'https://testnet.monadexplorer.com';

// Contract Addresses deployed on Monad Testnet
export const ESCROW_CONTRACT_ADDRESS = '0xBEe8F42f71ffFb7f2b34224ef5B88671Db2D97C4';
export const AUSD_CONTRACT_ADDRESS = '0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC';
export const RELAYER_ADDRESS = '0x47Cc14B5D120E404d6fddf86C136B392529d1123';

// 1-Click Pre-Configured Testnet Passkey EOA (Deterministic for testing)
export const TESTNET_PASSKEY_ADDRESS = '0xCf098B151d867CE2874FC13CAED17b81E1f73688';

/**
 * Gates testnet passkey bypass so it is only available in our browser / localhost
 * and never shown on public production deployments.
 */
export const isLocalOrTestEnvironment = (): boolean => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.local') ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.includes('preview')
    );
  }
  return typeof __DEV__ !== 'undefined' ? __DEV__ : false;
};

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
  txHash?: string;
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
