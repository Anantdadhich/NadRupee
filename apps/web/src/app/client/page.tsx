"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAccount } from "@/hooks/useAccount";
import {
  Lock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Building2,
  ArrowUpRight,
  KeyRound,
  RefreshCw,
  Coins,
  XCircle,
} from "lucide-react";
import {
  ESCROW_CONTRACT_ADDRESS,
  AUSD_CONTRACT_ADDRESS,
  DEFAULT_PARTIAL_BPS,
  JobState,
  JOB_STATE_LABELS,
} from "@/lib/contracts/config";
import {
  getAusdBalance,
  getJobsForAccount,
  createOnChainJob,
  type OnChainJobDetails,
} from "@/lib/contracts/escrowClient";
import { relayReleaseRemainder, relayCancelJob, type RelayResult } from "@/lib/relayer/client";

// Known test handles for quick lookup
const FREELANCER_HANDLE_DIRECTORY: Record<string, string> = {
  "@arjun.monad": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "@priya.dev": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "@rohit.sol": "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
};

export default function ClientDashboardPage() {
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
  const [ausdBalance, setAusdBalance] = useState<string>("0.00");
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);

  // Form State
  const [freelancerInput, setFreelancerInput] = useState<string>("@arjun.monad");
  const [resolvedAddress, setResolvedAddress] = useState<string>(
    FREELANCER_HANDLE_DIRECTORY["@arjun.monad"]
  );
  const [jobTitle, setJobTitle] = useState<string>("Smart Contract Security Audit");
  const [amountInput, setAmountInput] = useState<number>(1000);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [lastCreatedTxHash, setLastCreatedTxHash] = useState<string | null>(null);

  // Created Jobs List
  const [createdJobs, setCreatedJobs] = useState<OnChainJobDetails[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(false);
  const [actionJobId, setActionJobId] = useState<bigint | null>(null);
  const [actionResult, setActionResult] = useState<RelayResult | null>(null);

  // Handle Input Changes (with handle auto-lookup)
  const handleFreelancerChange = (val: string) => {
    setFreelancerInput(val);
    const cleaned = val.trim().toLowerCase();
    if (FREELANCER_HANDLE_DIRECTORY[cleaned]) {
      setResolvedAddress(FREELANCER_HANDLE_DIRECTORY[cleaned]);
    } else if (cleaned.startsWith("0x") && cleaned.length === 42) {
      setResolvedAddress(cleaned);
    } else {
      setResolvedAddress("");
    }
  };

  const loadData = useCallback(async () => {
    if (!address) return;
    setIsLoadingBalance(true);
    setIsLoadingJobs(true);

    try {
      const bal = await getAusdBalance(address);
      setAusdBalance(bal.balanceFormatted);

      const jobs = await getJobsForAccount(address, "client");
      setCreatedJobs(jobs);
    } catch (err) {
      console.error("Failed to load client on-chain data:", err);
    } finally {
      setIsLoadingBalance(false);
      setIsLoadingJobs(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      loadData();
    }
  }, [isConnected, address, loadData]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const partialAmount = Math.floor((amountInput * DEFAULT_PARTIAL_BPS) / 10000);
  const remainderAmount = amountInput - partialAmount;

  // Fund Job Execution
  const handleFundJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletClient || !address) return;

    const targetAddress = resolvedAddress || freelancerInput;
    if (!targetAddress.startsWith("0x") || targetAddress.length !== 42) {
      setCreationError("Please specify a valid Monad EOA address or select a verified handle (@arjun.monad, @priya.dev, @rohit.sol).");
      return;
    }

    if (targetAddress.toLowerCase() === address.toLowerCase()) {
      setCreationError("Client and Freelancer cannot be the same address in Escrow.sol.");
      return;
    }

    if (amountInput <= 0) {
      setCreationError("Job amount must be greater than 0 AUSD.");
      return;
    }

    setIsSubmitting(true);
    setCreationError(null);
    setLastCreatedTxHash(null);

    try {
      const res = await createOnChainJob({
        walletClient,
        freelancerAddress: targetAddress as `0x${string}`,
        amountUsd: amountInput,
        deliverableTitle: jobTitle,
      });

      setLastCreatedTxHash(res.txHash);
      await loadData();
    } catch (err: any) {
      console.error("Fund Job Failed:", err);
      setCreationError(
        err?.shortMessage || err?.message || "Failed to broadcast transaction on Monad testnet."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remainder Release (Completion Approval)
  const handleReleaseRemainder = async (jobId: bigint) => {
    if (!walletClient || !address) return;
    setActionJobId(jobId);
    setActionResult(null);

    try {
      const res = await relayReleaseRemainder({
        walletClient,
        jobId,
        clientAddress: address,
      });
      setActionResult(res);
      await loadData();
    } catch (err: any) {
      setActionResult({
        success: false,
        error: err?.message || "Failed to release remainder payment.",
      });
    } finally {
      setActionJobId(null);
    }
  };

  // Job Cancellation (Pre-Partial Release Only)
  const handleCancelJob = async (jobId: bigint) => {
    if (!walletClient || !address) return;
    setActionJobId(jobId);
    setActionResult(null);

    try {
      const res = await relayCancelJob({
        walletClient,
        jobId,
        clientAddress: address,
      });
      setActionResult(res);
      await loadData();
    } catch (err: any) {
      setActionResult({
        success: false,
        error: err?.message || "Failed to cancel escrow job.",
      });
    } finally {
      setActionJobId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-neutral-100 flex flex-col font-sans selection:bg-violet-600/30 selection:text-violet-200">
      {/* Top Banner */}
      <div className="relative z-10 w-full bg-violet-950/40 border-b border-violet-800/30 px-4 py-1.5 text-center text-xs text-violet-300 flex items-center justify-center gap-2">
        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-semibold text-white">Client Escrow Terminal</span>
        <span className="text-violet-500">•</span>
        <span>Monad Testnet (Chain ID 10143)</span>
        <span className="text-violet-500">•</span>
        <span>Agora AUSD Stablecoin</span>
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 w-full border-b border-neutral-800/80 backdrop-blur-md bg-neutral-950/80 sticky top-0 px-4 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center font-bold text-white shadow-lg shadow-violet-950/60 group-hover:scale-105 transition">
              ₹
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-lg text-white">
                Nad<span className="text-violet-400">Rupee</span>
              </span>
              <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-950 border border-violet-700/50 text-violet-300">
                Client
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-4 text-xs font-medium text-neutral-400">
            <Link href="/" className="hover:text-white transition">
              Overview
            </Link>
            <Link href="/freelancer" className="hover:text-white transition">
              Freelancer View
            </Link>
            <Link href="/auth-test" className="hover:text-white transition">
              Protocol Lab
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {!isConnected ? (
            <button
              onClick={() => (storedCredentialId ? signIn() : signUp("client@nadrupee"))}
              disabled={isConnecting}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-medium text-xs transition shadow-md shadow-violet-950/50 disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  Connect Client Passkey
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-mono text-xs text-violet-300">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
                </span>
                <span className="text-neutral-500">|</span>
                <span className="font-mono text-xs font-semibold text-emerald-400">
                  {isLoadingBalance ? "..." : `${ausdBalance} AUSD`}
                </span>
                <button
                  onClick={() => address && handleCopy(address)}
                  className="text-neutral-400 hover:text-neutral-200 p-0.5"
                  title="Copy Address"
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
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Page Title & Intro */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
              <Lock className="w-7 h-7 text-violet-400" />
              Client Escrow Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 pt-1">
              Deposit and lock AUSD into on-chain escrow to guarantee payments for Indian freelancers with zero dispute risk.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={isLoadingJobs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingJobs ? "animate-spin" : ""}`} />
              Refresh On-Chain Data
            </button>
          </div>
        </div>

        {/* Contract Deployment Notice if not configured */}
        {(!ESCROW_CONTRACT_ADDRESS ||
          ESCROW_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-300">Escrow Contract Not Set in Environment</p>
              <p className="text-amber-200/80 leading-relaxed">
                Deploy <code>contracts/src/Escrow.sol</code> to Monad Testnet and set <code>NEXT_PUBLIC_ESCROW_ADDRESS</code> in <code>apps/web/.env.local</code> to execute live on-chain job creation.
              </p>
            </div>
          </div>
        )}

        {/* Action / Relay Notification Banner */}
        {actionResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-1.5 ${
              actionResult.alreadyProcessed
                ? "bg-amber-950/40 border-amber-800/60 text-amber-200"
                : actionResult.success
                ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
                : "bg-rose-950/40 border-rose-800/60 text-rose-200"
            }`}
          >
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5">
                {actionResult.alreadyProcessed ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Idempotency Hit (0 Gas Wasted)
                  </>
                ) : actionResult.success ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    Transaction Successfully Relayed on Monad Testnet!
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-400" />
                    Execution Failed
                  </>
                )}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {actionResult.message || actionResult.error}
            </p>
            {actionResult.txHash && (
              <div className="flex items-center gap-1 font-mono text-[11px] pt-1">
                <span className="text-neutral-400">Transaction:</span>
                <a
                  href={`https://testnet.monadexplorer.com/tx/${actionResult.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-300 hover:underline flex items-center gap-1"
                >
                  {actionResult.txHash} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Section 1: Fund a Job Form */}
        <section className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="border-b border-neutral-800/80 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-violet-400" />
              Fund a New Freelance Escrow
            </h2>
            <p className="text-xs text-neutral-400 pt-1">
              Specify the freelancer and lock the agreed AUSD payment. 80% is immediately unlocked for the freelancer once confirmed on Monad.
            </p>
          </div>

          <form onSubmit={handleFundJob} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Inputs (2 Cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Deliverable Scope & Milestone
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  required
                  placeholder="e.g. Backend Monad RPC Integration & Testing"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300">
                    Freelancer Handle or Address
                  </label>
                  <span className="text-[11px] text-neutral-500">
                    Supports handles: @arjun.monad, @priya.dev, @rohit.sol
                  </span>
                </div>
                <input
                  type="text"
                  value={freelancerInput}
                  onChange={(e) => handleFreelancerChange(e.target.value)}
                  required
                  placeholder="@arjun.monad or 0x..."
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-violet-500"
                />
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-neutral-500">Quick Select:</span>
                  {Object.keys(FREELANCER_HANDLE_DIRECTORY).map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      onClick={() => handleFreelancerChange(handle)}
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-md border transition ${
                        freelancerInput === handle
                          ? "bg-violet-950 border-violet-600 text-violet-200 font-bold"
                          : "bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      {handle}
                    </button>
                  ))}
                </div>
                {resolvedAddress && (
                  <p className="text-[11px] text-violet-400 font-mono flex items-center gap-1 pt-0.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    Resolved Address: {resolvedAddress}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Escrow Amount (AUSD)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amountInput}
                    onChange={(e) => setAmountInput(Number(e.target.value))}
                    required
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-3.5 pr-16 py-2.5 text-sm font-mono text-neutral-100 focus:outline-none focus:border-violet-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
                    AUSD
                  </span>
                </div>
              </div>
            </div>

            {/* Contract Split & Summary Card (1 Col) */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Escrow Split Breakdown
                </span>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Total Deposit:</span>
                    <span className="font-mono font-bold text-white">
                      {amountInput.toLocaleString()} AUSD
                    </span>
                  </div>

                  <div className="flex justify-between text-neutral-400">
                    <span>Instant Advance (80%):</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {partialAmount.toLocaleString()} AUSD
                    </span>
                  </div>

                  <div className="flex justify-between text-neutral-400">
                    <span>Completion Balance (20%):</span>
                    <span className="font-mono text-neutral-300">
                      {remainderAmount.toLocaleString()} AUSD
                    </span>
                  </div>

                  <div className="flex justify-between text-neutral-400 pt-2 border-t border-neutral-800">
                    <span>Dispute Window:</span>
                    <span className="font-mono text-neutral-300">7 Days (Auto-releases)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  type="submit"
                  disabled={isSubmitting || !isConnected}
                  className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-violet-950/60 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Locking Funds on Monad...
                    </>
                  ) : !isConnected ? (
                    <>
                      <KeyRound className="w-4 h-4" />
                      Connect Passkey to Fund
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Fund Job ({amountInput} AUSD)
                    </>
                  )}
                </button>

                {creationError && (
                  <p className="text-[11px] text-rose-400 bg-rose-950/50 p-2.5 rounded-lg border border-rose-800/50 leading-relaxed">
                    {creationError}
                  </p>
                )}

                {lastCreatedTxHash && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-[11px] text-emerald-300 flex items-center justify-between">
                    <span>Job successfully funded on-chain!</span>
                    <a
                      href={`https://testnet.monadexplorer.com/tx/${lastCreatedTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-300 hover:underline flex items-center gap-1 font-mono"
                    >
                      Explorer <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </form>
        </section>

        {/* Section 2: Live View of Created Jobs */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-violet-400" />
                Live Created Jobs
              </h2>
              <p className="text-xs text-neutral-400">
                On-chain jobs created by your client account ({address ? `${address.slice(0, 8)}...${address.slice(-6)}` : "not connected"}).
              </p>
            </div>
          </div>

          {!isConnected ? (
            <div className="text-center py-12 space-y-3 bg-neutral-950 border border-neutral-800/80 rounded-2xl">
              <KeyRound className="w-8 h-8 text-neutral-500 mx-auto" />
              <p className="text-xs text-neutral-400">
                Connect your client passkey to view your on-chain escrow contracts.
              </p>
            </div>
          ) : isLoadingJobs ? (
            <div className="text-center py-12 text-xs text-neutral-500 flex items-center justify-center gap-2 bg-neutral-950 border border-neutral-800/80 rounded-2xl">
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
              Querying Escrow.sol on Monad Testnet...
            </div>
          ) : createdJobs.length === 0 ? (
            <div className="text-center py-12 space-y-2 bg-neutral-950 border border-neutral-800/80 rounded-2xl">
              <p className="text-xs text-neutral-400">
                You haven’t created any escrow jobs yet.
              </p>
              <p className="text-[11px] text-neutral-500">
                Use the form above to fund your first job on Monad Testnet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {createdJobs.map((job) => (
                <div
                  key={job.jobId.toString()}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-white">Job #{job.jobId.toString()}</span>
                      <span
                        className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                          job.state === JobState.Funded
                            ? "bg-blue-950/80 border border-blue-700/60 text-blue-300"
                            : job.state === JobState.PartiallyReleased
                            ? "bg-violet-950/80 border border-violet-700/60 text-violet-300"
                            : job.state === JobState.Completed
                            ? "bg-emerald-950/80 border border-emerald-700/60 text-emerald-300"
                            : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {JOB_STATE_LABELS[job.state]}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 font-mono">
                      <span>Freelancer: {job.freelancer.slice(0, 6)}...{job.freelancer.slice(-4)}</span>
                      <span>•</span>
                      <span className="text-white font-semibold">Total: {job.amountFormatted} AUSD</span>
                      <span>•</span>
                      <span className="text-emerald-400">80% Advance: {job.partialAmountFormatted} AUSD</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {job.state === JobState.PartiallyReleased && (
                      <button
                        onClick={() => handleReleaseRemainder(job.jobId)}
                        disabled={actionJobId === job.jobId}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow"
                      >
                        {actionJobId === job.jobId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Release Remainder (20%)
                      </button>
                    )}

                    {job.state === JobState.Funded && (
                      <button
                        onClick={() => handleCancelJob(job.jobId)}
                        disabled={actionJobId === job.jobId}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-rose-950 hover:border-rose-800 border border-neutral-700 disabled:opacity-50 text-neutral-300 hover:text-rose-200 font-medium text-xs transition"
                      >
                        {actionJobId === job.jobId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        Cancel & Refund
                      </button>
                    )}

                    <a
                      href={
                        job.txHash
                          ? `https://testnet.monadexplorer.com/tx/${job.txHash}`
                          : `https://testnet.monadexplorer.com/address/${ESCROW_CONTRACT_ADDRESS}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono text-neutral-300 hover:text-white transition"
                      title={job.txHash ? "View Transaction on Monad Explorer" : "View Contract on Monad Explorer"}
                    >
                      <span>Explorer</span>
                      <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
