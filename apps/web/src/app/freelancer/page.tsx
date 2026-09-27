"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAccount } from "@/hooks/useAccount";
import {
  ArrowRight,
  Activity,
  Check,
  IndianRupee,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
  ExternalLink,
  Copy,
  Loader2,
  RefreshCw,
  Coins,
  History,
  FileText,
  Printer,
  CheckCircle2,
  AlertCircle,
  Building2,
  Lock,
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

const Mark = ({ compact = false }: { compact?: boolean }) => (
  <span className="brand-lockup" aria-label="NadRupee">
    <span className="brand-mark">
      <i />
      <i />
      <i />
    </span>
    {!compact && <b>NadRupee</b>}
  </span>
);

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

  const [menuOpen, setMenuOpen] = useState(false);
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
  const [upiIdInput, setUpiIdInput] = useState<string>("freelancer@okhdfcbank");
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

  const handleAuthAction = () => {
    if (isConnected) {
      signOut();
    } else if (storedCredentialId) {
      signIn();
    } else {
      signUp("freelancer@nadrupee");
    }
  };

  // Exact INR Balance — strictly calculated on real state, never fake animated
  const inrBalance = (ausdBalance * fxQuote.rate).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
        error: err?.message || "Failed to process 80% instant release.",
      });
    } finally {
      setClaimingJobId(null);
    }
  };

  const handleOpenCashout = () => {
    setCashoutAmountUsd(Math.min(100, Math.max(10, Math.floor(ausdBalance))));
    setCashoutError(null);
    setActiveReceipt(null);
    setShowCashoutModal(true);
  };

  const handleConfirmCashout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    if (cashoutAmountUsd <= 0) {
      setCashoutError("Please enter a valid withdrawal amount.");
      return;
    }
    if (cashoutAmountUsd > ausdBalance) {
      setCashoutError("Withdrawal amount cannot exceed available AUSD balance.");
      return;
    }
    if (!upiIdInput.includes("@")) {
      setCashoutError("Please enter a valid UPI Virtual Payment Address (e.g. name@bank).");
      return;
    }

    setIsProcessingCashout(true);
    setCashoutError(null);

    try {
      const res = await fetch("/api/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: cashoutAmountUsd,
          upiId: upiIdInput,
          freelancerAddress: address,
          lockedRate: fxQuote.rate,
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
      setAusdBalance((prev) => Math.max(0, prev - data.amountUsd));

      if (typeof window !== "undefined" && address) {
        const cashoutKey = `nadrupee_cashouts_${address.toLowerCase()}`;
        const updated = [receipt, ...storedCashouts];
        setStoredCashouts(updated);
        localStorage.setItem(cashoutKey, JSON.stringify(updated.slice(0, 30)));
      }
    } catch (err: any) {
      setCashoutError(err?.message || "Failed to process sandbox cashout.");
    } finally {
      setIsProcessingCashout(false);
    }
  };

  const fullTransactionHistory: TransactionHistoryItem[] = useMemo(() => {
    const list: TransactionHistoryItem[] = [];

    for (const job of freelancerJobs) {
      const jobTotalInr = Number((parseFloat(job.amountFormatted) * fxQuote.rate).toFixed(2));
      const jobPartialInr = Number((parseFloat(job.partialAmountFormatted) * fxQuote.rate).toFixed(2));
      const jobRemainderInr = Number((parseFloat(job.remainderAmountFormatted) * fxQuote.rate).toFixed(2));
      const jobDate =
        job.createdAt > BigInt(0)
          ? new Date(Number(job.createdAt) * 1000).toUTCString()
          : new Date().toUTCString();

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
    <div className="page-container">
      {/* 1. FLOATING NAVIGATION BAR */}
      <nav className="nav-shell" aria-label="Main navigation">
        <div className="desktop-links">
          <Link href="/">Overview</Link>
          <Link href="/freelancer" style={{ color: "var(--paper)", fontWeight: 600 }}>
            Freelancer Portal
          </Link>
          <Link href="/client">Client Portal</Link>
          <Link href="/auth-test">Protocol Lab</Link>
        </div>

        <Link href="/" className="nav-brand">
          <Mark />
        </Link>

        <div className="desktop-links nav-actions">
          {isConnected ? (
            <div className="auth-status">
              <span className="auth-dot" />
              <span>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connected"}</span>
              <button
                onClick={() => address && handleCopy(address)}
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", opacity: 0.7 }}
                title="Copy Address"
              >
                {copied ? <Check size={11} color="var(--mint)" /> : <Copy size={11} />}
              </button>
              <button onClick={signOut} className="auth-signout" title="Sign out">
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={handleAuthAction}
              disabled={isConnecting}
              className="signin"
            >
              {isConnecting ? "Verifying..." : "Sign in"}
            </button>
          )}
          <Link href="/client" className="action action-dark">
            Switch to Client
          </Link>
        </div>

        <button
          className="menu-button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {menuOpen && (
        <div className="mobile-menu" id="mobile-navigation">
          <Link href="/" onClick={() => setMenuOpen(false)}>Overview</Link>
          <Link href="/freelancer" onClick={() => setMenuOpen(false)}>Freelancer Portal</Link>
          <Link href="/client" onClick={() => setMenuOpen(false)}>Client Portal</Link>
          <Link href="/auth-test" onClick={() => setMenuOpen(false)}>Protocol Lab</Link>
        </div>
      )}

      {/* 2. MAIN DASHBOARD CONTENT */}
      <main className="dashboard-shell">
        {/* Portal Hero */}
        <div className="portal-hero">
          <div className="eyebrow dark-eyebrow">
            <Sparkles size={12} /> NADRUPEE · FREELANCER DASHBOARD <span>MONAD TESTNET</span>
          </div>
          <h1>
            <em>Your earnings,</em>
            <br />
            ready when you are.
          </h1>
          <p>
            Instant, escrow-backed payments settled in Agora AUSD on Monad Testnet and cashed out directly to your Indian bank account via UPI.
          </p>
        </div>

        {/* Claim / Relay Notification Banner */}
        {claimResult && (
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "14px",
              marginBottom: "24px",
              background: claimResult.success
                ? "color-mix(in oklab, var(--mint) 12%, transparent)"
                : "color-mix(in oklab, oklch(.66 .2 15) 12%, transparent)",
              border: `1px solid ${
                claimResult.success
                  ? "color-mix(in oklab, var(--mint) 30%, transparent)"
                  : "color-mix(in oklab, oklch(.66 .2 15) 30%, transparent)"
              }`,
              color: "var(--paper)",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
              {claimResult.success ? (
                <>
                  <Check size={14} color="var(--mint)" />
                  <span>80% Instant Payout Advance Released Onchain!</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} color="oklch(.75 .18 15)" />
                  <span>Execution Notice</span>
                </>
              )}
            </div>
            <p style={{ margin: "6px 0 0", color: "color-mix(in oklab, var(--paper) 75%, transparent)" }}>
              {claimResult.message || claimResult.error}
            </p>
            {claimResult.txHash && (
              <a
                href={`https://testnet.monadexplorer.com/tx/${claimResult.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-link"
                style={{ marginTop: "8px", display: "inline-flex" }}
              >
                View on Monad Explorer <ExternalLink size={12} />
              </a>
            )}
          </div>
        )}

        {/* Top Metric Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "32px" }}>
          {/* Card 1: Balance in INR */}
          <div className="portal-card">
            <div className="portal-card-header">
              <span className="portal-label">AVAILABLE EARNINGS</span>
              <span className="badge-mint">
                <Check size={11} /> Real-time Quote
              </span>
            </div>
            <div style={{ margin: "14px 0 20px" }}>
              <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Estimated Value in INR</div>
              <strong style={{ fontSize: "clamp(34px, 4vw, 48px)", fontWeight: 500, color: "var(--paper)", display: "block" }}>
                ₹{isLoadingBalance ? "..." : inrBalance}
              </strong>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid color-mix(in oklab, var(--paper) 8%, transparent)", paddingTop: "14px" }}>
              <div>
                <span style={{ fontSize: "10px", color: "var(--muted-foreground)", display: "block" }}>ON-CHAIN BALANCE</span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--mint-bright)" }}>
                  {isLoadingBalance ? "..." : `${ausdBalance.toFixed(2)} AUSD`}
                </span>
              </div>
              <button
                onClick={handleOpenCashout}
                disabled={ausdBalance <= 0 || !isConnected}
                className="action"
                style={{ minHeight: "34px", padding: "0 18px", opacity: ausdBalance <= 0 || !isConnected ? 0.4 : 1 }}
              >
                Cash Out to UPI
              </button>
            </div>
          </div>

          {/* Card 2: Live FX Rate */}
          <div className="portal-card">
            <div className="portal-card-header">
              <span className="portal-label">USD / INR EXCHANGE RATE</span>
              <button
                onClick={fetchFxQuote}
                disabled={isFetchingFx}
                style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}
              >
                <RefreshCw size={12} className={isFetchingFx ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
            <div style={{ margin: "14px 0 20px" }}>
              <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Guaranteed Cashout Rate</div>
              <strong style={{ fontSize: "clamp(34px, 4vw, 48px)", fontWeight: 500, color: "var(--mint)", display: "block" }}>
                1 USD = ₹{fxQuote.rate.toFixed(2)}
              </strong>
            </div>

            <div style={{ borderTop: "1px solid color-mix(in oklab, var(--paper) 8%, transparent)", paddingTop: "14px", fontSize: "11px", color: "var(--muted-foreground)" }}>
              <span>Quote Timestamp: </span>
              <span style={{ color: "var(--paper)" }}>{fxQuote.timestamp}</span>
              <div style={{ fontSize: "9px", opacity: 0.6, marginTop: "2px" }}>Source: {fxQuote.provider} (strictly event-driven, zero synthetic ticks)</div>
            </div>
          </div>

          {/* Card 3: Identity & Gasless Relaying */}
          <div className="portal-card">
            <div className="portal-card-header">
              <span className="portal-label">SECURITY & PROTOCOL</span>
              <span className="badge-muted">Facilitator Active</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
              <div>
                <span style={{ fontSize: "10px", color: "var(--muted-foreground)", textTransform: "uppercase" }}>Passkey Identity</span>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--paper)" }}>
                  {isConnected ? "Mera Biometric Passkey" : "Unconnected"}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "10px", color: "var(--muted-foreground)", textTransform: "uppercase" }}>Gas Fees</span>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--mint-bright)" }}>
                  ₹0 — Sponsored by Monad Facilitator
                </div>
              </div>
              <div style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                Contract: <code style={{ color: "var(--paper)" }}>{ESCROW_CONTRACT_ADDRESS ? `${ESCROW_CONTRACT_ADDRESS.slice(0, 8)}...${ESCROW_CONTRACT_ADDRESS.slice(-6)}` : "Testnet Configured"}</code>
              </div>
            </div>
          </div>
        </div>

        {/* 3. ACTIVE & COMPLETED JOBS LIST */}
        <section className="portal-card" style={{ marginBottom: "32px" }}>
          <div className="portal-card-header">
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 500, margin: 0 }}>
                <em>Contract Escrows</em> ({freelancerJobs.length})
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--muted-foreground)" }}>
                Jobs where your address is the designated freelancer. Funds are locked by the client before you begin work.
              </p>
            </div>
            <button
              onClick={loadFreelancerData}
              disabled={isLoadingJobs}
              style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", fontSize: "11px" }}
            >
              <RefreshCw size={12} className={isLoadingJobs ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {!isConnected ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ color: "var(--muted-foreground)", fontSize: "13px", marginBottom: "16px" }}>
                Connect your Mera passkey to inspect and claim your escrow payouts.
              </div>
              <button onClick={handleAuthAction} className="action">
                Sign in with Passkey
              </button>
            </div>
          ) : isLoadingJobs ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "40px", color: "var(--muted-foreground)", fontSize: "12px" }}>
              <Loader2 size={16} className="animate-spin" /> Querying Monad Testnet Escrows...
            </div>
          ) : freelancerJobs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--muted-foreground)", fontSize: "12px" }}>
              No active job escrows found for your address yet.
              <br />
              When a client creates and funds a job in the Client Portal, it will appear here immediately.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {freelancerJobs.map((job) => {
                const totalInr = (parseFloat(job.amountFormatted) * fxQuote.rate).toFixed(2);
                const advanceInr = (parseFloat(job.partialAmountFormatted) * fxQuote.rate).toFixed(2);
                const isFunded = job.state === JobState.Funded;
                const isPartiallyReleased = job.state === JobState.PartiallyReleased;
                const isCompleted = job.state === JobState.Completed;

                return (
                  <div
                    key={job.jobId.toString()}
                    style={{
                      border: "1px solid color-mix(in oklab, var(--paper) 8%, transparent)",
                      borderRadius: "12px",
                      padding: "20px",
                      background: "color-mix(in oklab, var(--paper) 3%, transparent)",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                        <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--paper)" }}>
                          {job.deliverableTitle || `Contract #${job.jobId.toString()}`}
                        </span>
                        <span className={isCompleted || isPartiallyReleased ? "badge-mint" : isFunded ? "badge-muted" : "badge-danger"}>
                          {JOB_STATE_LABELS[job.state]}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted-foreground)", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                        <span>Client: <code style={{ color: "var(--paper)" }}>{job.client.slice(0, 6)}...{job.client.slice(-4)}</code></span>
                        <span>Total: <strong style={{ color: "var(--paper)" }}>₹{Number(totalInr).toLocaleString("en-IN")} ({job.amountFormatted} AUSD)</strong></span>
                        <span>80% Advance: ₹{Number(advanceInr).toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {isFunded && (
                        <button
                          onClick={() => handleClaimAdvance(job.jobId)}
                          disabled={claimingJobId === job.jobId}
                          className="action"
                          style={{ minHeight: "34px", padding: "0 18px" }}
                        >
                          {claimingJobId === job.jobId ? (
                            <>
                              <Loader2 size={12} className="animate-spin" /> Claiming...
                            </>
                          ) : (
                            "Claim 80% Instant Payout"
                          )}
                        </button>
                      )}

                      {isPartiallyReleased && (
                        <span style={{ fontSize: "11px", color: "var(--mint-bright)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Check size={13} /> 80% Advance Deposited
                        </span>
                      )}

                      {isCompleted && (
                        <span style={{ fontSize: "11px", color: "var(--mint-bright)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Check size={13} /> 100% Payout Finalized
                        </span>
                      )}

                      {job.txHash && (
                        <a
                          href={`https://testnet.monadexplorer.com/tx/${job.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-link"
                          title="View on Monad Explorer"
                        >
                          Explorer <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 4. TRANSACTION & CASHOUT HISTORY */}
        <section className="portal-card">
          <div className="portal-card-header">
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 500, margin: 0 }}>
                <em>Transaction History</em>
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--muted-foreground)" }}>
                Verified onchain releases, advances, and sandbox bank cash-outs for this address.
              </p>
            </div>
          </div>

          {fullTransactionHistory.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 20px", color: "var(--muted-foreground)", fontSize: "12px" }}>
              No recorded transactions yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {fullTransactionHistory.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 0",
                    borderBottom: "1px solid color-mix(in oklab, var(--paper) 6%, transparent)",
                    fontSize: "12px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--paper)" }}>{item.description}</div>
                    <div style={{ fontSize: "10px", color: "var(--muted-foreground)", marginTop: "2px" }}>
                      {item.timestamp} {item.referenceCode && `· Ref: ${item.referenceCode}`}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 600, color: item.isCredit ? "var(--mint-bright)" : "var(--paper)" }}>
                      {item.isCredit ? "+" : "-"}₹{item.amountInr.toLocaleString("en-IN")}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                      ${item.amountUsd.toFixed(2)} AUSD
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 5. CASHOUT CONFIRMATION MODAL & VOUCHER */}
      {showCashoutModal && (
        <div className="modal-backdrop" onClick={() => !isProcessingCashout && setShowCashoutModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px", width: "100%" }}>
            {activeReceipt ? (
              /* Receipt Voucher Screen */
              <div className="receipt-voucher">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginBottom: "20px" }}>
                  <Mark />
                  <span style={{ fontSize: "10px", padding: "4px 8px", background: "var(--night)", color: "var(--paper)", borderRadius: "8px", fontWeight: 600 }}>
                    SANDBOX RECEIPT
                  </span>
                </div>

                <div style={{ textAlign: "center", margin: "20px 0" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>PAYOUT AMOUNT TRANSFERRED</div>
                  <strong style={{ fontSize: "36px", fontWeight: 500, color: "var(--foreground)", display: "block", margin: "4px 0" }}>
                    ₹{activeReceipt.amountInr.toLocaleString("en-IN")}
                  </strong>
                  <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                    ${activeReceipt.amountUsd.toFixed(2)} AUSD @ ₹{activeReceipt.lockedRate.toFixed(2)}/USD
                  </span>
                </div>

                <div style={{ background: "color-mix(in oklab, var(--night) 4%, transparent)", borderRadius: "10px", padding: "14px", fontSize: "11px", display: "flex", flexDirection: "column", gap: "8px", margin: "18px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>Recipient UPI:</span>
                    <strong style={{ fontFamily: "monospace" }}>{activeReceipt.upiId}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>Receipt ID:</span>
                    <span style={{ fontFamily: "monospace" }}>{activeReceipt.receiptId}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>Reference Code:</span>
                    <span style={{ fontFamily: "monospace" }}>{activeReceipt.referenceCode}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>Timestamp:</span>
                    <span>{activeReceipt.timestamp}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>Onchain Hash:</span>
                    <a
                      href={`https://testnet.monadexplorer.com/tx/${activeReceipt.onchainTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--foreground)", textDecoration: "underline", fontFamily: "monospace" }}
                    >
                      {activeReceipt.onchainTxHash.slice(0, 10)}... <ExternalLink size={10} style={{ display: "inline" }} />
                    </a>
                  </div>
                </div>

                <div style={{ fontSize: "10px", color: "var(--muted-foreground)", textAlign: "center", marginBottom: "20px" }}>
                  This is an auditable sandbox payout confirmation. In production, this trigger executes instant UPI disbursement via licensed banking partners.
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => window.print()}
                    style={{ flex: 1, padding: "10px", borderRadius: "12px", border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    <Printer size={13} /> Print
                  </button>
                  <button
                    onClick={() => setShowCashoutModal(false)}
                    className="action"
                    style={{ flex: 1, minHeight: "40px" }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Cashout Form Screen */
              <div className="portal-card" style={{ background: "var(--night-soft)" }}>
                <div className="portal-card-header">
                  <div className="portal-card-title">
                    <IndianRupee size={16} color="var(--mint)" /> Cash Out to Bank Account
                  </div>
                  <button
                    onClick={() => setShowCashoutModal(false)}
                    style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleConfirmCashout} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label className="portal-label">AMOUNT IN AUSD</label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      max={ausdBalance}
                      value={cashoutAmountUsd}
                      onChange={(e) => setCashoutAmountUsd(parseFloat(e.target.value) || 0)}
                      required
                      className="portal-input"
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--muted-foreground)", marginTop: "4px" }}>
                      <span>Max Available: ${ausdBalance.toFixed(2)} AUSD</span>
                      <button
                        type="button"
                        onClick={() => setCashoutAmountUsd(Math.floor(ausdBalance))}
                        style={{ background: "none", border: "none", color: "var(--mint-bright)", cursor: "pointer" }}
                      >
                        Set Max
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="portal-label">RECIPIENT UPI ID</label>
                    <input
                      type="text"
                      value={upiIdInput}
                      onChange={(e) => setUpiIdInput(e.target.value)}
                      placeholder="freelancer@bank"
                      required
                      className="portal-input"
                    />
                  </div>

                  <div style={{ background: "color-mix(in oklab, var(--paper) 4%, transparent)", borderRadius: "10px", padding: "12px", fontSize: "11px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--muted-foreground)" }}>Locked Rate:</span>
                      <strong style={{ color: "var(--mint)" }}>1 USD = ₹{fxQuote.rate.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid color-mix(in oklab, var(--paper) 8%, transparent)", paddingTop: "6px" }}>
                      <span style={{ color: "var(--muted-foreground)" }}>You will receive:</span>
                      <strong style={{ fontSize: "15px", color: "var(--paper)" }}>
                        ₹{(cashoutAmountUsd * fxQuote.rate).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>

                  {cashoutError && (
                    <div style={{ color: "oklch(.75 .18 15)", fontSize: "11px" }}>{cashoutError}</div>
                  )}

                  <div style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                    Notice: This simulates an immediate UPI IMPS disbursement on Monad testnet with an onchain audit receipt.
                  </div>

                  <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setShowCashoutModal(false)}
                      className="action action-dark"
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessingCashout}
                      className="action"
                      style={{ flex: 1.5 }}
                    >
                      {isProcessingCashout ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> Processing...
                        </>
                      ) : (
                        "Confirm Cash Out"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. UNIFIED FOOTER */}
      <footer className="footer">
        <div className="footer-tab">
          <Mark />
        </div>
        <div className="footer-lead">
          Instant, escrow-backed
          <br />
          payments for Indian
          <br />
          freelancers — built on Monad.
        </div>
        <div>
          <small>PRODUCT</small>
          <Link href="/#funding">How it works</Link>
          <Link href="/freelancer">For Freelancers</Link>
          <Link href="/client">For Clients</Link>
          <Link href="/auth-test">Protocol Lab</Link>
        </div>
        <div>
          <small>COMPANY</small>
          <Link href="/#company">About</Link>
          <a href="mailto:hello@nadrupee.xyz">Contact</a>
        </div>
        <div>
          <small>RESOURCES</small>
          <Link href="/#funding">Features</Link>
          <Link href="/#insights">Infrastructure</Link>
        </div>
        <div>
          <small>INSIGHTS</small>
          <Link href="/#insights">NadRupee on Monad</Link>
          <Link href="/#company">Freelancer stories</Link>
        </div>
        <div className="footer-meta">
          <span>© 2026 NadRupee</span>
          <a href="mailto:hello@nadrupee.xyz">hello@nadrupee.xyz</a>
        </div>
      </footer>
    </div>
  );
}
