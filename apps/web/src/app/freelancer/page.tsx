"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAccount } from "@/hooks/useAccount";
import {
  Zap,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Coins,
  RefreshCw,
  Fingerprint,
  FileText,
  Printer,
  X,
  CreditCard,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  CheckCircle,
} from "lucide-react";
import {
  ESCROW_CONTRACT_ADDRESS,
  AUSD_CONTRACT_ADDRESS,
  JobState,
  JOB_STATE_LABELS,
} from "@/lib/contracts/config";
import {
  getAusdBalance,
  getJobsForAccount,
  type OnChainJobDetails,
} from "@/lib/contracts/escrowClient";
import { relayReleasePartial, type RelayResult } from "@/lib/relayer/client";

interface FxQuote {
  success: boolean;
  rate: number;
  currency: string;
  timestamp: string;
  provider: string;
}

interface CashoutReceipt {
  receiptId: string;
  amountUsd: number;
  lockedRate: number;
  amountInr: number;
  upiId: string;
  timestamp: string;
  status: "Completed (Sandbox)";
  referenceCode: string;
  onchainTxHash: string;
}

interface TransactionHistoryItem {
  id: string;
  type: "Job funded" | "Payment received" | "Cash out";
  description: string;
  amountInr: number;
  amountUsd: number;
  isCredit: boolean;
  status: "Job funded" | "Payment received" | "Cash out";
  timestamp: string;
  onchainTxHash?: string;
  referenceCode?: string;
}

