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
  Sparkles,
  Coins,
  RefreshCw,
  X,
  Menu,
  XCircle,
  Send,
  Zap,
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
import { SendAusdModal } from "@/components/SendAusdModal";

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
    showTestnetPasskey,
    signUp,
    signIn,
    connectTestnetPasskey,
    signOut,
  } = useAccount();

  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ausdBalance, setAusdBalance] = useState<string>("0.00");
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);

  // Send AUSD Modal State
  const [showSendModal, setShowSendModal] = useState<boolean>(false);

  // Form State
  const [freelancerInput, setFreelancerInput] = useState<string>("@arjun.monad");
  const [resolvedAddress, setResolvedAddress] = useState<string>(
    FREELANCER_HANDLE_DIRECTORY["@arjun.monad"]
  );
  const [jobTitle, setJobTitle] = useState<string>("Smart Contract Security Audit & Integration");
  const [amountInput, setAmountInput] = useState<number>(1000);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [lastCreatedTxHash, setLastCreatedTxHash] = useState<string | null>(null);

  // Created Jobs List
  const [createdJobs, setCreatedJobs] = useState<OnChainJobDetails[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(false);
  const [actionJobId, setActionJobId] = useState<bigint | null>(null);
  const [actionResult, setActionResult] = useState<RelayResult | null>(null);

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

  const handleAuthAction = () => {
    if (isConnected) {
      signOut();
    } else if (storedCredentialId) {
      signIn();
    } else {
      signUp("client@nadrupee");
    }
  };

  const partialAmount = Math.floor((amountInput * DEFAULT_PARTIAL_BPS) / 10000);
  const remainderAmount = amountInput - partialAmount;

  // Fund Job Execution
  const handleFundJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletClient || !address) return;

    const targetAddress = resolvedAddress || freelancerInput;
    if (!targetAddress.startsWith("0x") || targetAddress.length !== 42) {
      setCreationError("Please specify a valid Monad address or select a verified handle (@arjun.monad, @priya.dev, @rohit.sol).");
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
    <div className="page-container">
      {/* 1. FLOATING NAVIGATION BAR */}
      <nav className="nav-shell" aria-label="Main navigation">
        <div className="desktop-links">
          <Link href="/">Overview</Link>
          <Link href="/freelancer">Freelancer Portal</Link>
          <Link href="/client" style={{ color: "var(--paper)", fontWeight: 600 }}>
            Client Portal
          </Link>
          <Link href="/offramp">Instant INR Payout</Link>
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
              <span style={{ opacity: 0.4 }}>|</span>
              <span style={{ color: "var(--mint-bright)", fontWeight: 600 }}>
                {isLoadingBalance ? "..." : `${ausdBalance} AUSD`}
              </span>
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {showTestnetPasskey && (
                <button
                  onClick={connectTestnetPasskey}
                  disabled={isConnecting}
                  className="signin"
                  style={{
                    background: "color-mix(in oklab, var(--mint) 15%, transparent)",
                    border: "1px solid var(--mint)",
                    color: "var(--mint)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  title="Instant 1-Click Passkey for Local & Testnet Testing"
                >
                  <Zap size={13} className="inline mr-1 -mt-0.5" /> Testnet Passkey
                </button>
              )}
              <button
                onClick={handleAuthAction}
                disabled={isConnecting}
                className="signin"
              >
                {isConnecting ? "Connecting..." : "Biometric"}
              </button>
            </div>
          )}
          <Link href="/freelancer" className="action action-dark">
            Switch to Freelancer
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
          <Link href="/offramp" onClick={() => setMenuOpen(false)}>Instant INR Payout</Link>
          <Link href="/auth-test" onClick={() => setMenuOpen(false)}>Protocol Lab</Link>
        </div>
      )}

      {/* 2. MAIN DASHBOARD CONTENT */}
      <main className="dashboard-shell">
        {/* Portal Hero */}
        <div className="portal-hero">
          <div className="eyebrow dark-eyebrow">
            <Sparkles size={12} /> NADRUPEE · CLIENT ESCROW PORTAL <span>MONAD TESTNET</span>
          </div>
          <h1>
            <em>Fund work with certainty.</em>
            <br />
            Zero dispute risk.
          </h1>
          <p>
            Deposit and lock Agora AUSD into on-chain escrow to guarantee payments for Indian freelancers. 80% is unlocked when confirmed; 20% remainder upon milestone approval.
          </p>
        </div>

        {/* Action / Relay Notification Banner */}
        {actionResult && (
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "14px",
              marginBottom: "24px",
              background: actionResult.success
                ? "color-mix(in oklab, var(--mint) 12%, transparent)"
                : "color-mix(in oklab, oklch(.66 .2 15) 12%, transparent)",
              border: `1px solid ${
                actionResult.success
                  ? "color-mix(in oklab, var(--mint) 30%, transparent)"
                  : "color-mix(in oklab, oklch(.66 .2 15) 30%, transparent)"
              }`,
              color: "var(--paper)",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
              {actionResult.alreadyProcessed ? (
                <>
                  <ShieldCheck size={14} color="var(--mint)" />
                  <span>Idempotency Verified (0 Gas Wasted)</span>
                </>
              ) : actionResult.success ? (
                <>
                  <Check size={14} color="var(--mint)" />
                  <span>Transaction Successfully Relayed on Monad Testnet!</span>
                </>
              ) : (
                <>
                  <XCircle size={14} color="oklch(.75 .18 15)" />
                  <span>Execution Notice</span>
                </>
              )}
            </div>
            <p style={{ margin: "6px 0 0", color: "color-mix(in oklab, var(--paper) 75%, transparent)" }}>
              {actionResult.message || actionResult.error}
            </p>
            {actionResult.txHash && (
              <a
                href={`https://testnet.monadexplorer.com/tx/${actionResult.txHash}`}
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
          {/* Card 1: Client Escrow Balance */}
          <div className="portal-card">
            <div className="portal-card-header">
              <span className="portal-label">CLIENT AUSD BALANCE</span>
              <span className="badge-mint">
                <Check size={11} /> Monad Testnet
              </span>
            </div>
            <div style={{ margin: "14px 0 20px" }}>
              <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Agora AUSD Token Balance</div>
              <strong style={{ fontSize: "clamp(34px, 4vw, 48px)", fontWeight: 500, color: "var(--paper)", display: "block" }}>
                {isLoadingBalance ? "..." : `${ausdBalance} AUSD`}
              </strong>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid color-mix(in oklab, var(--paper) 8%, transparent)", paddingTop: "14px", flexWrap: "wrap", gap: "10px" }}>
              <button
                onClick={() => setShowSendModal(true)}
                disabled={!isConnected}
                className="action action-dark"
                style={{ minHeight: "34px", padding: "0 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Send size={12} /> Send AUSD
              </button>
              <a
                href={`https://testnet.monadexplorer.com/address/${AUSD_CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="text-link"
                style={{ fontSize: "11px" }}
              >
                Contract Explorer <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* Card 2: Escrows Managed */}
          <div className="portal-card">
            <div className="portal-card-header">
              <span className="portal-label">ESCROWS CREATED</span>
              <button
                onClick={loadData}
                disabled={isLoadingJobs}
                style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}
              >
                <RefreshCw size={12} className={isLoadingJobs ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
            <div style={{ margin: "14px 0 20px" }}>
              <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Total Jobs Funded</div>
              <strong style={{ fontSize: "clamp(34px, 4vw, 48px)", fontWeight: 500, color: "var(--mint)", display: "block" }}>
                {createdJobs.length} Jobs
              </strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid color-mix(in oklab, var(--paper) 8%, transparent)", paddingTop: "14px", fontSize: "11px", color: "var(--muted-foreground)" }}>
              <span>Smart Contract:</span>
              <a
                href={`https://testnet.monadexplorer.com/address/${ESCROW_CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="text-link"
                style={{ fontSize: "11px", fontFamily: "monospace" }}
              >
                {ESCROW_CONTRACT_ADDRESS.slice(0, 8)}...{ESCROW_CONTRACT_ADDRESS.slice(-6)} <ExternalLink size={10} />
              </a>
            </div>
          </div>

          {/* Card 3: Monad Protocol Guarantee */}
          <div className="portal-card">
            <div className="portal-card-header">
              <span className="portal-label">ESCROW SPECIFICATION</span>
              <span className="badge-muted">Non-custodial</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
              <div>
                <span style={{ fontSize: "10px", color: "var(--muted-foreground)", textTransform: "uppercase" }}>Advance Split</span>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--paper)" }}>
                  80% Instant Payout · 20% Milestone Remainder
                </div>
              </div>
              <div>
                <span style={{ fontSize: "10px", color: "var(--muted-foreground)", textTransform: "uppercase" }}>Finality & Gas</span>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--mint-bright)" }}>
                  &lt;1s Finality · Relayer Sponsored
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. FUND A NEW JOB FORM */}
        <section className="portal-card" style={{ marginBottom: "32px" }}>
          <div className="portal-card-header">
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 500, margin: 0 }}>
                <em>Fund a New Freelance Escrow</em>
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--muted-foreground)" }}>
                Specify the deliverable and lock the agreed AUSD payment. 80% releases instantly on confirmation.
              </p>
            </div>
          </div>

          <form onSubmit={handleFundJob} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              <div>
                <label className="portal-label">DELIVERABLE SCOPE & TITLE</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Smart Contract Security Audit"
                  required
                  className="portal-input"
                />
              </div>

              <div>
                <label className="portal-label">FREELANCER HANDLE OR MONAD ADDRESS</label>
                <input
                  type="text"
                  value={freelancerInput}
                  onChange={(e) => handleFreelancerChange(e.target.value)}
                  placeholder="@arjun.monad or 0x..."
                  required
                  className="portal-input"
                  style={{ fontFamily: "monospace" }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>Quick Pick:</span>
                  {Object.keys(FREELANCER_HANDLE_DIRECTORY).map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      onClick={() => handleFreelancerChange(handle)}
                      style={{
                        background: freelancerInput === handle ? "color-mix(in oklab, var(--mint) 20%, transparent)" : "color-mix(in oklab, var(--paper) 6%, transparent)",
                        border: `1px solid ${freelancerInput === handle ? "var(--mint)" : "color-mix(in oklab, var(--paper) 12%, transparent)"}`,
                        color: freelancerInput === handle ? "var(--mint-bright)" : "var(--paper)",
                        borderRadius: "14px",
                        padding: "3px 10px",
                        fontSize: "10px",
                        cursor: "pointer",
                      }}
                    >
                      {handle}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="portal-label">AMOUNT IN AUSD</label>
              <input
                type="number"
                step="any"
                min="1"
                value={amountInput}
                onChange={(e) => setAmountInput(parseFloat(e.target.value) || 0)}
                required
                className="portal-input"
                style={{ maxWidth: "320px" }}
              />
            </div>

            {/* Split Breakdown Preview */}
            <div style={{ background: "color-mix(in oklab, var(--paper) 4%, transparent)", borderRadius: "12px", padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "11px" }}>
              <div>
                <span style={{ color: "var(--muted-foreground)", display: "block" }}>TOTAL ESCROW LOCK</span>
                <strong style={{ fontSize: "16px", color: "var(--paper)" }}>${amountInput.toFixed(2)} AUSD</strong>
              </div>
              <div>
                <span style={{ color: "var(--muted-foreground)", display: "block" }}>80% INSTANT ADVANCE</span>
                <strong style={{ fontSize: "16px", color: "var(--mint-bright)" }}>${partialAmount.toFixed(2)} AUSD</strong>
              </div>
              <div>
                <span style={{ color: "var(--muted-foreground)", display: "block" }}>20% UPON COMPLETION</span>
                <strong style={{ fontSize: "16px", color: "var(--paper)" }}>${remainderAmount.toFixed(2)} AUSD</strong>
              </div>
            </div>

            {creationError && (
              <div style={{ color: "oklch(.75 .18 15)", fontSize: "11px" }}>{creationError}</div>
            )}

            {lastCreatedTxHash && (
              <div style={{ color: "var(--mint-bright)", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Check size={13} /> Job successfully funded onchain!
                <a
                  href={`https://testnet.monadexplorer.com/tx/${lastCreatedTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link"
                >
                  View Transaction <ExternalLink size={10} />
                </a>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="submit"
                disabled={isSubmitting || !isConnected}
                className="action"
                style={{ minHeight: "42px", padding: "0 28px", opacity: isSubmitting || !isConnected ? 0.5 : 1 }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Broadcasting to Monad...
                  </>
                ) : !isConnected ? (
                  "Connect Passkey to Fund"
                ) : (
                  "Fund Escrow Job"
                )}
              </button>
            </div>
          </form>
        </section>

        {/* 4. CREATED JOBS LIST */}
        <section className="portal-card">
          <div className="portal-card-header">
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 500, margin: 0 }}>
                <em>Created Job Escrows</em> ({createdJobs.length})
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--muted-foreground)" }}>
                Contracts created by your address on Monad Testnet with approval and cancellation controls.
              </p>
            </div>
            <button
              onClick={loadData}
              disabled={isLoadingJobs}
              style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", fontSize: "11px" }}
            >
              <RefreshCw size={12} className={isLoadingJobs ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {!isConnected ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ color: "var(--muted-foreground)", fontSize: "13px", marginBottom: "16px" }}>
                Connect your client passkey to view your created escrow contracts.
              </div>
              <button onClick={handleAuthAction} className="action">
                Connect Passkey
              </button>
            </div>
          ) : isLoadingJobs ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "40px", color: "var(--muted-foreground)", fontSize: "12px" }}>
              <Loader2 size={16} className="animate-spin" /> Querying Escrow Contracts...
            </div>
          ) : createdJobs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--muted-foreground)", fontSize: "12px" }}>
              No escrow jobs created yet. Use the form above to fund your first job on Monad.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {createdJobs.map((job) => {
                const isFunded = job.state === JobState.Funded;
                const isPartiallyReleased = job.state === JobState.PartiallyReleased;
                const isCompleted = job.state === JobState.Completed;

                return (
                  <div
                    key={job.jobId.toString()}
                    style={{
                      border: "1px solid color-mix(in oklab, var(--paper) 8%, transparent)",
                      borderRadius: "14px",
                      padding: "22px",
                      background: "color-mix(in oklab, var(--paper) 3%, transparent)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "14px",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                          <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--paper)" }}>
                            {job.deliverableTitle || `Contract #${job.jobId.toString()}`}
                          </span>
                          <span className={isCompleted ? "badge-mint" : isPartiallyReleased ? "badge-mint" : isFunded ? "badge-muted" : "badge-danger"}>
                            {JOB_STATE_LABELS[job.state]}
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--muted-foreground)", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                          <span>
                            Freelancer: <code style={{ color: "var(--paper)" }}>{job.freelancer.slice(0, 6)}...{job.freelancer.slice(-4)}</code>
                            <button
                              type="button"
                              onClick={() => handleCopy(job.freelancer)}
                              style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", opacity: 0.7, marginLeft: "4px" }}
                              title="Copy Freelancer Address"
                            >
                              <Copy size={10} />
                            </button>
                          </span>
                          <span>Total: <strong style={{ color: "var(--paper)" }}>${job.amountFormatted} AUSD</strong></span>
                          <span>80% Advance: <strong style={{ color: "var(--mint-bright)" }}>${job.partialAmountFormatted} AUSD</strong></span>
                          <span>Remainder (20%): ${job.remainderAmountFormatted} AUSD</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        {isPartiallyReleased && (
                          <button
                            onClick={() => handleReleaseRemainder(job.jobId)}
                            disabled={actionJobId === job.jobId}
                            className="action"
                            style={{ minHeight: "34px", padding: "0 18px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                          >
                            {actionJobId === job.jobId ? (
                              <>
                                <Loader2 size={12} className="animate-spin" /> Releasing...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={13} /> Approve & Release 20%
                              </>
                            )}
                          </button>
                        )}

                        {isFunded && (
                          <button
                            onClick={() => handleCancelJob(job.jobId)}
                            disabled={actionJobId === job.jobId}
                            className="action action-dark"
                            style={{ minHeight: "34px", padding: "0 16px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                          >
                            {actionJobId === job.jobId ? (
                              <>
                                <Loader2 size={12} className="animate-spin" /> Cancelling...
                              </>
                            ) : (
                              <>
                                <XCircle size={13} /> Cancel Job
                              </>
                            )}
                          </button>
                        )}

                        {isCompleted && (
                          <span className="badge-mint" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Check size={13} /> Completed & Settled
                          </span>
                        )}

                        {job.txHash && (
                          <a
                            href={`https://testnet.monadexplorer.com/tx/${job.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-link"
                            title="View on Monad Explorer"
                            style={{ fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "3px" }}
                          >
                            Explorer <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Milestone Progression Stepper */}
                    <div className="milestone-stepper">
                      <div className={`milestone-step ${isFunded || isPartiallyReleased || isCompleted ? "completed" : "active"}`}>
                        <span className="milestone-step-dot">
                          {isFunded || isPartiallyReleased || isCompleted ? <Check size={11} /> : "1"}
                        </span>
                        <span>1. Escrow Locked (100%)</span>
                      </div>

                      <div className={`milestone-divider ${isPartiallyReleased || isCompleted ? "completed" : ""}`} />

                      <div className={`milestone-step ${isPartiallyReleased || isCompleted ? "completed" : isFunded ? "active" : ""}`}>
                        <span className="milestone-step-dot">
                          {isPartiallyReleased || isCompleted ? <Check size={11} /> : "2"}
                        </span>
                        <span>2. 80% Advance Claimed</span>
                      </div>

                      <div className={`milestone-divider ${isCompleted ? "completed" : ""}`} />

                      <div className={`milestone-step ${isCompleted ? "completed" : isPartiallyReleased ? "active" : ""}`}>
                        <span className="milestone-step-dot">
                          {isCompleted ? <Check size={11} /> : "3"}
                        </span>
                        <span>3. 20% Milestone Remainder</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* SEND AUSD MODAL */}
      <SendAusdModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSuccess={() => loadData()}
        currentBalance={parseFloat(ausdBalance) || 0}
        fxRate={95.92}
        senderAddress={address}
        walletClient={walletClient}
      />

      {/* 5. UNIFIED FOOTER */}
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
          <Link href="/offramp">Instant INR Payout</Link>
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
