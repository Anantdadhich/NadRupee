"use client";

import React, { useState, useEffect } from "react";
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
    signUp,
    signIn,
    signOut,
    clearError,
  } = useAccount();

  const [username, setUsername] = useState("freelancer@nadrupee");
  const [testMessage, setTestMessage] = useState(
    "Hello Monad! Signing with Mera Passkey on NadRupee."
  );
  const [signature, setSignature] = useState<string | null>(null);
  const [recoveredAddress, setRecoveredAddress] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

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
  }, []);

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign message";
      setSignError(msg);
    } finally {
      setIsSigning(false);
    }
  };

  const handleFetchNonce = async () => {
    if (!address) return;
    try {
      const nonce = await getClientNonce(address);
      setClientNonce(nonce.toString());
    } catch (err: any) {
      setClientNonce("0 (contract uncalled)");
    }
  };

  const handleRelayAction = async (actionType: "partial" | "remainder" | "cancel") => {
    if (!walletClient || !address) return;
    setIsRelaying(true);
    setRelayResult(null);

    try {
      const jobIdBigInt = BigInt(testJobId || "1");
      let res: RelayResult;

      if (actionType === "partial") {
        res = await relayReleasePartial({
          walletClient,
          jobId: jobIdBigInt,
          clientAddress: address,
        });
      } else if (actionType === "remainder") {
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-950/60 border border-violet-800/50 rounded-xl text-violet-400">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                NadRupee Protocol Lab
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-900/50 border border-violet-700/60 text-violet-300">
                  Mera Passkey & Relayer
                </span>
              </h1>
              <p className="text-xs text-neutral-400">
                WebAuthn PRF → BIP-44 Monad EOA + EIP-712 Gasless Settlement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-800 border border-neutral-700 text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Monad Testnet (10143)
            </span>
          </div>
        </div>

        {/* Protocol Network Status Grid: Relayer Health + Agora Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Relayer Wallet Status */}
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Gasless Relayer Health
              </span>
              <button
                onClick={fetchRelayerHealth}
                disabled={isCheckingRelayer}
                className="text-[11px] text-neutral-400 hover:text-neutral-200 flex items-center gap-1 transition"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isCheckingRelayer ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>

            {relayerHealth ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Status:</span>
                  <span
                    className={`font-semibold capitalize px-2 py-0.5 rounded text-[11px] ${
                      relayerHealth.status === "healthy"
                        ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                        : relayerHealth.status === "low_balance"
                        ? "bg-amber-950/60 text-amber-300 border border-amber-800/60"
                        : "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                    }`}
                  >
                    {relayerHealth.status}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Relayer Address:</span>
                  <span className="font-mono text-neutral-300 text-[11px]">
                    {relayerHealth.address
                      ? `${relayerHealth.address.slice(0, 8)}...${relayerHealth.address.slice(-6)}`
                      : "Not set"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Sponsorship Balance:</span>
                  <span className="font-mono font-medium text-emerald-400">
                    {parseFloat(relayerHealth.balanceMon).toFixed(4)} MON
                  </span>
                </div>

                {relayerHealth.isLowBalance && (
                  <p className="text-[10px] text-amber-400/90 bg-amber-950/30 p-1.5 rounded border border-amber-800/30">
                    {relayerHealth.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-xs text-neutral-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Querying relayer node...
              </div>
            )}
          </div>

          {/* Agora AUSD Live Metrics */}
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-blue-400" />
                Agora AUSD Stablecoin
              </span>
              <button
                onClick={fetchAgora}
                disabled={isFetchingAgora}
                className="text-[11px] text-neutral-400 hover:text-neutral-200 flex items-center gap-1 transition"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isFetchingAgora ? "animate-spin" : ""}`}
                />
                Live API
              </button>
            </div>

            {agoraMetrics ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Monad AUSD Supply:</span>
                  <span className="font-mono font-semibold text-blue-300">
                    ${Number(agoraMetrics.monad.circulatingSupply).toLocaleString(
                      undefined,
                      { maximumFractionDigits: 0 }
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Total Agora Volume:</span>
                  <span className="font-mono text-neutral-300">
                    ${Number(agoraMetrics.totalCirculatingSupply).toLocaleString(
                      undefined,
                      { maximumFractionDigits: 0 }
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">Decimals & Permit:</span>
                  <span className="text-neutral-400 font-mono">
                    6 Decimals • EIP-2612
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Querying Agora API...
              </div>
            )}
          </div>
        </div>

        {/* PRF_UNAVAILABLE Critical Alert Banner */}
        {isPrfUnavailable && (
          <div className="p-4 rounded-xl bg-amber-950/70 border border-amber-600/70 text-amber-200 text-sm space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-300">
                  PRF_UNAVAILABLE Detected
                </p>
                <p className="text-xs leading-relaxed text-amber-200/90">
                  The WebAuthn PRF (Pseudo-Random Function) extension is required
                  to derive a deterministic EOA from your passkey, but is not
                  supported or permitted by your current browser profile.
                </p>
              </div>
            </div>
            <div className="bg-amber-900/30 rounded-lg p-3 text-xs space-y-1.5 border border-amber-800/50 font-mono">
              <p className="font-semibold text-amber-300 font-sans">
                Troubleshooting Checklist:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-amber-200/80">
                <li>
                  <strong className="text-amber-100">Desktop Chrome:</strong>{" "}
                  Passkeys must be saved to <em>Google Password Manager</em>, NOT
                  the local macOS device profile.
                </li>
                <li>
                  <strong className="text-amber-100">macOS Safari:</strong>{" "}
                  Supports Touch ID with iCloud Keychain.
                </li>
                <li>
                  <strong className="text-amber-100">Security Keys:</strong> Use
                  a FIDO2 hardware authenticator (YubiKey 5 series).
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* General Error Banner */}
        {error && !isPrfUnavailable && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-200 text-sm flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs font-mono">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-xs text-rose-400 hover:text-rose-200 shrink-0 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Authentication State */}
        {!isConnected ? (
          <div className="space-y-5 bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Freelancer Identifier / Email (for passkey metadata)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="freelancer@nadrupee"
                className="w-full bg-neutral-900 border border-neutral-700/80 rounded-lg px-3.5 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => signUp(username)}
                disabled={isConnecting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-50 text-white font-medium text-sm transition shadow-lg shadow-violet-950/40"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Passkey...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Create Passkey (Sign Up)
                  </>
                )}
              </button>

              <button
                onClick={() => signIn()}
                disabled={isConnecting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-800 disabled:opacity-50 text-neutral-200 border border-neutral-700 font-medium text-sm transition"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Evaluating PRF...
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4 text-violet-400" />
                    Sign In with Passkey
                  </>
                )}
              </button>
            </div>

            {storedCredentialId && (
              <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 pt-1">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Previous passkey detected:{" "}
                <span className="font-mono text-neutral-400">
                  {storedCredentialId.slice(0, 16)}...
                </span>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Account Info Box */}
            <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Authenticated via Mera Passkey
                </span>
                <button
                  onClick={signOut}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-rose-400 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
                  Derived Monad EOA Address (BIP-44)
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono text-xs sm:text-sm bg-neutral-900 border border-neutral-800 px-3 py-2 rounded-lg text-violet-300 break-all select-all">
                    {address}
                  </div>
                  <button
                    onClick={() => address && handleCopy(address)}
                    className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-300 transition shrink-0"
                    title="Copy Address"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <a
                    href={`https://testnet.monadexplorer.com/address/${address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-300 transition shrink-0"
                    title="View on Monad Explorer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {storedCredentialId && (
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
                    WebAuthn Credential ID
                  </span>
                  <div className="font-mono text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg truncate">
                    {storedCredentialId}
                  </div>
                </div>
              )}
            </div>

            {/* Gasless Meta-Transaction Relayer Test Suite */}
            <div className="bg-neutral-950/70 border border-violet-900/30 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Gasless Meta-Transaction & Relayer Execution
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFetchNonce}
                    className="text-[11px] text-neutral-400 hover:text-neutral-200 underline"
                  >
                    Check Nonce:{" "}
                    <span className="font-mono text-violet-300">
                      {clientNonce !== null ? clientNonce : "click"}
                    </span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-neutral-400">
                Sign EIP-712 typed authorizations with your passkey. The relayer
                sponsors gas on Monad Testnet and executes on-chain idempotency
                checks before broadcasting.
              </p>

              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-neutral-300 shrink-0">
                  Target Job ID:
                </label>
                <input
                  type="number"
                  value={testJobId}
                  onChange={(e) => setTestJobId(e.target.value)}
                  className="w-24 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <button
                  onClick={() => handleRelayAction("partial")}
                  disabled={isRelaying}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-medium text-xs transition shadow"
                >
                  {isRelaying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  Relay Partial (80%)
                </button>

                <button
                  onClick={() => handleRelayAction("remainder")}
                  disabled={isRelaying}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-50 text-white font-medium text-xs transition shadow"
                >
                  {isRelaying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  Relay Remainder (20%)
                </button>

                <button
                  onClick={() => handleRelayAction("cancel")}
                  disabled={isRelaying}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-rose-900/50 hover:border-rose-700 border border-neutral-700 disabled:opacity-50 text-neutral-300 font-medium text-xs transition"
                >
                  {isRelaying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  Relay Cancel Job
                </button>
              </div>

              {/* Relayer Execution Result */}
              {relayResult && (
                <div
                  className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                    relayResult.alreadyProcessed
                      ? "bg-amber-950/40 border-amber-800/60 text-amber-200"
                      : relayResult.success
                      ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
                      : "bg-rose-950/40 border-rose-800/60 text-rose-200"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-1.5">
                      {relayResult.alreadyProcessed ? (
                        <>
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          IDEMPOTENCY HIT (0 Gas Wasted)
                        </>
                      ) : relayResult.success ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          Relayer Broadcast Succeeded!
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4 text-rose-400" />
                          Execution Failed
                        </>
                      )}
                    </span>
                    {relayResult.stateLabel && (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300">
                        State: {relayResult.stateLabel}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] leading-relaxed">
                    {relayResult.message || relayResult.error}
                  </p>

                  {relayResult.txHash && (
                    <div className="flex items-center justify-between pt-1 font-mono text-[11px]">
                      <span className="text-neutral-400">Tx Hash:</span>
                      <a
                        href={`https://testnet.monadexplorer.com/tx/${relayResult.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-violet-300 hover:underline flex items-center gap-1"
                      >
                        {relayResult.txHash.slice(0, 10)}...{relayResult.txHash.slice(-8)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Test Message Signing Box */}
            <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-white">
                  ECDSA Arbitrary Message Signing Test
                </h3>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-neutral-400 font-medium">
                  Message Payload
                </label>
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <button
                onClick={handleSignMessage}
                disabled={isSigning}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-800 disabled:opacity-50 text-neutral-200 border border-neutral-700 font-medium text-xs transition"
              >
                {isSigning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Signing with Passkey...
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-3.5 h-3.5 text-violet-400" />
                    Sign Test Message
                  </>
                )}
              </button>

              {signError && (
                <p className="text-xs text-rose-400 font-mono bg-rose-950/40 p-2.5 rounded-lg border border-rose-800/40">
                  {signError}
                </p>
              )}

              {signature && (
                <div className="space-y-3 pt-2 border-t border-neutral-800/80">
                  <div className="space-y-1">
                    <span className="text-[11px] text-neutral-400 font-medium">
                      Generated Signature (Hex)
                    </span>
                    <div className="font-mono text-[11px] text-emerald-400 bg-neutral-900 border border-neutral-800 p-2.5 rounded-lg break-all select-all">
                      {signature}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs text-emerald-300 font-medium">
                        Recovered Address Verification:
                      </span>
                    </div>
                    <span className="font-mono text-xs text-emerald-200">
                      {recoveredAddress === address
                        ? "Verified Match ✓"
                        : "Mismatch ✗"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="border-t border-neutral-800/60 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-500 gap-2">
          <span>NadRupee • Cross-Border Freelance Escrow</span>
          <span>Zero Seed Phrase • Hardware Passkey PRF • Sponsored Relayer</span>
        </div>
      </div>
    </div>
  );
}
