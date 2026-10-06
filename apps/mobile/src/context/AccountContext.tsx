import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  TESTNET_PASSKEY_ADDRESS,
  isLocalOrTestEnvironment,
  EscrowJobItem,
  JobState,
  TransactionLedgerItem,
} from '../constants/config';
import {
  getLiveFxRate,
  generateImpsUtr,
  getOnChainAusdBalance,
  executeCashoutOnChain,
  executeSendAusdOnChain,
  fetchJobsForAccount,
} from '../services/monadRpc';

interface AccountContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  authType: 'testnet' | 'biometric' | null;
  ausdBalance: number;
  fxRate: number;
  jobs: EscrowJobItem[];
  ledger: TransactionLedgerItem[];
  connectTestnetPasskey: () => void;
  connectBiometricPasskey: () => Promise<void>;
  signOut: () => void;
  refreshAccountData: () => Promise<void>;
  claimAdvance: (jobId: string) => Promise<{ success: boolean; txHash: string }>;
  releaseRemainder: (jobId: string) => Promise<{ success: boolean; txHash: string }>;
  createJob: (title: string, freelancer: string, amount: number) => Promise<{ success: boolean; jobId: string }>;
  sendAusd: (recipient: string, amountUsd: number) => Promise<{ success: boolean; txHash: string }>;
  processCashout: (amountUsd: number, upiId: string) => Promise<{
    success: boolean;
    receiptId: string;
    utr: string;
    amountInr: number;
    amountUsd: number;
    txHash: string;
  }>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isLocal = isLocalOrTestEnvironment();
  const [address, setAddress] = useState<string | null>(isLocal ? TESTNET_PASSKEY_ADDRESS : null);
  const [isConnected, setIsConnected] = useState<boolean>(isLocal);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [authType, setAuthType] = useState<'testnet' | 'biometric' | null>(isLocal ? 'testnet' : null);
  const [ausdBalance, setAusdBalance] = useState<number>(0.0);
  const [fxRate, setFxRate] = useState<number>(96.0);
  const [jobs, setJobs] = useState<EscrowJobItem[]>([]);
  const [ledger, setLedger] = useState<TransactionLedgerItem[]>([]);

  // Load live FX on mount
  useEffect(() => {
    getLiveFxRate().then((res) => {
      if (res && res.rate > 0) {
        setFxRate(res.rate);
      }
    });
  }, []);

  // Fetch real on-chain balance, jobs, and ledger for the active address
  const refreshAccountData = useCallback(async () => {
    if (!address) {
      setAusdBalance(0);
      setJobs([]);
      setLedger([]);
      return;
    }

    try {
      // 1. Live on-chain AUSD balance via Monad RPC
      const bal = await getOnChainAusdBalance(address);
      setAusdBalance(bal);

      // 2. Live on-chain jobs from Monad Escrow contract
      const onchainJobs = await fetchJobsForAccount(address);

      // Load any locally stored jobs for this account and merge
      let mergedJobs: EscrowJobItem[] = [...onchainJobs];
      if (typeof window !== 'undefined' && window.localStorage) {
        const localKey = `nadrupee_mobile_jobs_${address.toLowerCase()}`;
        const stored = localStorage.getItem(localKey);
        if (stored) {
          try {
            const parsed: EscrowJobItem[] = JSON.parse(stored);
            const existingIds = new Set(mergedJobs.map((j) => j.id));
            for (const item of parsed) {
              if (!existingIds.has(item.id)) {
                mergedJobs.push(item);
              }
            }
          } catch (e) {
            console.warn('Failed to parse local stored jobs:', e);
          }
        }
      }
      setJobs(mergedJobs);

      // 3. Persistent transaction ledger for this address
      if (typeof window !== 'undefined' && window.localStorage) {
        const ledgerKey = `nadrupee_mobile_ledger_${address.toLowerCase()}`;
        const storedLedger = localStorage.getItem(ledgerKey);
        if (storedLedger) {
          try {
            setLedger(JSON.parse(storedLedger));
          } catch (e) {
            console.warn('Failed to parse local stored ledger:', e);
          }
        } else {
          setLedger([]);
        }
      }
    } catch (err) {
      console.warn('Error refreshing account data:', err);
    }
  }, [address]);

  useEffect(() => {
    refreshAccountData();
  }, [refreshAccountData]);

  const connectTestnetPasskey = useCallback(() => {
    setIsConnecting(true);
    setTimeout(() => {
      setAddress(TESTNET_PASSKEY_ADDRESS);
      setIsConnected(true);
      setAuthType('testnet');
      setIsConnecting(false);
    }, 250);
  }, []);

  const connectBiometricPasskey = useCallback(async () => {
    setIsConnecting(true);
    setTimeout(() => {
      setAddress(TESTNET_PASSKEY_ADDRESS);
      setIsConnected(true);
      setAuthType('biometric');
      setIsConnecting(false);
    }, 600);
  }, []);

  const signOut = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setAuthType(null);
    setAusdBalance(0);
    setJobs([]);
    setLedger([]);
  }, []);

  const saveLedgerItem = useCallback(
    (item: TransactionLedgerItem) => {
      setLedger((prev) => {
        const updated = [item, ...prev];
        if (address && typeof window !== 'undefined' && window.localStorage) {
          const ledgerKey = `nadrupee_mobile_ledger_${address.toLowerCase()}`;
          localStorage.setItem(ledgerKey, JSON.stringify(updated));
        }
        return updated;
      });
    },
    [address]
  );

  const saveLocalJobs = useCallback(
    (newJobs: EscrowJobItem[]) => {
      setJobs(newJobs);
      if (address && typeof window !== 'undefined' && window.localStorage) {
        const localKey = `nadrupee_mobile_jobs_${address.toLowerCase()}`;
        localStorage.setItem(localKey, JSON.stringify(newJobs));
      }
    },
    [address]
  );

  const claimAdvance = useCallback(
    async (jobId: string) => {
      const targetJob = jobs.find((j) => j.id === jobId);
      if (!targetJob) throw new Error('Escrow contract not found.');

      const utr = generateImpsUtr();
      const txHash = targetJob.txHash || '';

      const updatedJobs = jobs.map((j) =>
        j.id === jobId ? { ...j, state: JobState.PartiallyReleased } : j
      );
      saveLocalJobs(updatedJobs);

      const claimInr = Number((targetJob.partialAmountUsd * fxRate).toFixed(2));
      setAusdBalance((prev) => prev + targetJob.partialAmountUsd);

      const newItem: TransactionLedgerItem = {
        id: `tx-claim-${Date.now()}`,
        type: 'Advance claimed',
        description: `80% Instant Advance: ${targetJob.title}`,
        amountInr: claimInr,
        amountUsd: targetJob.partialAmountUsd,
        isCredit: true,
        timestamp: 'Just now',
        referenceCode: utr,
        ...(txHash ? { onchainTxHash: txHash } : {}),
      };

      saveLedgerItem(newItem);
      return { success: true, txHash };
    },
    [jobs, fxRate, saveLocalJobs, saveLedgerItem]
  );

  const releaseRemainder = useCallback(
    async (jobId: string) => {
      const targetJob = jobs.find((j) => j.id === jobId);
      if (!targetJob) throw new Error('Escrow contract not found.');

      const utr = generateImpsUtr();
      const txHash = targetJob.txHash || '';

      const updatedJobs = jobs.map((j) =>
        j.id === jobId ? { ...j, state: JobState.Completed } : j
      );
      saveLocalJobs(updatedJobs);

      const remainderInr = Number((targetJob.remainderAmountUsd * fxRate).toFixed(2));
      setAusdBalance((prev) => prev + targetJob.remainderAmountUsd);

      const newItem: TransactionLedgerItem = {
        id: `tx-remainder-${Date.now()}`,
        type: 'Payment received',
        description: `20% Milestone Remainder: ${targetJob.title}`,
        amountInr: remainderInr,
        amountUsd: targetJob.remainderAmountUsd,
        isCredit: true,
        timestamp: 'Just now',
        referenceCode: utr,
        ...(txHash ? { onchainTxHash: txHash } : {}),
      };

      saveLedgerItem(newItem);
      return { success: true, txHash };
    },
    [jobs, fxRate, saveLocalJobs, saveLedgerItem]
  );

  const createJob = useCallback(
    async (title: string, freelancer: string, amount: number) => {
      const partial = Number((amount * 0.8).toFixed(2));
      const remainder = Number((amount * 0.2).toFixed(2));
      const newJobId = (jobs.length + 1).toString();
      const utr = generateImpsUtr();

      const newJob: EscrowJobItem = {
        id: newJobId,
        title,
        client: address || TESTNET_PASSKEY_ADDRESS,
        freelancer,
        amountUsd: amount,
        partialAmountUsd: partial,
        remainderAmountUsd: remainder,
        state: JobState.Funded,
        createdAt: 'Just now',
      };

      const updatedJobs = [newJob, ...jobs];
      saveLocalJobs(updatedJobs);

      const newItem: TransactionLedgerItem = {
        id: `tx-create-${Date.now()}`,
        type: 'Job funded',
        description: `Escrow Funded: ${title}`,
        amountInr: Number((amount * fxRate).toFixed(2)),
        amountUsd: amount,
        isCredit: false,
        timestamp: 'Just now',
        referenceCode: utr,
      };

      saveLedgerItem(newItem);
      return { success: true, jobId: newJobId };
    },
    [jobs, address, fxRate, saveLocalJobs, saveLedgerItem]
  );

  const sendAusd = useCallback(
    async (recipient: string, amountUsd: number) => {
      const activeAddr = address || TESTNET_PASSKEY_ADDRESS;

      // Real onchain / relayer transfer
      const res = await executeSendAusdOnChain({
        owner: activeAddr,
        recipient,
        amountUsd,
      });

      setAusdBalance((prev) => Math.max(0, prev - amountUsd));

      const newItem: TransactionLedgerItem = {
        id: `tx-send-${Date.now()}`,
        type: 'Payment received',
        description: `Direct Transfer to ${recipient.slice(0, 8)}...${recipient.slice(-4)}`,
        amountInr: Number((amountUsd * fxRate).toFixed(2)),
        amountUsd,
        isCredit: false,
        timestamp: 'Just now',
        onchainTxHash: res.txHash,
      };

      saveLedgerItem(newItem);
      return { success: true, txHash: res.txHash };
    },
    [address, fxRate, saveLedgerItem]
  );

  const processCashout = useCallback(
    async (amountUsd: number, upiId: string) => {
      const activeAddr = address || TESTNET_PASSKEY_ADDRESS;

      // Execute authentic on-chain settlement via Monad testnet relayer
      const settlement = await executeCashoutOnChain({
        amountUsd,
        upiId,
        freelancerAddress: activeAddr,
        lockedRate: fxRate,
      });

      setAusdBalance((prev) => Math.max(0, prev - amountUsd));

      const newItem: TransactionLedgerItem = {
        id: `tx-cashout-${Date.now()}`,
        type: 'Cash out',
        description: `Bank Settle to ${upiId} via IMPS`,
        amountInr: settlement.amountInr,
        amountUsd: settlement.amountUsd,
        isCredit: false,
        timestamp: 'Just now',
        referenceCode: settlement.referenceCode,
        onchainTxHash: settlement.onchainTxHash,
      };

      saveLedgerItem(newItem);

      return {
        success: true,
        receiptId: settlement.receiptId,
        utr: settlement.referenceCode,
        amountInr: settlement.amountInr,
        amountUsd: settlement.amountUsd,
        txHash: settlement.onchainTxHash,
      };
    },
    [address, fxRate, saveLedgerItem]
  );

  return (
    <AccountContext.Provider
      value={{
        address,
        isConnected,
        isConnecting,
        authType,
        ausdBalance,
        fxRate,
        jobs,
        ledger,
        connectTestnetPasskey,
        connectBiometricPasskey,
        signOut,
        refreshAccountData,
        claimAdvance,
        releaseRemainder,
        createJob,
        sendAusd,
        processCashout,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = (): AccountContextType => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};
