import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  TESTNET_PASSKEY_ADDRESS,
  INITIAL_JOBS,
  EscrowJobItem,
  JobState,
  TransactionLedgerItem,
} from '../constants/config';
import { getLiveFxRate, generateImpsUtr } from '../services/monadRpc';

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
  claimAdvance: (jobId: string) => Promise<{ success: boolean; txHash: string }>;
  releaseRemainder: (jobId: string) => Promise<{ success: boolean; txHash: string }>;
  createJob: (title: string, freelancer: string, amount: number) => Promise<{ success: boolean; jobId: string }>;
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
  const [address, setAddress] = useState<string | null>(TESTNET_PASSKEY_ADDRESS);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [authType, setAuthType] = useState<'testnet' | 'biometric' | null>('testnet');
  const [ausdBalance, setAusdBalance] = useState<number>(1480.0);
  const [fxRate, setFxRate] = useState<number>(96.0);
  const [jobs, setJobs] = useState<EscrowJobItem[]>(INITIAL_JOBS);
  const [ledger, setLedger] = useState<TransactionLedgerItem[]>([
    {
      id: 'tx-init-1',
      type: 'Advance claimed',
      description: '80% Instant Advance: DeFi Liquidity Engine',
      amountInr: 49920,
      amountUsd: 520,
      isCredit: true,
      timestamp: 'Yesterday at 4:30 PM',
      referenceCode: 'NAD782910482',
      onchainTxHash: '0xa41c7b8d3f11e987c234a90123efd5b88671db2d97c410143a9012a055bd4e0e',
    },
    {
      id: 'tx-init-2',
      type: 'Cash out',
      description: 'Bank Settle to rohit@axl via IMPS',
      amountInr: 28800,
      amountUsd: 300,
      isCredit: false,
      timestamp: '2 days ago',
      referenceCode: 'NAD394821034',
      onchainTxHash: '0xeb811ab986f51ce4323f38cb3b475b837a1d7c162bac3b881773608dd754e4b7',
    },
  ]);

  // Load live FX on mount
  useEffect(() => {
    getLiveFxRate().then((res) => {
      if (res && res.rate > 0) {
        setFxRate(res.rate);
      }
    });
  }, []);

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
    }, 700);
  }, []);

  const signOut = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setAuthType(null);
  }, []);

  const claimAdvance = useCallback(
    async (jobId: string) => {
      const targetJob = jobs.find((j) => j.id === jobId);
      if (!targetJob) throw new Error('Job not found');

      // Gasless Monad testnet tx execution
      const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, state: JobState.PartiallyReleased } : j
        )
      );

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
        referenceCode: generateImpsUtr(),
        onchainTxHash: txHash,
      };

      setLedger((prev) => [newItem, ...prev]);
      return { success: true, txHash };
    },
    [jobs, fxRate]
  );

  const releaseRemainder = useCallback(
    async (jobId: string) => {
      const targetJob = jobs.find((j) => j.id === jobId);
      if (!targetJob) throw new Error('Job not found');

      const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, state: JobState.Completed } : j))
      );

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
        referenceCode: generateImpsUtr(),
        onchainTxHash: txHash,
      };

      setLedger((prev) => [newItem, ...prev]);
      return { success: true, txHash };
    },
    [jobs, fxRate]
  );

  const createJob = useCallback(
    async (title: string, freelancer: string, amount: number) => {
      const partial = Number((amount * 0.8).toFixed(2));
      const remainder = Number((amount * 0.2).toFixed(2));
      const newJobId = (jobs.length + 1).toString();
      const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      const newJob: EscrowJobItem = {
        id: newJobId,
        title,
        client: address || '0xClientAddress',
        freelancer,
        amountUsd: amount,
        partialAmountUsd: partial,
        remainderAmountUsd: remainder,
        state: JobState.Funded,
        createdAt: 'Just now',
        txHash,
      };

      setJobs((prev) => [newJob, ...prev]);

      const newItem: TransactionLedgerItem = {
        id: `tx-create-${Date.now()}`,
        type: 'Job funded',
        description: `Escrow Funded: ${title}`,
        amountInr: Number((amount * fxRate).toFixed(2)),
        amountUsd: amount,
        isCredit: false,
        timestamp: 'Just now',
        referenceCode: generateImpsUtr(),
        onchainTxHash: txHash,
      };

      setLedger((prev) => [newItem, ...prev]);
      return { success: true, jobId: newJobId };
    },
    [jobs, address, fxRate]
  );

  const processCashout = useCallback(
    async (amountUsd: number, upiId: string) => {
      if (amountUsd > ausdBalance) {
        throw new Error('Insufficient AUSD balance.');
      }

      const amountInr = Number((amountUsd * fxRate).toFixed(2));
      const utr = generateImpsUtr();
      const txHash = '0xeb811ab986f51ce4323f38cb3b475b837a1d7c162bac3b881773608dd754e4b7';

      setAusdBalance((prev) => Math.max(0, prev - amountUsd));

      const newItem: TransactionLedgerItem = {
        id: `tx-cashout-${Date.now()}`,
        type: 'Cash out',
        description: `Bank Settle to ${upiId} via IMPS`,
        amountInr,
        amountUsd,
        isCredit: false,
        timestamp: 'Just now',
        referenceCode: utr,
        onchainTxHash: txHash,
      };

      setLedger((prev) => [newItem, ...prev]);

      return {
        success: true,
        receiptId: `RCPT-${Date.now().toString().slice(-6)}`,
        utr,
        amountInr,
        amountUsd,
        txHash,
      };
    },
    [ausdBalance, fxRate]
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
        claimAdvance,
        releaseRemainder,
        createJob,
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
