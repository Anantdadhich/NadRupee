"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAccount } from "@/hooks/useAccount";
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  Fingerprint,
  Coins,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Building2,
  ArrowUpRight,
  Sparkles,
  Lock,
  AlertCircle,
  Banknote,
  Loader2,
  KeyRound,
  RefreshCw,
  Wallet,
} from "lucide-react";
import {
  relayReleasePartial,
  relayReleaseRemainder,
  type RelayResult,
} from "@/lib/relayer/client";
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

interface AgoraMetrics {
  monad: {
    circulatingSupply: string;
    totalSupply: string;
  };
  totalCirculatingSupply: string;
}

interface RelayerHealth {
  status: string;
  isConfigured: boolean;
  address: string | null;
  balanceMon: string;
  isLowBalance: boolean;
}

export default function HomePage() {
  const {
    address,
    account,
    isConnected,
    isConnecting,
    walletClient,
    storedCredentialId,
    signUp,
    signIn,
    signOut,
  } = useAccount();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"client" | "freelancer">("freelancer");

  // Real Protocol Metrics
  const [agoraMetrics, setAgoraMetrics] = useState<AgoraMetrics | null>(null);
  const [relayerHealth, setRelayerHealth] = useState<RelayerHealth | null>(null);
  const [ausdBalance, setAusdBalance] = useState<string>("0.00");
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);

  // Real On-Chain Jobs
  const [userJobs, setUserJobs] = useState<OnChainJobDetails[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(false);

  // Create Job Form State
  const [jobAmount, setJobAmount] = useState<number>(500);
  const [freelancerInputAddress, setFreelancerInputAddress] = useState<string>("");
  const [jobTitle, setJobTitle] = useState("Full-Stack Monad DeFi Integration");
  const [isSubmittingJob, setIsSubmittingJob] = useState<boolean>(false);
  const [jobCreationError, setJobCreationError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  // Relay Actions State
  const [relayingJobId, setRelayingJobId] = useState<bigint | null>(null);
  const [relayActionResult, setRelayActionResult] = useState<RelayResult | null>(null);

  // Real Onmeta Staging Drawer
  const [showOnmetaRamp, setShowOnmetaRamp] = useState<boolean>(false);

  const fetchProtocolData = useCallback(async () => {
    // 1. Fetch live Agora AUSD metrics from public API
    try {
      const agoraRes = await fetch("/api/agora/metrics");
      const agoraJson = await agoraRes.json();
      if (agoraJson.success && agoraJson.data) {
        setAgoraMetrics(agoraJson.data);
      }
    } catch (e) {
      console.error("Agora metrics fetch error:", e);
    }

    // 2. Fetch live Relayer Health & MON balance
    try {
      const relayerRes = await fetch("/api/relayer/health");
      const relayerJson = await relayerRes.json();
      setRelayerHealth(relayerJson);
    } catch (e) {
      console.error("Relayer health fetch error:", e);
    }
  }, []);

  const fetchAccountOnChainData = useCallback(async () => {
    if (!address) return;
    setIsLoadingBalance(true);
    setIsLoadingJobs(true);

    try {
      // Query real AUSD token balance on Monad Testnet
      const bal = await getAusdBalance(address);
      setAusdBalance(bal.balanceFormatted);

      // Query real on-chain jobs
      const jobs = await getJobsForAccount(address, activeTab);
      setUserJobs(jobs);
    } catch (err) {
      console.error("Error loading on-chain account data:", err);
    } finally {
      setIsLoadingBalance(false);
      setIsLoadingJobs(false);
    }
  }, [address, activeTab]);

  useEffect(() => {
    fetchProtocolData();
  }, [fetchProtocolData]);

  useEffect(() => {
    if (isConnected && address) {
      fetchAccountOnChainData();
    }
  }, [isConnected, address, activeTab, fetchAccountOnChainData]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const partialPayout = Math.floor((jobAmount * DEFAULT_PARTIAL_BPS) / 10000);
  const remainderPayout = jobAmount - partialPayout;

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletClient || !address) return;
    if (!freelancerInputAddress.startsWith("0x") || freelancerInputAddress.length !== 42) {
      setJobCreationError("Please enter a valid 20-byte Monad EOA address for the freelancer.");
      return;
    }

    setIsSubmittingJob(true);
    setJobCreationError(null);
    setLastTxHash(null);

    try {
      const res = await createOnChainJob({
        walletClient,
        freelancerAddress: freelancerInputAddress as `0x${string}`,
        amountUsd: jobAmount,
        deliverableTitle: jobTitle,
      });

      setLastTxHash(res.txHash);
      await fetchAccountOnChainData();
    } catch (err: any) {
      console.error("Failed to create on-chain job:", err);
      setJobCreationError(
        err?.shortMessage || err?.message || "Failed to create escrow contract job."
      );
    } finally {
      setIsSubmittingJob(false);
    }
  };

  const handleTriggerPartialRelease = async (jobId: bigint) => {
    if (!walletClient || !address) return;
    setRelayingJobId(jobId);
    setRelayActionResult(null);

    try {
      const res = await relayReleasePartial({
        walletClient,
        jobId,
        clientAddress: address,
      });
      setRelayActionResult(res);
      await fetchAccountOnChainData();
    } catch (err: any) {
      setRelayActionResult({
        success: false,
        error: err?.message || "Relayer meta-transaction execution failed.",
      });
    } finally {
      setRelayingJobId(null);
    }
  };

  const handleTriggerRemainderRelease = async (jobId: bigint) => {
    if (!walletClient || !address) return;
    setRelayingJobId(jobId);
    setRelayActionResult(null);

    try {
      const res = await relayReleaseRemainder({
        walletClient,
        jobId,
        clientAddress: address,
      });
      setRelayActionResult(res);
      await fetchAccountOnChainData();
    } catch (err: any) {
      setRelayActionResult({
        success: false,
        error: err?.message || "Relayer meta-transaction execution failed.",
      });
    } finally {
      setRelayingJobId(null);
    }
  };

  // Real Onmeta Staging URL for direct wallet integration
  const onmetaSandboxUrl = `https://stg.platform.onmeta.in/?walletAddress=${
    address || "0x0000000000000000000000000000000000000000"
  }&fiatType=INR&tokenSymbol=USDC&chainId=10143`;

  return (
    <div className="min-h-screen bg-[#07080d] text-neutral-100 flex flex-col font-sans selection:bg-violet-600/30 selection:text-violet-200">
      {/* Background Glow Highlights */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-violet-600/15 via-purple-900/10 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-[35%] -left-40 w-[500px] h-[500px] bg-blue-600/10 blur-[130px] rounded-full" />
        <div className="absolute top-[60%] -right-40 w-[600px] h-[500px] bg-emerald-600/10 blur-[140px] rounded-full" />
      </div>

      {/* Top Banner: Monad Testnet & Agora Verification */}
      <div className="relative z-10 w-full bg-violet-950/40 border-b border-violet-800/30 px-4 py-1.5 text-center text-xs text-violet-300 flex items-center justify-center gap-2">
        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-semibold text-white">Monad Metropolis Hackathon</span>
        <span className="text-violet-500">•</span>
        <span>Monad Testnet (Chain ID 10143)</span>
        <span className="text-violet-500">•</span>
        <span className="hidden sm:inline text-violet-300 font-medium">
          Official Agora AUSD Stablecoin (
          <code className="font-mono text-[11px] text-violet-200">
            {AUSD_CONTRACT_ADDRESS.slice(0, 8)}...{AUSD_CONTRACT_ADDRESS.slice(-6)}
          </code>
          )
        </span>
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
              <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-950 border border-violet-700/50 text-violet-300">
                Escrow
              </span>
            </div>
          </Link>

          {/* Agora Metrics Live Feed */}
          {agoraMetrics && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-xs">
              <Coins className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-neutral-400">Monad AUSD Circulating:</span>
              <span className="font-mono font-semibold text-blue-300">
                ${Number(agoraMetrics.monad.circulatingSupply).toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/auth-test"
            className="text-xs font-medium text-neutral-400 hover:text-neutral-200 px-3 py-1.5 rounded-lg hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition"
          >
            Protocol Lab
          </Link>

          {!isConnected ? (
            <button
              onClick={() => (storedCredentialId ? signIn() : signUp("freelancer@nadrupee"))}
              disabled={isConnecting}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-medium text-xs transition shadow-md shadow-violet-950/50 disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Passkey...
                </>
              ) : (
                <>
                  <Fingerprint className="w-3.5 h-3.5" />
                  Sign In with Passkey
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

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-800/50 text-violet-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            Instant, Escrow-Backed Freelance Settlement
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Cross-Border Freelance Pay.{" "}
            <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              Instant Onchain Certainty.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-400 leading-relaxed max-w-2xl mx-auto">
            Indian freelancers get an <strong className="text-neutral-200">80% stablecoin advance</strong> the
            exact moment a client locks funds into the Monad escrow contract. Authenticated via hardware passkeys,
            sponsored gasless settlement, and cashout to Indian bank accounts via Onmeta.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setActiveTab("client");
                const el = document.getElementById("escrow-console");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition shadow-lg shadow-violet-950/50"
            >
              Lock Escrow as Client
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setActiveTab("freelancer");
                const el = document.getElementById("escrow-console");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 font-semibold text-sm transition"
            >
              <Fingerprint className="w-4 h-4 text-violet-400" />
              Freelancer Portal
            </button>
          </div>

          {/* Core Architecture Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-8 text-left border-y border-neutral-900 py-6">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
                Instant Payout Split
              </span>
              <p className="text-xl sm:text-2xl font-bold text-emerald-400">80% / 20%</p>
              <p className="text-xs text-neutral-400">80% released upon lock</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
                Settlement Chain
              </span>
              <p className="text-xl sm:text-2xl font-bold text-white">Monad 10143</p>
              <p className="text-xs text-neutral-400">Sub-second testnet finality</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
                Auth Infrastructure
              </span>
              <p className="text-xl sm:text-2xl font-bold text-violet-400">Mera Passkey</p>
              <p className="text-xs text-neutral-400">WebAuthn PRF → BIP-44 EOA</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
                Settlement Token
              </span>
              <p className="text-xl sm:text-2xl font-bold text-blue-400">Agora AUSD</p>
              <p className="text-xs text-neutral-400">6 Decimals • EIP-2612</p>
            </div>
          </div>
        </section>

        {/* Live Escrow Console */}
        <section id="escrow-console" className="scroll-mt-24 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                Escrow Protocol Management
              </h2>
              <p className="text-xs text-neutral-400">
                Direct interaction with Escrow.sol on Monad Testnet.
              </p>
            </div>

            {/* Persona Switcher Tabs */}
            <div className="inline-flex p-1 rounded-xl bg-neutral-900 border border-neutral-800 self-start sm:self-auto">
              <button
                onClick={() => setActiveTab("freelancer")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "freelancer"
                    ? "bg-violet-600 text-white shadow"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Freelancer Portal
              </button>
              <button
                onClick={() => setActiveTab("client")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "client"
                    ? "bg-violet-600 text-white shadow"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Client Portal
              </button>
            </div>
          </div>

          {/* Interactive Workspace */}
          <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 space-y-6 shadow-xl">
            {activeTab === "client" ? (
              /* Client View: Create Real On-Chain Job */
              <div className="space-y-6">
                <div className="border-b border-neutral-800/80 pb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-violet-400" />
                    Create Escrow Job & Lock AUSD
                  </h3>
                  <p className="text-xs text-neutral-400 pt-1">
                    Funds are deposited into Escrow.sol. The contract computes the 80% instant payout advance and
                    20% completion remainder.
                  </p>
                </div>

                <form onSubmit={handleCreateJob} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300">
                        Deliverable / Project Title
                      </label>
                      <input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        required
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-violet-500"
                        placeholder="e.g. Smart Contract Audit"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300">
                        Freelancer Address (Monad EOA)
                      </label>
                      <input
                        type="text"
                        value={freelancerInputAddress}
                        onChange={(e) => setFreelancerInputAddress(e.target.value)}
                        required
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3.5 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-violet-500"
                        placeholder="0x..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300">
                        Total Job Payment (AUSD)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={jobAmount}
                        onChange={(e) => setJobAmount(Number(e.target.value))}
                        required
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3.5 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                        Contract Split Summary
                      </span>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-neutral-400">
                          <span>Total Locked Amount:</span>
                          <span className="font-mono font-bold text-white">
                            {jobAmount.toLocaleString()} AUSD
                          </span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                          <span>Instant Freelancer Payout (80%):</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {partialPayout.toLocaleString()} AUSD
                          </span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                          <span>Completion Remainder (20%):</span>
                          <span className="font-mono text-neutral-300">
                            {remainderPayout.toLocaleString()} AUSD
                          </span>
                        </div>
                        <div className="flex justify-between text-neutral-400 pt-2 border-t border-neutral-800">
                          <span>Dispute / Inactivity Timeout:</span>
                          <span className="font-mono text-neutral-300">7 Days (Automated)</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="submit"
                        disabled={isSubmittingJob || !isConnected}
                        className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-violet-950/50 flex items-center justify-center gap-2"
                      >
                        {isSubmittingJob ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Broadcasting to Monad Testnet...
                          </>
                        ) : !isConnected ? (
                          <>
                            <KeyRound className="w-3.5 h-3.5" />
                            Connect Passkey to Lock Funds
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            Deposit & Lock {jobAmount} AUSD
                          </>
                        )}
                      </button>

                      {jobCreationError && (
                        <p className="text-[11px] text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-800/40">
                          {jobCreationError}
                        </p>
                      )}

                      {lastTxHash && (
                        <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800/50 text-[11px] text-emerald-300 flex items-center justify-between">
                          <span>Transaction confirmed!</span>
                          <a
                            href={`https://testnet.monadexplorer.com/tx/${lastTxHash}`}
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
              </div>
            ) : (
              /* Freelancer View: Real On-Chain Jobs & Instant Payout */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      Freelancer Escrow Contracts & Payouts
                    </h3>
                    <p className="text-xs text-neutral-400 pt-0.5">
                      Jobs funded by clients. Claim your 80% instant payout gaslessly using your Mera passkey.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowOnmetaRamp(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-200 transition"
                  >
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    Open Onmeta INR Off-Ramp
                  </button>
                </div>

                {/* Relayer Notification Banner */}
                {relayActionResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                      relayActionResult.alreadyProcessed
                        ? "bg-amber-950/40 border-amber-800/60 text-amber-200"
                        : relayActionResult.success
                        ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
                        : "bg-rose-950/40 border-rose-800/60 text-rose-200"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        {relayActionResult.alreadyProcessed ? (
                          <>
                            <ShieldCheck className="w-4 h-4 text-amber-400" />
                            Idempotency Hit (0 Relayer Gas Wasted)
                          </>
                        ) : relayActionResult.success ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            Relayed Meta-Transaction Confirmed on Monad!
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                            Relayer Execution Failed
                          </>
                        )}
                      </span>
                    </div>

                    <p className="text-[11px] leading-relaxed">
                      {relayActionResult.message || relayActionResult.error}
                    </p>

                    {relayActionResult.txHash && (
                      <div className="flex items-center gap-1 font-mono text-[11px] pt-1">
                        <span className="text-neutral-400">Tx:</span>
                        <a
                          href={`https://testnet.monadexplorer.com/tx/${relayActionResult.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-violet-300 hover:underline flex items-center gap-1"
                        >
                          {relayActionResult.txHash} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Job List */}
                {!isConnected ? (
                  <div className="text-center py-10 space-y-3 bg-neutral-900/40 border border-neutral-800/60 rounded-xl">
                    <Fingerprint className="w-8 h-8 text-neutral-500 mx-auto" />
                    <p className="text-xs text-neutral-400">
                      Sign in with your Mera passkey to view your on-chain escrow contracts and instant payouts.
                    </p>
                    <button
                      onClick={() => (storedCredentialId ? signIn() : signUp("freelancer@nadrupee"))}
                      className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition"
                    >
                      Sign In with Passkey
                    </button>
                  </div>
                ) : isLoadingJobs ? (
                  <div className="text-center py-12 text-xs text-neutral-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                    Querying Escrow.sol on Monad Testnet...
                  </div>
                ) : userJobs.length === 0 ? (
                  <div className="text-center py-10 space-y-2 bg-neutral-900/40 border border-neutral-800/60 rounded-xl">
                    <p className="text-xs text-neutral-400">
                      No active escrow contracts found for <span className="font-mono text-violet-300">{address}</span>.
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Switch to the Client Portal tab above to lock your first job into the smart contract.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userJobs.map((job) => (
                      <div
                        key={job.jobId.toString()}
                        className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">Job #{job.jobId.toString()}</span>
                            <span
                              className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold ${
                                job.state === JobState.Funded
                                  ? "bg-blue-950/70 border border-blue-800/60 text-blue-300"
                                  : job.state === JobState.PartiallyReleased
                                  ? "bg-violet-950/70 border border-violet-800/60 text-violet-300"
                                  : job.state === JobState.Completed
                                  ? "bg-emerald-950/70 border border-emerald-800/60 text-emerald-300"
                                  : "bg-neutral-800 text-neutral-400"
                              }`}
                            >
                              {JOB_STATE_LABELS[job.state]}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
                            <span>Total: {job.amountFormatted} AUSD</span>
                            <span>•</span>
                            <span className="text-emerald-400">
                              Instant (80%): {job.partialAmountFormatted} AUSD
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {job.state === JobState.Funded && (
                            <button
                              onClick={() => handleTriggerPartialRelease(job.jobId)}
                              disabled={relayingJobId === job.jobId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition"
                            >
                              {relayingJobId === job.jobId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Zap className="w-3.5 h-3.5" />
                              )}
                              Claim 80% Instant Advance
                            </button>
                          )}

                          {job.state === JobState.PartiallyReleased && (
                            <button
                              onClick={() => handleTriggerRemainderRelease(job.jobId)}
                              disabled={relayingJobId === job.jobId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-xs transition"
                            >
                              {relayingJobId === job.jobId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ShieldCheck className="w-3.5 h-3.5" />
                              )}
                              Release 20% Remainder
                            </button>
                          )}

                          <button
                            onClick={() => setShowOnmetaRamp(true)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 transition"
                          >
                            <Building2 className="w-3.5 h-3.5 text-blue-400" />
                            Cashout to INR
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Technical Architecture Feature Cards */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-white">Production Architecture</h2>
            <p className="text-xs text-neutral-400">
              Verified smart contracts, real EIP standards, and live ecosystem rails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 space-y-3 hover:border-violet-700/50 transition">
              <div className="w-9 h-9 rounded-xl bg-violet-950/70 border border-violet-800/50 flex items-center justify-center text-violet-400">
                <Fingerprint className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-white">Mera Passkey Derivation</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Derives deterministic BIP-44 Monad EOA key pairs directly from WebAuthn PRF output. The freelancer
                authenticates with biometric hardware (Touch ID / Face ID / YubiKey).
              </p>
            </div>

            <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 space-y-3 hover:border-violet-700/50 transition">
              <div className="w-9 h-9 rounded-xl bg-blue-950/70 border border-blue-800/50 flex items-center justify-center text-blue-400">
                <Coins className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-white">Agora AUSD Token Standard</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Settles in Agora USD with 6 decimals precision and EIP-2612 gasless permits. Real-time metrics
                queried directly from Agora’s official public metrics API.
              </p>
            </div>

            <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 space-y-3 hover:border-violet-700/50 transition">
              <div className="w-9 h-9 rounded-xl bg-emerald-950/70 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-white">Onmeta Sandbox INR Off-Ramp</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Direct integration with Onmeta’s fiat off-ramp staging environment, passing user wallet binding and
                target INR conversion for instant bank account settlement.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Real Onmeta Staging Off-Ramp Drawer */}
      {showOnmetaRamp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-950 border border-blue-800 rounded-lg text-blue-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Onmeta INR Bank Off-Ramp</h3>
                  <p className="text-[11px] text-neutral-400">Staging Sandbox Environment</p>
                </div>
              </div>
              <button
                onClick={() => setShowOnmetaRamp(false)}
                className="text-neutral-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1.5">
                <div className="flex justify-between text-neutral-400">
                  <span>Connected Monad Wallet:</span>
                  <span className="font-mono text-violet-300">
                    {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : "None"}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Settlement Fiat:</span>
                  <span className="font-semibold text-white">INR (Indian Rupee - UPI / IMPS)</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Network:</span>
                  <span className="font-semibold text-emerald-400">Monad Testnet (10143)</span>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 overflow-hidden bg-neutral-950 p-4 space-y-3 text-center">
                <p className="text-neutral-300 leading-relaxed text-xs">
                  This opens the verified Onmeta Staging widget initialized with your passkey-derived wallet address.
                </p>

                <a
                  href={onmetaSandboxUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition shadow-lg shadow-violet-950/50"
                >
                  Launch Official Onmeta Staging Ramp <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <p className="text-[10px] text-neutral-500">
                  Official Staging Endpoint: <code className="font-mono">{onmetaSandboxUrl.slice(0, 48)}...</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-neutral-800/80 bg-neutral-950 py-8 px-4 sm:px-8 text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-violet-600 flex items-center justify-center text-white font-bold text-xs">
            ₹
          </div>
          <span className="text-neutral-400 font-medium">NadRupee Protocol</span>
          <span>• Monad Metropolis Production Architecture</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <Link href="/auth-test" className="hover:text-neutral-300 transition">
            Protocol Lab
          </Link>
          <a
            href="https://docs.agora.finance"
            target="_blank"
            rel="noreferrer"
            className="hover:text-neutral-300 transition flex items-center gap-1"
          >
            Agora Docs <ArrowUpRight className="w-3 h-3" />
          </a>
          <a
            href="https://testnet.monadexplorer.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-neutral-300 transition flex items-center gap-1"
          >
            Monad Explorer <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}
