"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount } from "@/hooks/useAccount";
import { recoverMessageAddress } from "viem";
import {
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  LogOut,
  Fingerprint,
  PenTool,
  Loader2,
  RefreshCw,
  Zap,
  Activity,
  Coins,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  X,
  Menu,
  Send,
} from "lucide-react";
import {
  relayReleasePartial,
  relayReleaseRemainder,
  relayCancelJob,
  getClientNonce,
  type RelayResult,
} from "@/lib/relayer/client";
import {
  ESCROW_CONTRACT_ADDRESS,
  AUSD_CONTRACT_ADDRESS,
} from "@/lib/contracts/config";
import { getAusdBalance } from "@/lib/contracts/escrowClient";
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

interface RelayerHealthData {
  status: "healthy" | "low_balance" | "unconfigured" | "error" | "rpc_error";
  isConfigured: boolean;
  address: string | null;
  balanceMon: string;
  isLowBalance: boolean;
  minRecommendedMon: string;
  message: string;
  chainId?: number;
  escrowContract?: string;
  ausdContract?: string;
}

interface AgoraMetricsData {
  monad: {
    circulatingSupply: string;
    totalSupply: string;
    network: string;
  };
  totalCirculatingSupply: string;
}

export default function AuthTestPage() {
  const {
    address,
    account,
    isConnected,
    isConnecting,
    walletClient,
    error,
    isPrfUnavailable,
    storedCredentialId,
    showTestnetPasskey,
    signUp,
    signIn,
    connectTestnetPasskey,
    signOut,
    clearError,
  } = useAccount();

  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useState("freelancer@nadrupee");
  const [testMessage, setTestMessage] = useState(
    "Hello Monad! Signing with Mera Passkey on NadRupee."
  );
  const [signature, setSignature] = useState<string | null>(null);
  const [recoveredAddress, setRecoveredAddress] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  // Send AUSD Modal State & Balance
  const [showSendAusdModal, setShowSendAusdModal] = useState<boolean>(false);
  const [ausdBalance, setAusdBalance] = useState<number>(0);

  // Relayer Health State
  const [relayerHealth, setRelayerHealth] = useState<RelayerHealthData | null>(null);
  const [isCheckingRelayer, setIsCheckingRelayer] = useState(false);

  // Agora Metrics State
  const [agoraMetrics, setAgoraMetrics] = useState<AgoraMetricsData | null>(null);
  const [isFetchingAgora, setIsFetchingAgora] = useState(false);

  // Meta-transaction Relayer Test State
  const [testJobId, setTestJobId] = useState("1");
  const [isRelaying, setIsRelaying] = useState(false);
  const [relayResult, setRelayResult] = useState<RelayResult | null>(null);
  const [clientNonce, setClientNonce] = useState<string | null>(null);

  const fetchRelayerHealth = async () => {
    setIsCheckingRelayer(true);
    try {
      const res = await fetch("/api/relayer/health");
      const data = await res.json();
      setRelayerHealth(data);
    } catch (err: any) {
      setRelayerHealth({
        status: "error",
        isConfigured: false,
        address: null,
        balanceMon: "0",
        isLowBalance: true,
        minRecommendedMon: "0.05",
        message: err?.message || "Failed to reach relayer health API",
      });
    } finally {
      setIsCheckingRelayer(false);
    }
  };

  const fetchAgora = async () => {
    setIsFetchingAgora(true);
    try {
      const res = await fetch("/api/agora/metrics");
      const json = await res.json();
      if (json.success && json.data) {
        setAgoraMetrics(json.data);
      }
    } catch (err) {
      console.error("Agora metrics fetch failed:", err);
    } finally {
      setIsFetchingAgora(false);
    }
  };

  useEffect(() => {
    fetchRelayerHealth();
    fetchAgora();
    if (address) {
      getAusdBalance(address).then((b) => {
        const val = parseFloat(b.balanceFormatted);
        setAusdBalance(isNaN(val) ? 0 : val);
      }).catch(console.error);
    }
  }, [address]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignMessage = async () => {
    if (!walletClient || !address || !account) return;
    setIsSigning(true);
    setSignError(null);
    try {
      const sig = await walletClient.signMessage({
        account,
        message: testMessage,
      });
      setSignature(sig);

      const recovered = await recoverMessageAddress({
        message: testMessage,
        signature: sig,
      });
      setRecoveredAddress(recovered);
    } catch (err: any) {
      console.error("Sign message failed:", err);
      setSignError(err?.message || "Failed to sign message with passkey");
    } finally {
      setIsSigning(false);
    }
  };

  const handleFetchNonce = async () => {
    if (!address) return;
    try {
      const nonce = await getClientNonce(address);
      setClientNonce(nonce.toString());
    } catch (e: any) {
      console.error("Failed to fetch nonce:", e);
    }
  };

  const handleRelayAction = async (action: "partial" | "remainder" | "cancel") => {
    if (!walletClient || !address) return;
    setIsRelaying(true);
    setRelayResult(null);

    try {
      const jobIdBigInt = BigInt(testJobId);
      let res: RelayResult;

      if (action === "partial") {
        res = await relayReleasePartial({
          walletClient,
          jobId: jobIdBigInt,
          clientAddress: address,
        });
      } else if (action === "remainder") {
        res = await relayReleaseRemainder({
          walletClient,
          jobId: jobIdBigInt,
          clientAddress: address,
        });
      } else {
        res = await relayCancelJob({
          walletClient,
          jobId: jobIdBigInt,
          clientAddress: address,
        });
      }

      setRelayResult(res);
      handleFetchNonce();
    } catch (err: any) {
      setRelayResult({
        success: false,
        error: err?.message || "Relayer meta-transaction execution failed.",
      });
    } finally {
      setIsRelaying(false);
    }
  };

  return (
    <div className="page-container">
      {/* 1. FLOATING NAVIGATION BAR */}
      <nav className="nav-shell" aria-label="Main navigation">
        <div className="desktop-links">
          <Link href="/">Overview</Link>
          <Link href="/freelancer">Freelancer Portal</Link>
          <Link href="/client">Client Portal</Link>
          <Link href="/offramp">Instant INR Payout</Link>
          <Link href="/auth-test" style={{ color: "var(--paper)", fontWeight: 600 }}>
            Protocol Lab
          </Link>
        </div>

        <Link href="/" className="nav-brand">
          <Mark />
        </Link>

        <div className="desktop-links nav-actions">
          {isConnected ? (
            <div className="auth-status">
              <span className="auth-dot" />
              <span>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connected"}</span>
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
                onClick={() => signIn()}
                disabled={isConnecting}
                className="signin"
              >
                {isConnecting ? "Evaluating..." : "Biometric"}
              </button>
            </div>
          )}
          <Link href="/freelancer" className="action action-dark">
            Freelancer Portal
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

      {/* 2. MAIN CONTENT */}
      <main className="dashboard-shell">
        <div className="portal-hero">
          <div className="eyebrow dark-eyebrow">
            <Sparkles size={12} /> NADRUPEE · PROTOCOL LAB & DIAGNOSTICS <span>MONAD TESTNET</span>
          </div>
          <h1>
            <em>Protocol Diagnostics</em>
            <br />
            & Gasless Execution
          </h1>
          <p>
            Verify WebAuthn PRF passkey derivation, Agora AUSD testnet metrics, and gasless EIP-712 relayer execution.
          </p>
        </div>

        {/* Status Cards: Relayer Health + Agora Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "32px" }}>
          {/* Relayer Card */}
          <div className="portal-card">
            <div className="portal-card-header">
              <span className="portal-label">GASLESS RELAYER HEALTH</span>
              <button
                onClick={fetchRelayerHealth}
                disabled={isCheckingRelayer}
                style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}
              >
                <RefreshCw size={12} className={isCheckingRelayer ? "animate-spin" : ""} /> Refresh
              </button>
            </div>

            {relayerHealth ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Status:</span>
                  <span className={relayerHealth.status === "healthy" ? "badge-mint" : "badge-danger"}>
                    {relayerHealth.status}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Relayer Address:</span>
                  <code style={{ color: "var(--paper)" }}>
                    {relayerHealth.address ? `${relayerHealth.address.slice(0, 8)}...${relayerHealth.address.slice(-6)}` : "Not set"}
                  </code>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Sponsorship Balance:</span>
                  <strong style={{ color: "var(--mint-bright)" }}>
                    {parseFloat(relayerHealth.balanceMon).toFixed(4)} MON
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid color-mix(in oklab, var(--paper) 6%, transparent)", paddingTop: "8px" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Escrow Contract:</span>
                  <a
                    href={`https://testnet.monadexplorer.com/address/${relayerHealth.escrowContract || ESCROW_CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-link"
                    style={{ fontSize: "11px", fontFamily: "monospace" }}
                  >
                    {(relayerHealth.escrowContract || ESCROW_CONTRACT_ADDRESS).slice(0, 8)}...{(relayerHealth.escrowContract || ESCROW_CONTRACT_ADDRESS).slice(-6)} <ExternalLink size={10} />
                  </a>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Settlement Token:</span>
                  <a
                    href={`https://testnet.monadexplorer.com/address/${relayerHealth.ausdContract || AUSD_CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-link"
                    style={{ fontSize: "11px", fontFamily: "monospace" }}
                  >
                    {(relayerHealth.ausdContract || AUSD_CONTRACT_ADDRESS).slice(0, 8)}...{(relayerHealth.ausdContract || AUSD_CONTRACT_ADDRESS).slice(-6)} <ExternalLink size={10} />
                  </a>
                </div>
                {relayerHealth.isLowBalance && (
                  <div style={{ fontSize: "11px", color: "oklch(.75 .18 15)", marginTop: "4px" }}>
                    {relayerHealth.message}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-foreground)", fontSize: "12px" }}>
                <Loader2 size={14} className="animate-spin" /> Querying relayer node...
              </div>
            )}
          </div>

          {/* Agora Metrics Card */}
          <div className="portal-card">
            <div className="portal-card-header">
              <span className="portal-label">AGORA AUSD METRICS</span>
              <button
                onClick={fetchAgora}
                disabled={isFetchingAgora}
                style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}
              >
                <RefreshCw size={12} className={isFetchingAgora ? "animate-spin" : ""} /> Live API
              </button>
            </div>

            {agoraMetrics ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Monad AUSD Supply:</span>
                  <strong style={{ color: "var(--mint)" }}>
                    ${Number(agoraMetrics.monad.circulatingSupply).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Total Agora Volume:</span>
                  <span style={{ color: "var(--paper)" }}>
                    ${Number(agoraMetrics.totalCirculatingSupply).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Decimals & Permit:</span>
                  <span style={{ color: "var(--paper)" }}>6 Decimals · EIP-2612</span>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-foreground)", fontSize: "12px" }}>
                <Loader2 size={14} className="animate-spin" /> Querying Agora API...
              </div>
            )}
          </div>
        </div>

        {/* PRF_UNAVAILABLE Warning Banner if applicable */}
        {isPrfUnavailable && (
          <div style={{ padding: "16px 20px", borderRadius: "14px", marginBottom: "24px", background: "color-mix(in oklab, oklch(.66 .2 15) 12%, transparent)", border: "1px solid color-mix(in oklab, oklch(.66 .2 15) 30%, transparent)", color: "var(--paper)", fontSize: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, color: "oklch(.75 .18 15)" }}>
              <AlertTriangle size={15} /> PRF_UNAVAILABLE Detected
            </div>
            <p style={{ margin: "6px 0 0", color: "color-mix(in oklab, var(--paper) 75%, transparent)" }}>
              The WebAuthn PRF extension is required to derive a deterministic Monad EOA from your passkey. Please ensure your browser supports WebAuthn PRF (e.g. Chrome with Google Password Manager, or macOS Safari Touch ID).
            </p>
          </div>
        )}

        {/* Passkey Authentication Section */}
        <section className="portal-card" style={{ marginBottom: "32px" }}>
          <div className="portal-card-header">
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 500, margin: 0 }}>
                <em>Passkey Keypair Derivation</em>
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--muted-foreground)" }}>
                Deterministic BIP-44 key derivation from WebAuthn PRF secrets via Mera SDK.
              </p>
            </div>
          </div>

          {!isConnected ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "480px" }}>
              <div>
                <label className="portal-label">IDENTIFIER / USERNAME</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="freelancer@nadrupee"
                  className="portal-input"
                />
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => signUp(username)}
                  disabled={isConnecting}
                  className="action"
                  style={{ flex: 1 }}
                >
                  {isConnecting ? "Creating..." : "Create Passkey"}
                </button>
                <button
                  onClick={() => signIn()}
                  disabled={isConnecting}
                  className="action action-dark"
                  style={{ flex: 1 }}
                >
                  {isConnecting ? "Evaluating..." : "Sign In with Passkey"}
                </button>
              </div>

              {storedCredentialId && (
                <div style={{ fontSize: "11px", color: "var(--mint-bright)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Check size={12} /> Stored credential detected: {storedCredentialId.slice(0, 16)}...
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="badge-mint">
                  <Check size={11} /> Authenticated via Mera
                </span>
                <button onClick={signOut} className="action action-dark" style={{ minHeight: "32px", padding: "0 14px" }}>
                  Sign Out
                </button>
              </div>

              <div style={{ background: "color-mix(in oklab, var(--paper) 4%, transparent)", borderRadius: "12px", padding: "16px", fontSize: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "10px", color: "var(--muted-foreground)", textTransform: "uppercase" }}>Derived Monad Address (EOA)</span>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                  <code style={{ color: "var(--mint-bright)", fontSize: "13px", wordBreak: "break-all" }}>{address}</code>
                  <button
                    onClick={() => address && handleCopy(address)}
                    style={{ background: "none", border: "none", color: "var(--paper)", cursor: "pointer", opacity: 0.8 }}
                    title="Copy Address"
                  >
                    {copied ? <Check size={14} color="var(--mint)" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Message Signing Verification */}
              <div style={{ borderTop: "1px solid color-mix(in oklab, var(--paper) 8%, transparent)", paddingTop: "16px" }}>
                <label className="portal-label">TEST MESSAGE SIGNING</label>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "8px" }}>
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="portal-input"
                  />
                  <button
                    onClick={handleSignMessage}
                    disabled={isSigning}
                    className="action"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {isSigning ? "Signing..." : "Sign Message"}
                  </button>
                </div>

                {signature && (
                  <div style={{ marginTop: "12px", background: "color-mix(in oklab, var(--paper) 3%, transparent)", borderRadius: "10px", padding: "12px", fontSize: "11px", wordBreak: "break-all" }}>
                    <div style={{ color: "var(--muted-foreground)", marginBottom: "4px" }}>Signature:</div>
                    <code style={{ color: "var(--paper)" }}>{signature}</code>
                    <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", color: recoveredAddress?.toLowerCase() === address?.toLowerCase() ? "var(--mint-bright)" : "oklch(.75 .18 15)" }}>
                      <Check size={14} /> Verified: Recovered signer matches EOA address ({recoveredAddress?.slice(0, 8)}...)
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Gasless Meta-Transaction Relayer Execution Suite */}
        {isConnected && (
          <section className="portal-card">
            <div className="portal-card-header">
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 500, margin: 0 }}>
                  <em>Gasless Relayer Execution Test</em>
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--muted-foreground)" }}>
                  Trigger EIP-712 meta-transactions on Escrow.sol sponsored by the facilitator.
                </p>
              </div>
              <button
                onClick={handleFetchNonce}
                style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: "11px" }}
              >
                Nonce: <span style={{ color: "var(--mint-bright)" }}>{clientNonce !== null ? clientNonce : "check"}</span>
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <label className="portal-label" style={{ margin: 0 }}>TARGET JOB ID:</label>
                <input
                  type="number"
                  value={testJobId}
                  onChange={(e) => setTestJobId(e.target.value)}
                  className="portal-input"
                  style={{ width: "100px" }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                  onClick={() => handleRelayAction("partial")}
                  disabled={isRelaying}
                  className="action"
                >
                  {isRelaying ? "Relaying..." : "Relay 80% Advance"}
                </button>
                <button
                  onClick={() => handleRelayAction("remainder")}
                  disabled={isRelaying}
                  className="action"
                >
                  {isRelaying ? "Relaying..." : "Relay 20% Remainder"}
                </button>
                <button
                  onClick={() => handleRelayAction("cancel")}
                  disabled={isRelaying}
                  className="action action-dark"
                >
                  {isRelaying ? "Relaying..." : "Relay Cancel Job"}
                </button>
              </div>

              {relayResult && (
                <div style={{ marginTop: "12px", padding: "14px", borderRadius: "10px", background: relayResult.success ? "color-mix(in oklab, var(--mint) 12%, transparent)" : "color-mix(in oklab, oklch(.66 .2 15) 12%, transparent)", fontSize: "12px" }}>
                  <div style={{ fontWeight: 600, color: relayResult.success ? "var(--mint-bright)" : "oklch(.75 .18 15)" }}>
                    {relayResult.success ? "Relayer Transaction Relayed!" : "Execution Failed"}
                  </div>
                  <div style={{ margin: "4px 0", color: "var(--paper)" }}>
                    {relayResult.message || relayResult.error}
                  </div>
                  {relayResult.txHash && (
                    <a
                      href={`https://testnet.monadexplorer.com/tx/${relayResult.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-link"
                    >
                      View on Explorer <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Agora Bounty: Send AUSD Flow Test Suite */}
        {isConnected && (
          <section className="portal-card">
            <div className="portal-card-header">
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 500, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Send size={16} color="var(--mint)" />
                  <em>Agora Deliverable: Send AUSD Flow</em>
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--muted-foreground)" }}>
                  P2P Stablecoin Transfers on Monad Testnet with Mera Passkey auth (Gasless Relayer via EIP-2612 Permit & Direct).
                </p>
              </div>
              <span className="badge-mint">
                <Check size={11} /> Agora Bounty
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", background: "color-mix(in oklab, var(--paper) 3%, transparent)", padding: "16px", borderRadius: "12px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>YOUR ONCHAIN AUSD BALANCE</div>
                <strong style={{ fontSize: "22px", color: "var(--mint-bright)", display: "block", marginTop: "2px" }}>
                  ${ausdBalance.toFixed(2)} AUSD
                </strong>
                <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                  Token Address: {AUSD_CONTRACT_ADDRESS.slice(0, 10)}...{AUSD_CONTRACT_ADDRESS.slice(-6)}
                </span>
              </div>
              <button
                onClick={() => setShowSendAusdModal(true)}
                className="action"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Send size={14} /> Open Send AUSD Modal
              </button>
            </div>
          </section>
        )}
      </main>

      {/* SEND AUSD MODAL */}
      <SendAusdModal
        isOpen={showSendAusdModal}
        onClose={() => setShowSendAusdModal(false)}
        onSuccess={() => {
          if (address) {
            getAusdBalance(address).then((b) => {
              const val = parseFloat(b.balanceFormatted);
              setAusdBalance(isNaN(val) ? 0 : val);
            });
          }
        }}
        currentBalance={ausdBalance}
        fxRate={95.92}
        senderAddress={address}
        walletClient={walletClient}
      />

      {/* 3. UNIFIED FOOTER */}
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
