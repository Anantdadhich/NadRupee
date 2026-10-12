"use client";

import React, { useState } from "react";
import { type WalletClient, type Address } from "viem";
import {
  X,
  Send,
  Loader2,
  Check,
  ExternalLink,
  Coins,
  Zap,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Copy,
} from "lucide-react";
import { KNOWN_HANDLES } from "@/lib/contracts/config";
import { sendAusdDirect } from "@/lib/contracts/escrowClient";
import { sendAusdGasless } from "@/lib/relayer/client";

interface SendAusdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (txHash: string) => void;
  currentBalance: number;
  fxRate: number;
  senderAddress?: string | null;
  walletClient?: WalletClient | null;
}

export function SendAusdModal({
  isOpen,
  onClose,
  onSuccess,
  currentBalance,
  fxRate,
  senderAddress,
  walletClient,
}: SendAusdModalProps) {
  const [recipientInput, setRecipientInput] = useState<string>("@priya.dev");
  const [resolvedAddress, setResolvedAddress] = useState<string>(
    KNOWN_HANDLES["@priya.dev"] || ""
  );
  const [amountUsd, setAmountUsd] = useState<number>(50);
  const [memo, setMemo] = useState<string>("Payment for Design Review");
  const [gasMode, setGasMode] = useState<"gasless" | "direct">("gasless");

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success Receipt State
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);
  const [sentAmount, setSentAmount] = useState<number>(0);
  const [sentRecipient, setSentRecipient] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleRecipientChange = (val: string) => {
    setRecipientInput(val);
    const cleaned = val.trim().toLowerCase();
    if (KNOWN_HANDLES[cleaned]) {
      setResolvedAddress(KNOWN_HANDLES[cleaned]);
    } else if (cleaned.startsWith("0x") && cleaned.length === 42) {
      setResolvedAddress(cleaned);
    } else {
      setResolvedAddress("");
    }
  };

  const handleSelectHandle = (handle: string) => {
    setRecipientInput(handle);
    if (KNOWN_HANDLES[handle]) {
      setResolvedAddress(KNOWN_HANDLES[handle]);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletClient || !senderAddress) {
      setErrorMessage("Please connect your passkey account before sending.");
      return;
    }

    const target = resolvedAddress || recipientInput.trim();
    if (!target.startsWith("0x") || target.length !== 42) {
      setErrorMessage("Please enter a valid Monad address (0x...) or select a known handle.");
      return;
    }

    if (target.toLowerCase() === senderAddress.toLowerCase()) {
      setErrorMessage("You cannot send AUSD to your own address.");
      return;
    }

    if (amountUsd <= 0) {
      setErrorMessage("Transfer amount must be greater than 0 AUSD.");
      return;
    }

    if (amountUsd > currentBalance) {
      setErrorMessage(`Insufficient balance. You have $${currentBalance.toFixed(2)} AUSD available.`);
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage("Signing with passkey...");

    try {
      let txHash: `0x${string}`;

      if (gasMode === "gasless") {
        setStatusMessage("Authorizing EIP-2612 permit via passkey...");
        const result = await sendAusdGasless({
          walletClient,
          recipientAddress: target as Address,
          amountUsd,
        });

        if (!result.txHash) {
          throw new Error(result.error || "Gasless transfer failed to return transaction hash.");
        }
        txHash = result.txHash;
      } else {
        setStatusMessage("Broadcasting direct transfer on Monad Testnet...");
        const result = await sendAusdDirect({
          walletClient,
          recipientAddress: target as Address,
          amountUsd,
        });
        txHash = result.txHash;
      }

      setSuccessTxHash(txHash);
      setSentAmount(amountUsd);
      setSentRecipient(target);
      if (onSuccess) {
        onSuccess(txHash);
      }
    } catch (err: any) {
      console.error("[Send AUSD Error]:", err);
      // If gasless fails with relayer unconfigured, suggest direct
      if (gasMode === "gasless" && err?.message?.includes("relayer")) {
        setErrorMessage(
          `${err?.message || "Relayer error"} — Try switching to 'Direct Passkey' mode.`
        );
      } else {
        setErrorMessage(
          err?.shortMessage || err?.message || "Failed to execute AUSD transfer on Monad Testnet."
        );
      }
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
    }
  };

  const handleReset = () => {
    setSuccessTxHash(null);
    setErrorMessage(null);
    setAmountUsd(Math.min(50, Math.floor(currentBalance)));
  };

  const inrEquivalent = (amountUsd * fxRate).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="modal-backdrop" onClick={() => !isProcessing && onClose()}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "480px", width: "100%" }}
      >
        {successTxHash ? (
          /* Success Receipt Card */
          <div className="receipt-voucher">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "16px",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "color-mix(in oklab, var(--mint) 25%, transparent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--foreground)",
                  }}
                >
                  <Check size={16} />
                </div>
                <strong style={{ fontSize: "15px" }}>AUSD Transfer Confirmed</strong>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  padding: "4px 8px",
                  background: "var(--night)",
                  color: "var(--paper)",
                  borderRadius: "8px",
                  fontWeight: 600,
                }}
              >
                MONAD TESTNET
              </span>
            </div>

            <div style={{ textAlign: "center", margin: "24px 0" }}>
              <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                AMOUNT TRANSFERRED
              </div>
              <strong
                style={{
                  fontSize: "36px",
                  fontWeight: 500,
                  color: "var(--foreground)",
                  display: "block",
                  margin: "4px 0",
                }}
              >
                ${sentAmount.toFixed(2)} AUSD
              </strong>
              <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                ≈ ₹{(sentAmount * fxRate).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                INR (@ ₹{fxRate.toFixed(2)}/USD)
              </span>
            </div>

            <div
              style={{
                background: "color-mix(in oklab, var(--night) 4%, transparent)",
                borderRadius: "10px",
                padding: "14px",
                fontSize: "11px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                margin: "18px 0",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted-foreground)" }}>Recipient:</span>
                <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                  {sentRecipient.slice(0, 10)}...{sentRecipient.slice(-6)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted-foreground)" }}>Settlement:</span>
                <span>Instant (&lt;1s Finality)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted-foreground)" }}>Transaction Hash:</span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <a
                    href={`https://testnet.monadexplorer.com/tx/${successTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: "var(--foreground)",
                      textDecoration: "underline",
                      fontFamily: "monospace",
                    }}
                  >
                    {successTxHash.slice(0, 8)}... <ExternalLink size={10} style={{ display: "inline" }} />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopy(successTxHash)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.6 }}
                    title="Copy Hash"
                  >
                    {copied ? <Check size={11} /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "22px",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                Send Another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="action"
                style={{ flex: 1, minHeight: "38px" }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Transfer Input Form */
          <div className="portal-card" style={{ background: "var(--night-soft)" }}>
            <div className="portal-card-header">
              <div className="portal-card-title">
                <Send size={15} color="var(--mint)" /> Send Agora AUSD
              </div>
              <button
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted-foreground)",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Sender & Balance Header */}
              <div
                style={{
                  background: "color-mix(in oklab, var(--paper) 4%, transparent)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "11px",
                }}
              >
                <div>
                  <span style={{ color: "var(--muted-foreground)", display: "block" }}>AVAILABLE BALANCE</span>
                  <strong style={{ fontSize: "14px", color: "var(--mint-bright)" }}>
                    ${currentBalance.toFixed(2)} AUSD
                  </strong>
                </div>
                <div style={{ textAlign: "right", color: "var(--muted-foreground)" }}>
                  <span>Monad Testnet</span>
                  <div style={{ fontSize: "10px", color: "var(--paper)" }}>Agora Stablecoin (6 Decimals)</div>
                </div>
              </div>

              {/* Recipient Input with Handle Quick Pick */}
              <div>
                <label className="portal-label">RECIPIENT HANDLE OR MONAD ADDRESS</label>
                <input
                  type="text"
                  value={recipientInput}
                  onChange={(e) => handleRecipientChange(e.target.value)}
                  placeholder="@arjun.monad or 0x..."
                  required
                  className="portal-input"
                  style={{ fontFamily: "monospace" }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>Quick Pick:</span>
                  {Object.keys(KNOWN_HANDLES).map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      onClick={() => handleSelectHandle(handle)}
                      style={{
                        background:
                          recipientInput === handle
                            ? "color-mix(in oklab, var(--mint) 20%, transparent)"
                            : "color-mix(in oklab, var(--paper) 6%, transparent)",
                        border: `1px solid ${
                          recipientInput === handle
                            ? "var(--mint)"
                            : "color-mix(in oklab, var(--paper) 12%, transparent)"
                        }`,
                        color: recipientInput === handle ? "var(--mint-bright)" : "var(--paper)",
                        borderRadius: "14px",
                        padding: "2px 9px",
                        fontSize: "10px",
                        cursor: "pointer",
                      }}
                    >
                      {handle}
                    </button>
                  ))}
                </div>
                {resolvedAddress && resolvedAddress !== recipientInput && (
                  <div style={{ fontSize: "10px", color: "var(--mint)", marginTop: "4px", fontFamily: "monospace", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Check size={11} strokeWidth={2.5} /> Resolves to: {resolvedAddress.slice(0, 10)}...{resolvedAddress.slice(-6)}
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="portal-label">AMOUNT (AUSD)</label>
                  <button
                    type="button"
                    onClick={() => setAmountUsd(Math.floor(currentBalance * 100) / 100)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--mint-bright)",
                      fontSize: "10px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Send Max
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={currentBalance}
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(parseFloat(e.target.value) || 0)}
                  required
                  className="portal-input"
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    color: "var(--muted-foreground)",
                    marginTop: "5px",
                  }}
                >
                  <span>INR Equivalent: ≈ ₹{inrEquivalent}</span>
                  <span>Rate: ₹{fxRate.toFixed(2)}/USD</span>
                </div>
              </div>

              {/* Transfer Mode Selector (Gasless vs Direct) */}
              <div>
                <label className="portal-label">NETWORK GAS MODE</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setGasMode("gasless")}
                    style={{
                      padding: "10px",
                      borderRadius: "12px",
                      border: `1px solid ${
                        gasMode === "gasless" ? "var(--mint)" : "color-mix(in oklab, var(--paper) 10%, transparent)"
                      }`,
                      background:
                        gasMode === "gasless"
                          ? "color-mix(in oklab, var(--mint) 12%, transparent)"
                          : "color-mix(in oklab, var(--paper) 4%, transparent)",
                      color: "var(--paper)",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: "11px",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: gasMode === "gasless" ? "var(--mint-bright)" : "inherit", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Zap size={13} /> Gasless Relayer
                    </div>
                    <div style={{ fontSize: "9px", opacity: 0.6, marginTop: "2px" }}>
                      EIP-2612 Permit · 0 MON gas
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGasMode("direct")}
                    style={{
                      padding: "10px",
                      borderRadius: "12px",
                      border: `1px solid ${
                        gasMode === "direct" ? "var(--mint)" : "color-mix(in oklab, var(--paper) 10%, transparent)"
                      }`,
                      background:
                        gasMode === "direct"
                          ? "color-mix(in oklab, var(--mint) 12%, transparent)"
                          : "color-mix(in oklab, var(--paper) 4%, transparent)",
                      color: "var(--paper)",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: "11px",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: gasMode === "direct" ? "var(--mint-bright)" : "inherit" }}>
                      Direct Onchain
                    </div>
                    <div style={{ fontSize: "9px", opacity: 0.6, marginTop: "2px" }}>
                      Standard ERC-20 transfer
                    </div>
                  </button>
                </div>
              </div>

              {/* Error Notification */}
              {errorMessage && (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "color-mix(in oklab, oklch(.66 .2 15) 15%, transparent)",
                    border: "1px solid color-mix(in oklab, oklch(.66 .2 15) 30%, transparent)",
                    color: "oklch(.75 .18 15)",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <AlertCircle size={14} shrink-0="true" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Status Message */}
              {isProcessing && statusMessage && (
                <div
                  style={{
                    color: "var(--mint-bright)",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Loader2 size={13} className="animate-spin" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="action action-dark"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || currentBalance <= 0}
                  className="action"
                  style={{ flex: 1.6, opacity: currentBalance <= 0 || isProcessing ? 0.5 : 1 }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Processing...
                    </>
                  ) : (
                    "Sign & Send AUSD"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