export default function FreelancerDashboardPage() {
  const {
    address,
    isConnected,
    isConnecting,
    walletClient,
    storedCredentialId,
    signUp,
    signIn,
    signOut,
  } = useAccount();

  const [copied, setCopied] = useState(false);
  const [ausdBalance, setAusdBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);

  // Live FX Quote State
  const [fxQuote, setFxQuote] = useState<FxQuote>({
    success: true,
    rate: 95.92,
    currency: "INR",
    timestamp: "Fetching live quote...",
    provider: "Open Exchange Rates API",
  });
  const [isFetchingFx, setIsFetchingFx] = useState<boolean>(false);

  // Jobs State
  const [freelancerJobs, setFreelancerJobs] = useState<OnChainJobDetails[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(false);
  const [claimingJobId, setClaimingJobId] = useState<bigint | null>(null);
  const [claimResult, setClaimResult] = useState<RelayResult | null>(null);

  // Cashout Modal & Sandbox Receipt
  const [showCashoutModal, setShowCashoutModal] = useState<boolean>(false);
  const [cashoutAmountUsd, setCashoutAmountUsd] = useState<number>(100);
  const [lockedRate, setLockedRate] = useState<number>(95.92);
  const [upiIdInput, setUpiIdInput] = useState<string>("freelancer@okhdfcbank");
  const [cashoutSourceTxHash, setCashoutSourceTxHash] = useState<string | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<CashoutReceipt | null>(null);
  const [isProcessingCashout, setIsProcessingCashout] = useState<boolean>(false);
  const [cashoutError, setCashoutError] = useState<string | null>(null);

  // Local recorded cashouts state for this account
  const [storedCashouts, setStoredCashouts] = useState<CashoutReceipt[]>([]);

  // Fetch Live FX Quote (Strictly updates only on response, no fake animations)
  const fetchFxQuote = useCallback(async () => {
    setIsFetchingFx(true);
    try {
      const res = await fetch("/api/fx");
      const data = await res.json();
      if (data && data.rate) {
        setFxQuote(data);
      }
    } catch (e) {
      console.error("Failed to fetch live FX rate:", e);
    } finally {
      setIsFetchingFx(false);
    }
  }, []);

  // Fetch Freelancer Balance and Jobs
  const loadFreelancerData = useCallback(async () => {
    if (!address) return;
    setIsLoadingBalance(true);
    setIsLoadingJobs(true);

    try {
      const bal = await getAusdBalance(address);
      const parsed = parseFloat(bal.balanceFormatted);
      setAusdBalance(isNaN(parsed) ? 0 : parsed);

      const jobs = await getJobsForAccount(address, "freelancer");
      setFreelancerJobs(jobs);

      // Load cached cashout receipts for this account
      if (typeof window !== "undefined") {
        const cashoutKey = `nadrupee_cashouts_${address.toLowerCase()}`;
        const cached = JSON.parse(localStorage.getItem(cashoutKey) || "[]");
        setStoredCashouts(cached);
      }
    } catch (err) {
      console.error("Failed to load freelancer data:", err);
    } finally {
      setIsLoadingBalance(false);
      setIsLoadingJobs(false);
    }
  }, [address]);

  useEffect(() => {
    fetchFxQuote();
  }, [fetchFxQuote]);

  useEffect(() => {
    if (isConnected && address) {
      loadFreelancerData();
    }
  }, [isConnected, address, loadFreelancerData]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Exact INR Balance — never fake animated, strictly calculated on real state
  const inrBalance = (ausdBalance * fxQuote.rate).toFixed(2);

  // Claim 80% Instant Payout Advance (Uses EIP-712 passkey signature without jargon)
  const handleClaimAdvance = async (jobId: bigint) => {
    if (!walletClient || !address) return;
    setClaimingJobId(jobId);
    setClaimResult(null);

    try {
      const res = await relayReleasePartial({
        walletClient,
        jobId,
        clientAddress: address,
      });
      setClaimResult(res);
      await loadFreelancerData();
    } catch (err: any) {
      setClaimResult({
        success: false,
        error: err?.message || "Failed to process instant payout advance.",
      });
    } finally {
      setClaimingJobId(null);
    }
  };

  // Open Cashout Modal with Rate Locking
  const handleOpenCashout = (defaultUsd?: number, txHash?: string) => {
    // Lock the current FX rate at this exact moment
    setLockedRate(fxQuote.rate);
    const initialAmt =
      defaultUsd && defaultUsd > 0
        ? defaultUsd
        : ausdBalance > 0
        ? ausdBalance
        : 100;
    setCashoutAmountUsd(initialAmt);
    setCashoutSourceTxHash(txHash || claimResult?.txHash || null);
    setActiveReceipt(null);
    setCashoutError(null);
    setShowCashoutModal(true);
  };

  // Confirm Cashout (Sandbox payout with onchain transaction hash and locked rate)
  const handleConfirmCashout = async () => {
    if (cashoutAmountUsd <= 0) {
      setCashoutError("Please enter a valid amount greater than 0.");
      return;
    }
    if (!upiIdInput || !upiIdInput.includes("@")) {
      setCashoutError("Please provide a valid UPI ID (e.g. name@okhdfcbank).");
      return;
    }

    setIsProcessingCashout(true);
    setCashoutError(null);

    try {
      const res = await fetch("/api/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freelancerAddress: address || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          amountUsd: cashoutAmountUsd,
          lockedRate: lockedRate,
          upiId: upiIdInput,
          sourceTxHash: cashoutSourceTxHash || claimResult?.txHash || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to process sandbox payout.");
      }

      const receipt: CashoutReceipt = {
        receiptId: data.receiptId,
        amountUsd: data.amountUsd,
        lockedRate: data.lockedRate,
        amountInr: data.amountInr,
        upiId: data.upiId,
        timestamp: data.timestamp,
        status: "Completed (Sandbox)",
        referenceCode: data.referenceCode,
        onchainTxHash: data.onchainTxHash,
      };

      setActiveReceipt(receipt);

      // Deduct balance and persist cashout receipt locally
      setAusdBalance((prev) => Math.max(0, prev - data.amountUsd));

      if (typeof window !== "undefined" && address) {
        const cashoutKey = `nadrupee_cashouts_${address.toLowerCase()}`;
        const updated = [receipt, ...storedCashouts];
        setStoredCashouts(updated);
        localStorage.setItem(cashoutKey, JSON.stringify(updated.slice(0, 30)));
      }
    } catch (err: any) {
      console.error("Cashout confirmation error:", err);
      setCashoutError(err?.message || "Failed to process sandbox cashout.");
    } finally {
      setIsProcessingCashout(false);
    }
  };

  // Full Transaction History for this Freelancer
  // Combines:
  // 1. "Job funded" entries from contracts
  // 2. "Payment received" entries from advances and completions
  // 3. "Cash out" entries from sandbox bank withdrawals
  const fullTransactionHistory: TransactionHistoryItem[] = useMemo(() => {
    const list: TransactionHistoryItem[] = [];

    // From On-Chain Jobs
    for (const job of freelancerJobs) {
      const jobTotalInr = Number((parseFloat(job.amountFormatted) * fxQuote.rate).toFixed(2));
      const jobPartialInr = Number((parseFloat(job.partialAmountFormatted) * fxQuote.rate).toFixed(2));
      const jobRemainderInr = Number((parseFloat(job.remainderAmountFormatted) * fxQuote.rate).toFixed(2));
      const jobDate = job.createdAt > BigInt(0)
        ? new Date(Number(job.createdAt) * 1000).toUTCString()
        : new Date().toUTCString();

      // Entry 1: Job funded
      list.push({
        id: `fund-${job.jobId.toString()}`,
        type: "Job funded",
        description: job.deliverableTitle || `Client funded contract #${job.jobId.toString()}`,
        amountInr: jobTotalInr,
        amountUsd: parseFloat(job.amountFormatted),
        isCredit: true,
        status: "Job funded",
        timestamp: jobDate,
        onchainTxHash: job.txHash,
      });

      // Entry 2: Payment received (80% Advance)
      if (job.state === JobState.PartiallyReleased || job.state === JobState.Completed) {
        list.push({
          id: `partial-${job.jobId.toString()}`,
          type: "Payment received",
          description: `80% Instant Payout Advance for contract #${job.jobId.toString()}`,
          amountInr: jobPartialInr,
          amountUsd: parseFloat(job.partialAmountFormatted),
          isCredit: true,
          status: "Payment received",
          timestamp: jobDate,
          onchainTxHash: job.txHash,
        });
      }

      // Entry 3: Payment received (20% Remainder)
      if (job.state === JobState.Completed) {
        list.push({
          id: `rem-${job.jobId.toString()}`,
          type: "Payment received",
          description: `20% Completion Remainder for contract #${job.jobId.toString()}`,
          amountInr: jobRemainderInr,
          amountUsd: parseFloat(job.remainderAmountFormatted),
          isCredit: true,
          status: "Payment received",
          timestamp: jobDate,
          onchainTxHash: job.txHash,
        });
      }
    }

    // From Cashout Receipts
    for (const cashout of storedCashouts) {
      list.push({
        id: cashout.receiptId,
        type: "Cash out",
        description: `Bank transfer to ${cashout.upiId} (Sandbox)`,
        amountInr: cashout.amountInr,
        amountUsd: cashout.amountUsd,
        isCredit: false,
        status: "Cash out",
        timestamp: cashout.timestamp,
        onchainTxHash: cashout.onchainTxHash,
        referenceCode: cashout.referenceCode,
      });
    }

    return list;
  }, [freelancerJobs, storedCashouts, fxQuote.rate]);

  return (
    <div className="min-h-screen bg-[#07080d] text-neutral-100 flex flex-col font-sans selection:bg-emerald-600/30 selection:text-emerald-200">
      {/* Top Banner */}
      <div className="relative z-10 w-full bg-emerald-950/40 border-b border-emerald-800/30 px-4 py-1.5 text-center text-xs text-emerald-300 flex items-center justify-center gap-2">
        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-semibold text-white">Freelancer Earnings & Payout Portal</span>
        <span className="text-emerald-500">•</span>
        <span>Instant Cross-Border Settlement</span>
        <span className="text-emerald-500">•</span>
        <span>Direct INR Bank Payout</span>
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 w-full border-b border-neutral-800/80 backdrop-blur-md bg-neutral-950/80 sticky top-0 px-4 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-950/60 group-hover:scale-105 transition">
              ₹
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-lg text-white">
                Nad<span className="text-emerald-400">Rupee</span>
              </span>
              <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-700/50 text-emerald-300">
                Freelancer
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-4 text-xs font-medium text-neutral-400">
            <Link href="/" className="hover:text-white transition">
              Overview
            </Link>
            <Link href="/client" className="hover:text-white transition">
              Client Portal
            </Link>
            <Link href="/auth-test" className="hover:text-white transition">
              Protocol Lab
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {!isConnected ? (
            <button
              onClick={() => (storedCredentialId ? signIn() : signUp("freelancer@nadrupee"))}
              disabled={isConnecting}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium text-xs transition shadow-md shadow-emerald-950/50 disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Verifying Biometrics...
                </>
              ) : (
                <>
                  <Fingerprint className="w-3.5 h-3.5" />
                  Biometric Sign In
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-medium text-xs text-neutral-300">
                  Account: <span className="text-emerald-300 font-semibold">Verified Freelancer</span>
                </span>
                <button
                  onClick={() => address && handleCopy(address)}
                  className="text-neutral-400 hover:text-neutral-200 p-0.5"
                  title="Copy Account ID"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <button
                onClick={signOut}
                className="text-xs text-neutral-400 hover:text-rose-400 p-1.5 transition"
                title="Sign Out"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Claim Notification Banner */}
        {claimResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-1.5 ${
              claimResult.alreadyProcessed
                ? "bg-amber-950/40 border-amber-800/60 text-amber-200"
                : claimResult.success
                ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
                : "bg-rose-950/40 border-rose-800/60 text-rose-200"
            }`}
          >
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5">
                {claimResult.alreadyProcessed ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Advance Already Claimed
                  </>
                ) : claimResult.success ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    Payment received — 80% instant advance added to your balance!
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    Payout Notice
                  </>
                )}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {claimResult.message || claimResult.error}
            </p>
            {claimResult.txHash && (
              <div className="flex items-center gap-1 font-mono text-[11px] pt-1">
                <span className="text-neutral-400">On-Chain Reference:</span>
                <a
                  href={`https://testnet.monadexplorer.com/tx/${claimResult.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-300 hover:underline flex items-center gap-1"
                >
                  {claimResult.txHash.slice(0, 16)}...{claimResult.txHash.slice(-8)}{" "}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Hero Earnings Balance Card (Exclusively in INR) */}
        <section className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Available Spendable Balance
              </span>
              <div className="flex items-baseline gap-3">
                <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white">
                  ₹ {Number(inrBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </h1>
                <span className="text-sm sm:text-base font-semibold text-emerald-400">
                  INR
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono pt-1">
                Equal to <span className="text-neutral-200 font-semibold">{ausdBalance.toLocaleString()} USD</span> in verified escrow funds
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-2">
              <button
                onClick={() => handleOpenCashout()}
                disabled={!isConnected}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm transition shadow-xl shadow-emerald-950/60"
              >
                <Building2 className="w-4 h-4" />
                Cash out to Bank Account
              </button>

              <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Instant UPI & IMPS Settlement
              </span>
            </div>
          </div>

          {/* Live Timestamped Quote Ticker (Updates strictly on real events, no fake animation) */}
          <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-neutral-400">Live Exchange Rate:</span>
              <span className="font-bold text-white font-mono">
                1 USD = ₹{fxQuote.rate.toFixed(2)} INR
              </span>
            </div>

            <div className="flex items-center gap-3 text-neutral-400 text-[11px]">
              <span className="truncate">
                Live Quote Timestamp: <span className="text-neutral-300">{fxQuote.timestamp}</span>
              </span>
              <button
                onClick={fetchFxQuote}
                disabled={isFetchingFx}
                className="hover:text-white transition flex items-center gap-1 shrink-0"
                title="Refresh Exchange Rate Quote"
              >
                <RefreshCw className={`w-3 h-3 ${isFetchingFx ? "animate-spin" : ""}`} />
                Update Quote
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Active Contracts & Instant Payout Advances */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                Your Freelance Contracts & Payouts
              </h2>
              <p className="text-xs text-neutral-400 pt-0.5">
                Every job is backed by real client funds locked in escrow. You can claim an 80% advance the moment a client deposits.
              </p>
            </div>

            <button
              onClick={loadFreelancerData}
              disabled={isLoadingJobs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 transition self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingJobs ? "animate-spin" : ""}`} />
              Refresh Contracts
            </button>
          </div>

          {!isConnected ? (
            <div className="text-center py-12 space-y-3 bg-neutral-950 border border-neutral-800/80 rounded-2xl">
              <Fingerprint className="w-10 h-10 text-neutral-500 mx-auto" />
              <p className="text-sm font-semibold text-neutral-300">Biometric Sign-In Required</p>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Sign in with Touch ID, Face ID, or your device passkey to view incoming client payments.
              </p>
              <button
                onClick={() => (storedCredentialId ? signIn() : signUp("freelancer@nadrupee"))}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
              >
                Sign In with Passkey
              </button>
            </div>
          ) : isLoadingJobs ? (
            <div className="text-center py-12 text-xs text-neutral-500 flex items-center justify-center gap-2 bg-neutral-950 border border-neutral-800/80 rounded-2xl">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              Checking payment contracts on Monad...
            </div>
          ) : freelancerJobs.length === 0 ? (
            <div className="text-center py-12 space-y-2 bg-neutral-950 border border-neutral-800/80 rounded-2xl">
              <p className="text-sm font-semibold text-neutral-300">No Active Payment Contracts</p>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                When a foreign client locks payment for your deliverable, it will appear here immediately with an instant 80% advance ready to claim.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {freelancerJobs.map((job) => {
                const totalInr = (parseFloat(job.amountFormatted) * fxQuote.rate).toFixed(2);
                const advanceInr = (parseFloat(job.partialAmountFormatted) * fxQuote.rate).toFixed(2);

                return (
                  <div
                    key={job.jobId.toString()}
                    className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-lg"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white">Contract #{job.jobId.toString()}</span>
                        <span
                          className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                            job.state === JobState.Funded
                              ? "bg-blue-950/80 border border-blue-700/60 text-blue-300"
                              : job.state === JobState.PartiallyReleased
                              ? "bg-emerald-950/80 border border-emerald-700/60 text-emerald-300"
                              : job.state === JobState.Completed
                              ? "bg-neutral-800 border border-neutral-700 text-neutral-300"
                              : "bg-neutral-800 text-neutral-400"
                          }`}
                        >
                          {job.state === JobState.Funded
                            ? "Job funded • Advance Ready"
                            : job.state === JobState.PartiallyReleased
                            ? "Payment received • 80% Claimed"
                            : job.state === JobState.Completed
                            ? "100% Fully Settled"
                            : "Cancelled"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-400">
                        <span>
                          Total: <strong className="text-white">₹{Number(totalInr).toLocaleString("en-IN")}</strong> ({job.amountFormatted} USD)
                        </span>
                        <span>•</span>
                        <span className="text-emerald-400">
                          80% Instant Payout: <strong>₹{Number(advanceInr).toLocaleString("en-IN")}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {job.state === JobState.Funded && (
                        <button
                          onClick={() => handleClaimAdvance(job.jobId)}
                          disabled={claimingJobId === job.jobId}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-lg shadow-emerald-950/60"
                        >
                          {claimingJobId === job.jobId ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Verifying with Passkey...
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5" />
                              Claim 80% Instant Advance
                            </>
                          )}
                        </button>
                      )}

                      {job.state === JobState.PartiallyReleased && (
                        <span className="text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-violet-400" />
                          20% releases upon completion
                        </span>
                      )}

                      <button
                        onClick={() => handleOpenCashout(parseFloat(job.partialAmountFormatted), job.txHash)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-medium text-neutral-200 transition"
                      >
                        <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                        Cash out
                      </button>

                      {job.txHash && (
                        <a
                          href={`https://testnet.monadexplorer.com/tx/${job.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition"
                          title="View on Monad Explorer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 3: Full Transaction History for this Freelancer */}
        <section className="space-y-4">
          <div className="border-b border-neutral-800/80 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              Transaction History
            </h2>
            <p className="text-xs text-neutral-400 pt-0.5">
              Complete chronological audit of your funded jobs, claimed advances, and bank cashouts.
            </p>
          </div>

          {fullTransactionHistory.length === 0 ? (
            <div className="text-center py-10 space-y-2 bg-neutral-950 border border-neutral-800/80 rounded-2xl">
              <History className="w-8 h-8 text-neutral-600 mx-auto" />
              <p className="text-sm font-semibold text-neutral-400">No Transactions Yet</p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Once a client funds a job or you cash out earnings, all events will be recorded here with on-chain verification links.
              </p>
            </div>
          ) : (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl divide-y divide-neutral-800/80 overflow-hidden shadow-lg">
              {fullTransactionHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-900/40 transition"
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-2.5 rounded-xl border mt-0.5 ${
                        item.type === "Job funded"
                          ? "bg-blue-950/60 border-blue-800/60 text-blue-400"
                          : item.type === "Payment received"
                          ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-400"
                          : "bg-amber-950/60 border-amber-800/60 text-amber-400"
                      }`}
                    >
                      {item.type === "Job funded" ? (
                        <Coins className="w-4 h-4" />
                      ) : item.type === "Payment received" ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{item.type}</span>
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                            item.type === "Job funded"
                              ? "bg-blue-950 border border-blue-800 text-blue-300"
                              : item.type === "Payment received"
                              ? "bg-emerald-950 border border-emerald-800 text-emerald-300"
                              : "bg-amber-950 border border-amber-800 text-amber-300"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300">{item.description}</p>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono">
                        <span>{item.timestamp}</span>
                        {item.referenceCode && (
                          <>
                            <span>•</span>
                            <span>Ref: {item.referenceCode}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-neutral-800/60">
                    <div
                      className={`text-sm font-bold font-mono ${
                        item.isCredit ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {item.isCredit ? "+" : "-"} ₹
                      {item.amountInr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono">
                      ({item.amountUsd.toLocaleString()} USD)
                    </div>
                    {item.onchainTxHash && (
                      <a
                        href={`https://testnet.monadexplorer.com/tx/${item.onchainTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-mono pt-0.5"
                      >
                        Explorer <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 4: Cash Out Confirmation Modal (Sandbox Banking Payout) */}
        {showCashoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-6 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-950 border border-emerald-800 rounded-xl text-emerald-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Cash out to Bank Account</h3>
                    <p className="text-[11px] text-neutral-400">Instant UPI & IMPS Transfer</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowCashoutModal(false);
                    setActiveReceipt(null);
                  }}
                  className="text-neutral-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!activeReceipt ? (
                /* Cashout Form */
                <div className="space-y-4 text-xs">
                  {/* Clearly Labeled Sandbox Banner */}
                  <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      SANDBOX PAYOUT CONFIRMATION (TESTNET EVALUATION)
                    </div>
                    <p className="text-amber-200/90 leading-relaxed">
                      This is a simulated sandbox payout confirmation screen, not a real bank transfer.
                      In production, this routes via Onmeta&apos;s licensed INR payout rail.
                    </p>
                  </div>

                  <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
                    <div className="flex justify-between text-neutral-400">
                      <span>Amount to Cash out:</span>
                      <span className="font-mono font-bold text-white">
                        {cashoutAmountUsd.toLocaleString()} USD
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-400">
                      <span>Locked Exchange Rate:</span>
                      <span className="font-mono text-emerald-400 font-semibold">
                        1 USD = ₹{lockedRate.toFixed(2)} INR
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-400 border-t border-neutral-800/80 pt-2 font-medium">
                      <span className="text-white">Total Deposit in Your Bank:</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        ₹{(cashoutAmountUsd * lockedRate).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-neutral-300 font-semibold">
                      Your Bank Account UPI ID (VPA)
                    </label>
                    <input
                      type="text"
                      value={upiIdInput}
                      onChange={(e) => setUpiIdInput(e.target.value)}
                      placeholder="e.g. yourname@okhdfcbank"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {cashoutError && (
                    <p className="text-[11px] text-rose-400 bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-lg">
                      {cashoutError}
                    </p>
                  )}

                  <button
                    onClick={handleConfirmCashout}
                    disabled={isProcessingCashout}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2"
                  >
                    {isProcessingCashout ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Receipt & On-Chain Verification...
                      </>
                    ) : (
                      <>
                        <Building2 className="w-4 h-4" />
                        Confirm Cash out
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Generated Payout Receipt */
                <div className="space-y-5 text-xs">
                  <div className="text-center space-y-1">
                    <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
                      <Check className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-white">Payment Receipt Generated</h4>
                    <p className="text-[11px] text-neutral-400">Sandbox Bank Settlement Confirmed</p>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-2.5 font-mono text-[11px]">
                    <div className="flex justify-between border-b border-neutral-800 pb-2">
                      <span className="text-neutral-500">Receipt ID:</span>
                      <span className="text-white font-bold">{activeReceipt.receiptId}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-neutral-500">Amount Sent:</span>
                      <span className="text-emerald-400 font-bold">
                        ₹{activeReceipt.amountInr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-neutral-500">Locked Rate:</span>
                      <span className="text-neutral-300">1 USD = ₹{activeReceipt.lockedRate.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-neutral-500">Destination:</span>
                      <span className="text-neutral-300 truncate max-w-[200px]">{activeReceipt.upiId}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-neutral-500">IMPS Reference:</span>
                      <span className="text-neutral-300">{activeReceipt.referenceCode}</span>
                    </div>

                    <div className="flex justify-between border-t border-neutral-800 pt-2">
                      <span className="text-neutral-500">On-Chain Reference:</span>
                      <a
                        href={`https://testnet.monadexplorer.com/tx/${activeReceipt.onchainTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        {activeReceipt.onchainTxHash.slice(0, 10)}... <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="flex justify-between border-t border-neutral-800 pt-2 text-[10px]">
                      <span className="text-neutral-500">Timestamp:</span>
                      <span className="text-neutral-400">{activeReceipt.timestamp}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.print()}
                      className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Receipt
                    </button>

                    <button
                      onClick={() => {
                        setShowCashoutModal(false);
                        setActiveReceipt(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
