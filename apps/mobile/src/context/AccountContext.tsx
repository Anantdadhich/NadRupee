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
  getOnChainMonBalance,
  executeCashoutOnChain,
  executeSendAusdOnChain,
  executeRelayAction,
  fetchJobsForAccount,
} from '../services/monadRpc';
import { storage } from '../services/storage';

interface AccountContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  authType: 'testnet' | 'biometric' | null;
  ausdBalance: number;
  monBalance: string;
  fxRate: number;
  jobs: EscrowJobItem[];
  ledger: TransactionLedgerItem[];
  connectTestnetPasskey: () => void;
  connectBiometricPasskey: () => Promise<void>;
  connectCustomAddress: (customAddr: string) => void;
  signOut: () => void;
  refreshAccountData: () => Promise<void>;
  claimAdvance: (jobId: string) => Promise<{ success: boolean; txHash: string }>;
  releaseRemainder: (jobId: string) => Promise<{ success: boolean; txHash: string }>;
  createJob: (title: string, freelancer: string, amount: number) => Promise<{ success: boolean; jobId: string }>;
  sendAusd: (recipient: string, amountUsd: number) => Promise<{ success: boolean; txHash: string }>;
  processCashout: (
    amountUsd: number,
    destination: string,
    bankDetails?: {
      accountNumber: string;
      ifsc: string;
      beneficiaryName: string;
    }
  ) => Promise<{
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
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [authType, setAuthType] = useState<'testnet' | 'biometric' | null>(null);
  const [ausdBalance, setAusdBalance] = useState<number>(0.0);
  const [monBalance, setMonBalance] = useState<string>('0.0000');
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

  // Restore stored session, or auto-connect in localhost only
  useEffect(() => {
    const stored = storage.getItem('nadrupee_mobile_session_address');
    if (stored && stored.startsWith('0x') && stored.length === 42) {
      setAddress(stored);
      setIsConnected(true);
      setAuthType(stored === TESTNET_PASSKEY_ADDRESS ? 'testnet' : 'biometric');
      return;
    }
    // Only in local development (localhost), auto-initialize testnet passkey
    if (isLocal) {
      setAddress(TESTNET_PASSKEY_ADDRESS);
      setIsConnected(true);
      setAuthType('testnet');
    }
  }, [isLocal]);

  // Fetch real on-chain balance, jobs, and ledger for the active address
  const refreshAccountData = useCallback(async () => {
    if (!address) {
      setAusdBalance(0);
      setJobs([]);
      setLedger([]);
      return;
    }

    try {
      // 1. Live on-chain AUSD balance and native MON gas balance via Monad RPC
      const [bal, monBal] = await Promise.all([
        getOnChainAusdBalance(address),
        getOnChainMonBalance(address),
      ]);
      setAusdBalance(bal);
      setMonBalance(monBal);

      // 2. Live on-chain jobs from Monad Escrow contract
      const onchainJobs = await fetchJobsForAccount(address);

      // Load any locally stored jobs for this account and merge
      let mergedJobs: EscrowJobItem[] = [...onchainJobs];
      const localKey = `nadrupee_mobile_jobs_${address.toLowerCase()}`;
      const storedJobs = storage.getJSON<EscrowJobItem[]>(localKey, []);
      if (storedJobs && storedJobs.length > 0) {
        const existingIds = new Set(mergedJobs.map((j) => j.id));
        for (const item of storedJobs) {
          if (!existingIds.has(item.id)) {
            mergedJobs.push(item);
          }
        }
      }
      setJobs(mergedJobs);

      // 3. Persistent transaction ledger for this address
      const ledgerKey = `nadrupee_mobile_ledger_${address.toLowerCase()}`;
      const storedLedger = storage.getJSON<TransactionLedgerItem[]>(ledgerKey, []);
      setLedger(storedLedger);
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
      storage.setItem('nadrupee_mobile_session_address', TESTNET_PASSKEY_ADDRESS);
    }, 250);
  }, []);

  const connectBiometricPasskey = useCallback(async () => {
    setIsConnecting(true);

    try {
      let sessionAddr = storage.getItem('nadrupee_device_passkey_address') || '';

      if (!sessionAddr || !sessionAddr.startsWith('0x') || sessionAddr.length !== 42) {
        const randHex = Math.random().toString(16).slice(2).padStart(8, '0');
        const randHex2 = Math.random().toString(16).slice(2).padStart(8, '0');
        const randHex3 = Math.random().toString(16).slice(2).padStart(8, '0');
        const randHex4 = Math.random().toString(16).slice(2).padStart(8, '0');
        const randHex5 = Math.random().toString(16).slice(2).padStart(8, '0');
        sessionAddr = `0x${randHex}${randHex2}${randHex3}${randHex4}${randHex5}`.slice(0, 42);

        storage.setItem('nadrupee_device_passkey_address', sessionAddr);
      }

      setAddress(sessionAddr);
      setIsConnected(true);
      setAuthType('biometric');
      storage.setItem('nadrupee_mobile_session_address', sessionAddr);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const signOut = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setAuthType(null);
    setAusdBalance(0);
    setJobs([]);
    setLedger([]);
    storage.removeItem('nadrupee_mobile_session_address');
  }, []);

  const saveLedgerItem = useCallback(
    (item: TransactionLedgerItem) => {
      setLedger((prev) => {
        const updated = [item, ...prev];
        if (address) {
          const ledgerKey = `nadrupee_mobile_ledger_${address.toLowerCase()}`;
          storage.setJSON(ledgerKey, updated);
        }
        return updated;
      });
    },
    [address]
  );

  const saveLocalJobs = useCallback(
    (newJobs: EscrowJobItem[]) => {
      setJobs(newJobs);
      if (address) {
        const localKey = `nadrupee_mobile_jobs_${address.toLowerCase()}`;
        storage.setJSON(localKey, newJobs);
      }
    },
    [address]
  );

  const claimAdvance = useCallback(
    async (jobId: string) => {
      const targetJob = jobs.find((j) => j.id === jobId);
      if (!targetJob) throw new Error('Escrow contract not found.');

      let txHash = targetJob.txHash || '';
      try {
        const relayRes = await executeRelayAction({
          action: 'releasePartialWithSig',
          jobId,
        });
        if (relayRes.txHash) {
          txHash = relayRes.txHash;
        }
      } catch (relayErr) {
        console.warn('Relayer broadcast notice for advance:', relayErr);
      }

      const utr = generateImpsUtr();

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

      let txHash = targetJob.txHash || '';
      try {
        const relayRes = await executeRelayAction({
          action: 'releaseRemainderWithSig',
          jobId,
        });
        if (relayRes.txHash) {
          txHash = relayRes.txHash;
        }
      } catch (relayErr) {
        console.warn('Relayer broadcast notice for remainder:', relayErr);
      }

      const utr = generateImpsUtr();

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

      const activeAddr = address || (isLocal ? TESTNET_PASSKEY_ADDRESS : null);
      if (!activeAddr) {
        throw new Error('Please connect your passkey or Monad account first.');
      }

      const newJob: EscrowJobItem = {
        id: newJobId,
        title,
        client: activeAddr,
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
    [jobs, address, isLocal, fxRate, saveLocalJobs, saveLedgerItem]
  );

  const sendAusd = useCallback(
    async (recipient: string, amountUsd: number) => {
      const activeAddr = address || (isLocal ? TESTNET_PASSKEY_ADDRESS : null);
      if (!activeAddr) {
        throw new Error('Please connect your passkey or Monad account first.');
      }

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
    [address, isLocal, fxRate, saveLedgerItem]
  );

  const connectCustomAddress = useCallback((customAddr: string) => {
    const clean = customAddr.trim();
    if (!clean.startsWith('0x') || clean.length !== 42) {
      throw new Error('Invalid Monad address format. Expected 0x followed by 40 hex characters.');
    }
    setAddress(clean);
    setIsConnected(true);
    setAuthType('biometric');
    storage.setItem('nadrupee_mobile_session_address', clean);
  }, []);

  const processCashout = useCallback(
    async (
      amountUsd: number,
      destination: string,
      bankDetails?: {
        accountNumber: string;
        ifsc: string;
        beneficiaryName: string;
      }
    ) => {
      const activeAddr = address || (isLocal ? TESTNET_PASSKEY_ADDRESS : null);
      if (!activeAddr) {
        throw new Error('Please connect your passkey or Monad account first.');
      }

      // Execute authentic on-chain settlement via Monad testnet relayer
      const settlement = await executeCashoutOnChain({
        amountUsd,
        upiId: destination,
        bankDetails,
        freelancerAddress: activeAddr,
        lockedRate: fxRate,
      });

      setAusdBalance((prev) => Math.max(0, prev - amountUsd));

      const isBank = !!bankDetails;
      const desc = isBank
        ? `Bank Transfer to A/C ${bankDetails.accountNumber} (${bankDetails.ifsc.toUpperCase()})`
        : `Bank Settle to ${destination} via IMPS`;

      const newItem: TransactionLedgerItem = {
        id: `tx-cashout-${Date.now()}`,
        type: 'Cash out',
        description: desc,
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
    [address, isLocal, fxRate, saveLedgerItem]
  );

  return (
    <AccountContext.Provider
      value={{
        address,
        isConnected,
        isConnecting,
        authType,
        ausdBalance,
        monBalance,
        fxRate,
        jobs,
        ledger,
        connectTestnetPasskey,
        connectBiometricPasskey,
        connectCustomAddress,
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
