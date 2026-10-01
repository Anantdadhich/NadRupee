"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Building2,
  CreditCard,
  Lock,
  Clock,
  Sparkles,
  Printer,
  ChevronRight,
  FileText,
  BadgeCheck,
  HelpCircle,
  Check,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import {
  OnmetaKycStatus,
  OnmetaBankAccount,
  OnmetaSellQuote,
  OnmetaOfframpOrder,
  OnmetaOrderStatus,
} from "@/lib/onmeta/types";

interface OnmetaOfframpModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress?: string | null;
  userEmail?: string;
  initialAmount?: number;
  availableAusdBalance?: number;
  onSuccess?: (order: OnmetaOfframpOrder) => void;
}

type Step = "auth" | "kyc" | "bank" | "quote" | "transfer" | "status";

export function OnmetaOfframpModal({
  isOpen,
  onClose,
  userAddress,
  userEmail = "",
  initialAmount = 100,
  availableAusdBalance = 0,
  onSuccess,
}: OnmetaOfframpModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("kyc");
  const [email, setEmail] = useState<string>(() => {
    if (userEmail) return userEmail;
    if (typeof window !== "undefined") {
      return localStorage.getItem("nadrupee_user_email") || "";
    }
    return "";
  });
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // 1. KYC State
  const [kycStatus, setKycStatus] = useState<OnmetaKycStatus | null>(null);
  const [isLoadingKyc, setIsLoadingKyc] = useState<boolean>(false);
  const [showStandaloneKycWidget, setShowStandaloneKycWidget] = useState<boolean>(false);
  const [standaloneWidgetUrl, setStandaloneWidgetUrl] = useState<string>("");
  const [manualPanInput, setManualPanInput] = useState<string>("");
  const [manualNameInput, setManualNameInput] = useState<string>("");
  const [isSubmittingKyc, setIsSubmittingKyc] = useState<boolean>(false);

  // 2. Bank Accounts State
  const [bankAccounts, setBankAccounts] = useState<OnmetaBankAccount[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [isLoadingBanks, setIsLoadingBanks] = useState<boolean>(false);
  const [showAddBankForm, setShowAddBankForm] = useState<boolean>(false);
  const [newBankName, setNewBankName] = useState<string>("");
  const [newAccountNumber, setNewAccountNumber] = useState<string>("");
  const [newIfsc, setNewIfsc] = useState<string>("");
  const [newAccountHolder, setNewAccountHolder] = useState<string>("");
  const [isLinkingBank, setIsLinkingBank] = useState<boolean>(false);
  const [bankError, setBankError] = useState<string | null>(null);

  // 3. Sell Quotation State
  const [cryptoAmount, setCryptoAmount] = useState<number>(initialAmount);
  const [quote, setQuote] = useState<OnmetaSellQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // 4. Order & Execution State
  const [activeOrder, setActiveOrder] = useState<OnmetaOfframpOrder | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false);
  const [isSubmittingTx, setIsSubmittingTx] = useState<boolean>(false);
  const [manualTxHash, setManualTxHash] = useState<string>("");
  const [pollingActive, setPollingActive] = useState<boolean>(false);

  // Sync initial amount when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialAmount > 0) {
        setCryptoAmount(initialAmount);
      } else if (availableAusdBalance > 0) {
        setCryptoAmount(Math.min(100, Math.floor(availableAusdBalance)));
      }
    }
  }, [isOpen, initialAmount, availableAusdBalance]);

  // Step 1: User Login
  const performLogin = useCallback(async () => {
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/user-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.token) {
        setJwtToken(data.token);
      }
    } catch (e) {
      console.error("User login failed:", e);
    } finally {
      setIsLoggingIn(false);
    }
  }, [email]);

  // Step 2: Fetch KYC Status
  const fetchKycStatus = useCallback(async () => {
    setIsLoadingKyc(true);
    try {
      const res = await fetch("/api/fetch-kyc-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setKycStatus(data);
      if (data.standaloneWidgetUrl) {
        setStandaloneWidgetUrl(data.standaloneWidgetUrl);
      }
      if (data.isKycVerified) {
        setCurrentStep("quote");
      }
    } catch (e) {
      console.error("Fetch KYC status failed:", e);
    } finally {
      setIsLoadingKyc(false);
    }
  }, [email]);

  // Step 3: Fetch Linked Bank Accounts
  const fetchBankAccounts = useCallback(async () => {
    setIsLoadingBanks(true);
    try {
      const res = await fetch(`/api/fetch-bank-accounts?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.accounts) {
        setBankAccounts(data.accounts);
        if (data.accounts.length > 0 && !selectedBankId) {
          setSelectedBankId(data.accounts[0].id);
        }
      }
    } catch (e) {
      console.error("Fetch bank accounts failed:", e);
    } finally {
      setIsLoadingBanks(false);
    }
  }, [email, selectedBankId]);

  // Step 4: Fetch Live Sell Quotation
  const fetchSellQuotation = useCallback(async () => {
    if (cryptoAmount <= 0) return;
    setIsLoadingQuote(true);
    setQuoteError(null);
    try {
      const res = await fetch("/api/fetch-sell-quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cryptoAmount,
          cryptoToken: "AUSD",
          chainId: 10143,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQuote(data);
        setSecondsRemaining(30);
      } else {
        setQuoteError(data.error || "Unable to fetch live quote.");
      }
    } catch (e: any) {
      setQuoteError(e.message || "Failed to fetch exchange rate quote.");
    } finally {
      setIsLoadingQuote(false);
    }
  }, [cryptoAmount]);

  // Initialize data on modal open
  useEffect(() => {
    if (isOpen) {
      performLogin();
      fetchKycStatus();
      fetchBankAccounts();
    }
  }, [isOpen, performLogin, fetchKycStatus, fetchBankAccounts]);

  // Countdown timer for 30s quotation validity
  useEffect(() => {
    if (currentStep !== "quote" || !quote) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          fetchSellQuotation();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentStep, quote, fetchSellQuotation]);

  // Step 2b: Manual Document KYC Upload
  const handleUploadKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingKyc(true);
    try {
      const res = await fetch("/api/upload-kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          fullName: manualNameInput,
          panNumber: manualPanInput,
        }),
      });
      const data = await res.json();
      if (data.isKycVerified) {
        setKycStatus(data);
        setCurrentStep("bank");
        fetchBankAccounts();
      }
    } catch (e) {
      console.error("KYC upload failed:", e);
    } finally {
      setIsSubmittingKyc(false);
    }
  };

  // Step 3b: Link New Bank Account with Penny Drop
  const handleLinkBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLinkingBank(true);
    setBankError(null);
    try {
      const res = await fetch("/api/link-bank-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          bankName: newBankName,
          accountNumber: newAccountNumber,
          ifsc: newIfsc,
          accountHolderName: newAccountHolder,
        }),
      });
      const data = await res.json();
      if (data.account && data.account.bankStatus === "SUCCESS") {
        await fetchBankAccounts();
        setSelectedBankId(data.account.id);
        setShowAddBankForm(false);
      } else {
        setBankError(data.account?.reason || "Verification failed. Check account details.");
      }
    } catch (e: any) {
      setBankError(e.message || "Failed to link bank account.");
    } finally {
      setIsLinkingBank(false);
    }
  };

  // Step 5: Create Off-Ramp Order (status: cryptoInit)
  const handleCreateOrder = async () => {
    if (!quote) return;
    setIsCreatingOrder(true);
    try {
      const res = await fetch("/api/create-offramp-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          quotationId: quote.quotationId,
          cryptoToken: quote.fromToken,
          chainId: quote.chainId,
          cryptoAmount: quote.cryptoAmount,
          exchangeRate: quote.exchangeRate,
          fiatAmount: quote.fiatAmount,
          netPayoutInr: quote.netPayoutInr,
          bankAccountId: selectedBankId,
        }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setActiveOrder(data.order);
        setCurrentStep("transfer");
      }
    } catch (e) {
      console.error("Failed to create offramp order:", e);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Step 6: Submit Blockchain TX Hash
  const handleSubmitTxHash = async (txHashToSubmit?: string) => {
    if (!activeOrder) return;
    const finalHash = txHashToSubmit || manualTxHash;
    if (!finalHash) return;

    setIsSubmittingTx(true);
    try {
      const res = await fetch("/api/update-transaction-hash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: activeOrder.orderId,
          txHash: finalHash,
        }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setActiveOrder(data.order);
        setCurrentStep("status");
        setPollingActive(true);
      }
    } catch (e) {
      console.error("Failed to update tx hash:", e);
    } finally {
      setIsSubmittingTx(false);
    }
  };

  // Execute Real Instant Monad On-Chain Transfer
  const handleInstantMonadTransfer = async () => {
    setIsSubmittingTx(true);
    try {
      const selectedBank = bankAccounts.find((b) => b.id === selectedBankId);
      const settleRes = await fetch("/api/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freelancerAddress: userAddress || "0x47Cc14B5D120E404d6fddf86C136B392529d1123",
          amountUsd: quote?.cryptoAmount || cryptoAmount,
          lockedRate: quote?.exchangeRate || 95.92,
          upiId: selectedBank?.accountNumberMasked || "BANK-TRANSFER",
        }),
      });
      const settleData = await settleRes.json();
      if (!settleData.success || !settleData.onchainTxHash) {
        throw new Error(settleData.error || "Failed to broadcast settlement on Monad testnet.");
      }
      setManualTxHash(settleData.onchainTxHash);
      await handleSubmitTxHash(settleData.onchainTxHash);
    } catch (e: any) {
      console.error("Monad transfer broadcast failed:", e);
    } finally {
      setIsSubmittingTx(false);
    }
  };

  // ⚡ 1-Click Instant Settle (Create order + Real Monad Settlement + IMPS Transfer in one tap)
  const handleInstant1ClickSettle = async () => {
    if (!quote) return;
    setIsCreatingOrder(true);
    setQuoteError(null);
    try {
      const orderRes = await fetch("/api/create-offramp-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || "user@nadrupee.eth",
          quotationId: quote.quotationId,
          cryptoToken: quote.fromToken,
          chainId: quote.chainId,
          cryptoAmount: quote.cryptoAmount,
          exchangeRate: quote.exchangeRate,
          fiatAmount: quote.fiatAmount,
          netPayoutInr: quote.netPayoutInr,
          bankAccountId: selectedBankId,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success || !orderData.order) {
        throw new Error(orderData.error || "Failed to create order");
      }

      const order = orderData.order;
      setActiveOrder(order);
      setCurrentStep("status");

      // Broadcast verified on-chain settlement transaction on Monad testnet
      const selectedBank = bankAccounts.find((b) => b.id === selectedBankId);
      const settleRes = await fetch("/api/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freelancerAddress: userAddress || order.depositAddress,
          amountUsd: quote.cryptoAmount,
          lockedRate: quote.exchangeRate,
          upiId: selectedBank?.accountNumberMasked || "BANK-TRANSFER",
        }),
      });
      const settleData = await settleRes.json();
      if (!settleData.success || !settleData.onchainTxHash) {
        throw new Error(settleData.error || "Failed to broadcast settlement on Monad testnet.");
      }

      const realTxHash = settleData.onchainTxHash;
      setManualTxHash(realTxHash);

      const txRes = await fetch("/api/update-transaction-hash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.orderId,
          txHash: realTxHash,
        }),
      });
      const txData = await txRes.json();
      if (txData.success && txData.order) {
        setActiveOrder(txData.order);
      }

      setPollingActive(true);
      if (onSuccess) {
        onSuccess(order);
      }
    } catch (e: any) {
      console.error("1-Click settle failed:", e);
      setQuoteError(e.message || "Failed to process instant settlement.");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Step 7: Order Status Polling (from cryptoInit -> fiatPending -> completed)
  useEffect(() => {
    if (!pollingActive || !activeOrder || activeOrder.status === "completed") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/fetch-offramp-order-status?orderId=${activeOrder.orderId}`);
        const data = await res.json();
        if (data.success && data.order) {
          setActiveOrder(data.order);
          if (data.order.status === "completed") {
            setPollingActive(false);
            if (onSuccess) {
              onSuccess(data.order);
            }
          }
        }
      } catch (e) {
        console.error("Failed to poll order status:", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pollingActive, activeOrder, onSuccess]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onmeta-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-[oklch(0.14_0.015_188)] border border-[oklch(0.28_0.03_188)] rounded-2xl shadow-2xl overflow-hidden text-[oklch(0.985_0.003_165)] my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[oklch(0.22_0.02_188)] bg-[oklch(0.12_0.012_185)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[oklch(0.73_0.105_169)]/15 border border-[oklch(0.73_0.105_169)]/30 flex items-center justify-center text-[oklch(0.73_0.105_169)] font-bold">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="onmeta-modal-title" className="text-base font-bold tracking-tight">
                  OnMeta Off-Ramp
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[oklch(0.73_0.105_169)]/20 text-[oklch(0.73_0.105_169)] border border-[oklch(0.73_0.105_169)]/30">
                  Monad → INR
                </span>
              </div>
              <p className="text-xs text-[oklch(0.65_0.015_188)]">
                Licensed Direct Fiat Rails • Automated IMPS Settlement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[oklch(0.65_0.015_188)] hover:text-white hover:bg-[oklch(0.22_0.02_188)] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="grid grid-cols-4 px-6 py-3 bg-[oklch(0.16_0.018_188)]/60 border-b border-[oklch(0.22_0.02_188)] text-xs">
          <button
            onClick={() => setCurrentStep("kyc")}
            className={`flex items-center gap-1.5 py-1 text-left font-medium transition-colors ${currentStep === "kyc"
              ? "text-[oklch(0.73_0.105_169)] font-semibold"
              : kycStatus?.isKycVerified
                ? "text-[oklch(0.65_0.015_188)]"
                : "text-[oklch(0.45_0.015_188)]"
              }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${kycStatus?.isKycVerified
                ? "bg-[oklch(0.73_0.105_169)] text-black"
                : currentStep === "kyc"
                  ? "bg-[oklch(0.73_0.105_169)]/30 text-[oklch(0.73_0.105_169)]"
                  : "bg-[oklch(0.25_0.02_188)] text-[oklch(0.55_0.015_188)]"
                }`}
            >
              {kycStatus?.isKycVerified ? "✓" : "1"}
            </span>
            <span>1. KYC</span>
          </button>

          <button
            onClick={() => kycStatus?.isKycVerified && setCurrentStep("bank")}
            disabled={!kycStatus?.isKycVerified}
            className={`flex items-center gap-1.5 py-1 text-left font-medium transition-colors ${currentStep === "bank"
              ? "text-[oklch(0.73_0.105_169)] font-semibold"
              : bankAccounts.length > 0
                ? "text-[oklch(0.65_0.015_188)]"
                : "text-[oklch(0.45_0.015_188)]"
              }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${bankAccounts.length > 0 && currentStep !== "bank"
                ? "bg-[oklch(0.73_0.105_169)] text-black"
                : currentStep === "bank"
                  ? "bg-[oklch(0.73_0.105_169)]/30 text-[oklch(0.73_0.105_169)]"
                  : "bg-[oklch(0.25_0.02_188)] text-[oklch(0.55_0.015_188)]"
                }`}
            >
              {bankAccounts.length > 0 && currentStep !== "bank" ? "✓" : "2"}
            </span>
            <span>2. Bank</span>
          </button>

          <button
            onClick={() => bankAccounts.length > 0 && setCurrentStep("quote")}
            disabled={bankAccounts.length === 0}
            className={`flex items-center gap-1.5 py-1 text-left font-medium transition-colors ${currentStep === "quote"
              ? "text-[oklch(0.73_0.105_169)] font-semibold"
              : quote
                ? "text-[oklch(0.65_0.015_188)]"
                : "text-[oklch(0.45_0.015_188)]"
              }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${quote && currentStep !== "quote"
                ? "bg-[oklch(0.73_0.105_169)] text-black"
                : currentStep === "quote"
                  ? "bg-[oklch(0.73_0.105_169)]/30 text-[oklch(0.73_0.105_169)]"
                  : "bg-[oklch(0.25_0.02_188)] text-[oklch(0.55_0.015_188)]"
                }`}
            >
              {quote && currentStep !== "quote" ? "✓" : "3"}
            </span>
            <span>3. Quote</span>
          </button>

          <button
            onClick={() => activeOrder && setCurrentStep("status")}
            disabled={!activeOrder}
            className={`flex items-center gap-1.5 py-1 text-left font-medium transition-colors ${currentStep === "status" || currentStep === "transfer"
              ? "text-[oklch(0.73_0.105_169)] font-semibold"
              : "text-[oklch(0.45_0.015_188)]"
              }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${activeOrder?.status === "completed"
                ? "bg-[oklch(0.73_0.105_169)] text-black"
                : currentStep === "status" || currentStep === "transfer"
                  ? "bg-[oklch(0.73_0.105_169)]/30 text-[oklch(0.73_0.105_169)]"
                  : "bg-[oklch(0.25_0.02_188)] text-[oklch(0.55_0.015_188)]"
                }`}
            >
              {activeOrder?.status === "completed" ? "✓" : "4"}
            </span>
            <span>4. Payout</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          {/* STEP 1: KYC VERIFICATION */}
          {currentStep === "kyc" && (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-white">Identity Verification (KYC)</h4>
                  <p className="text-xs text-[oklch(0.65_0.015_188)]">
                    Required by RBI & FIU-IND regulations for receiving INR bank payouts.
                  </p>
                </div>
                {kycStatus?.isKycVerified ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    <BadgeCheck className="w-4 h-4" />
                    Verified
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4" />
                    KYC Required
                  </div>
                )}
              </div>

              {kycStatus?.isKycVerified ? (
                <div className="p-4 rounded-xl bg-[oklch(0.18_0.02_188)] border border-[oklch(0.28_0.03_188)] space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {kycStatus.kycDetails?.fullName || "Verified Account"}
                      </div>
                      <div className="text-xs text-[oklch(0.65_0.015_188)]">
                        {kycStatus.kycDetails?.panNumber && `PAN: ${kycStatus.kycDetails.panNumber}`}
                        {kycStatus.kycDetails?.aadhaarLast4 && ` • Aadhaar: •••• ${kycStatus.kycDetails.aadhaarLast4}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-emerald-400/90 pt-1 border-t border-[oklch(0.25_0.02_188)] flex items-center justify-between">
                    <span>Identity Verified with OnMeta Gateway</span>
                    <span>100% Ready for Bank Transfers</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Standalone KYC Widget Button */}
                  <div className="p-4 rounded-xl bg-[oklch(0.18_0.02_188)] border border-[oklch(0.28_0.03_188)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>OnMeta Standalone KYC Widget</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[oklch(0.73_0.105_169)]/20 text-[oklch(0.73_0.105_169)]">
                          Recommended
                        </span>
                      </div>
                      <p className="text-xs text-[oklch(0.65_0.015_188)] mt-1">
                        Complete PAN & live camera selfie verification directly in OnMeta&#39;s
                        standalone compliance widget.
                      </p>
                    </div>
                    <a
                      href={standaloneWidgetUrl || "https://stg.platform.onmeta.in/kyc/"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[oklch(0.73_0.105_169)] text-black text-xs font-bold hover:brightness-110 transition-all shrink-0"
                    >
                      <span>Launch KYC Widget</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Quick Document Verification Form */}
                  <form
                    onSubmit={handleUploadKyc}
                    className="p-4 rounded-xl bg-[oklch(0.16_0.018_188)] border border-[oklch(0.25_0.02_188)] space-y-3"
                  >
                    <div className="text-xs font-semibold text-[oklch(0.85_0.02_188)] uppercase tracking-wider">
                      Or Quick Document Verification
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-[oklch(0.65_0.015_188)] block mb-1">
                          Full Name (as per PAN)
                        </label>
                        <input
                          type="text"
                          value={manualNameInput}
                          onChange={(e) => setManualNameInput(e.target.value)}
                          required
                          className="w-full px-3 py-2 text-xs rounded-lg bg-[oklch(0.12_0.012_185)] border border-[oklch(0.28_0.03_188)] text-white focus:outline-none focus:border-[oklch(0.73_0.105_169)]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[oklch(0.65_0.015_188)] block mb-1">
                          Permanent Account Number (PAN)
                        </label>
                        <input
                          type="text"
                          value={manualPanInput}
                          onChange={(e) => setManualPanInput(e.target.value.toUpperCase())}
                          required
                          maxLength={10}
                          placeholder="ABCDE1234F"
                          className="w-full px-3 py-2 text-xs rounded-lg bg-[oklch(0.12_0.012_185)] border border-[oklch(0.28_0.03_188)] text-white focus:outline-none focus:border-[oklch(0.73_0.105_169)] uppercase font-mono"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingKyc}
                      className="w-full py-2.5 rounded-xl bg-[oklch(0.22_0.025_187)] border border-[oklch(0.73_0.105_169)]/40 hover:border-[oklch(0.73_0.105_169)] text-xs font-bold text-white flex items-center justify-center gap-2 transition-all"
                    >
                      {isSubmittingKyc ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[oklch(0.73_0.105_169)]" />
                          <span>Verifying with OnMeta...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-[oklch(0.73_0.105_169)]" />
                          <span>Verify & Continue</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Next Button */}
              {kycStatus?.isKycVerified && (
                <button
                  onClick={() => {
                    setCurrentStep("bank");
                    fetchBankAccounts();
                  }}
                  className="w-full py-3 rounded-xl bg-[oklch(0.73_0.105_169)] text-black font-bold text-sm hover:brightness-110 flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  <span>Continue to Bank Account Linking</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* STEP 2: LINK BANK ACCOUNT */}
          {currentStep === "bank" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-white">Select Bank Account</h4>
                  <p className="text-xs text-[oklch(0.65_0.015_188)]">
                    INR payouts are routed directly to your verified bank account via IMPS.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddBankForm(!showAddBankForm)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[oklch(0.22_0.025_187)] border border-[oklch(0.32_0.03_188)] text-[oklch(0.73_0.105_169)] hover:bg-[oklch(0.28_0.03_188)] transition-all"
                >
                  {showAddBankForm ? "Cancel" : "+ Add Bank Account"}
                </button>
              </div>

              {/* Bank Accounts List */}
              <div className="space-y-2">
                {bankAccounts.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBankId(b.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${selectedBankId === b.id
                      ? "bg-[oklch(0.73_0.105_169)]/10 border-[oklch(0.73_0.105_169)]"
                      : "bg-[oklch(0.18_0.02_188)] border-[oklch(0.28_0.03_188)] hover:border-[oklch(0.38_0.03_188)]"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedBankId === b.id
                          ? "bg-[oklch(0.73_0.105_169)] text-black"
                          : "bg-[oklch(0.25_0.02_188)] text-white"
                          }`}
                      >
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white flex items-center gap-2">
                          <span>{b.bankName}</span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-normal">
                            Penny Drop Verified
                          </span>
                        </div>
                        <div className="text-xs text-[oklch(0.65_0.015_188)] font-mono">
                          {b.accountNumberMasked} • IFSC: {b.ifsc}
                        </div>
                        <div className="text-xs text-[oklch(0.55_0.015_188)]">
                          Holder: {b.accountHolderName}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedBankId === b.id
                        ? "border-[oklch(0.73_0.105_169)] bg-[oklch(0.73_0.105_169)] text-black"
                        : "border-[oklch(0.4_0.02_188)]"
                        }`}
                    >
                      {selectedBankId === b.id && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                ))}

                {bankAccounts.length === 0 && !showAddBankForm && (
                  <div className="p-6 rounded-xl bg-[oklch(0.16_0.018_188)] border border-[oklch(0.25_0.02_188)] text-center space-y-3">
                    <Building2 className="w-8 h-8 text-[oklch(0.55_0.015_188)] mx-auto" />
                    <p className="text-xs text-[oklch(0.65_0.015_188)]">
                      No bank account linked yet. Link your bank account to receive INR payouts.
                    </p>
                    <button
                      onClick={() => setShowAddBankForm(true)}
                      className="px-4 py-2 rounded-xl bg-[oklch(0.73_0.105_169)] text-black text-xs font-bold hover:brightness-110 transition-all"
                    >
                      Link Bank Account Now
                    </button>
                  </div>
                )}
              </div>

              {/* Add New Bank Account Form */}
              {showAddBankForm && (
                <form
                  onSubmit={handleLinkBank}
                  className="p-4 rounded-xl bg-[oklch(0.16_0.018_188)] border border-[oklch(0.28_0.03_188)] space-y-3"
                >
                  <div className="text-xs font-bold text-white uppercase tracking-wider">
                    Add Bank Account (Penny Drop Verification)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[oklch(0.65_0.015_188)] block mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={newBankName}
                        onChange={(e) => setNewBankName(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg bg-[oklch(0.12_0.012_185)] border border-[oklch(0.28_0.03_188)] text-white focus:outline-none focus:border-[oklch(0.73_0.105_169)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[oklch(0.65_0.015_188)] block mb-1">
                        Account Holder Name (Matches KYC)
                      </label>
                      <input
                        type="text"
                        value={newAccountHolder}
                        onChange={(e) => setNewAccountHolder(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg bg-[oklch(0.12_0.012_185)] border border-[oklch(0.28_0.03_188)] text-white focus:outline-none focus:border-[oklch(0.73_0.105_169)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[oklch(0.65_0.015_188)] block mb-1">
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        value={newAccountNumber}
                        onChange={(e) => setNewAccountNumber(e.target.value)}
                        required
                        placeholder="Enter account number (e.g. 501000123456)"
                        className="w-full px-3 py-2 text-xs rounded-lg bg-[oklch(0.12_0.012_185)] border border-[oklch(0.28_0.03_188)] text-white focus:outline-none focus:border-[oklch(0.73_0.105_169)] font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[oklch(0.65_0.015_188)] block mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        value={newIfsc}
                        onChange={(e) => setNewIfsc(e.target.value.toUpperCase())}
                        required
                        placeholder="e.g. HDFC0001234"
                        className="w-full px-3 py-2 text-xs rounded-lg bg-[oklch(0.12_0.012_185)] border border-[oklch(0.28_0.03_188)] text-white focus:outline-none focus:border-[oklch(0.73_0.105_169)] font-mono uppercase"
                      />
                    </div>
                  </div>

                  {bankError && (
                    <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                      {bankError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLinkingBank}
                    className="w-full py-2.5 rounded-xl bg-[oklch(0.73_0.105_169)] text-black text-xs font-bold hover:brightness-110 flex items-center justify-center gap-2 transition-all"
                  >
                    {isLinkingBank ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying with Penny Drop...</span>
                      </>
                    ) : (
                      <span>Verify & Link Bank Account</span>
                    )}
                  </button>
                </form>
              )}

              {/* Proceed to Quote */}
              <button
                onClick={() => {
                  setCurrentStep("quote");
                  fetchSellQuotation();
                }}
                disabled={!selectedBankId}
                className="w-full py-3 rounded-xl bg-[oklch(0.73_0.105_169)] text-black font-bold text-sm hover:brightness-110 flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Proceed to Live Sell Quotation</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 3: LIVE SELL QUOTATION */}
          {currentStep === "quote" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-white">Live Sell Quotation</h4>
                  <p className="text-xs text-[oklch(0.65_0.015_188)]">
                    Exchange rates locked with OnMeta order gateway.
                  </p>
                </div>
                {/* 30s Countdown timer */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[oklch(0.18_0.02_188)] border border-[oklch(0.28_0.03_188)] text-xs font-mono text-[oklch(0.73_0.105_169)]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Valid for {secondsRemaining}s</span>
                  <button
                    onClick={fetchSellQuotation}
                    disabled={isLoadingQuote}
                    className="ml-1 p-0.5 hover:text-white"
                    title="Refresh quote"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingQuote ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div className="p-4 rounded-xl bg-[oklch(0.18_0.02_188)] border border-[oklch(0.28_0.03_188)] space-y-2">
                <div className="flex items-center justify-between text-xs text-[oklch(0.65_0.015_188)]">
                  <span>Selling Cryptocurrency (Monad Testnet)</span>
                  <span>Available: {availableAusdBalance.toFixed(2)} AUSD</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max={availableAusdBalance > 0 ? availableAusdBalance : 100000}
                    value={cryptoAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCryptoAmount(val);
                    }}
                    onBlur={fetchSellQuotation}
                    className="flex-1 bg-transparent text-2xl font-bold text-white focus:outline-none font-mono"
                  />
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[oklch(0.25_0.02_188)] border border-[oklch(0.35_0.03_188)] text-xs font-bold text-white">
                    <span className="w-2 h-2 rounded-full bg-[oklch(0.73_0.105_169)]" />
                    <span>AUSD (Agora)</span>
                  </div>
                </div>
              </div>

              {/* Quotation Breakdown Table */}
              {quote && (
                <div className="p-4 rounded-xl bg-[oklch(0.16_0.018_188)] border border-[oklch(0.25_0.02_188)] space-y-3">
                  <div className="flex items-center justify-between text-xs py-1 border-b border-[oklch(0.22_0.02_188)]">
                    <span className="text-[oklch(0.65_0.015_188)]">Exchange Rate</span>
                    <span className="font-mono text-white font-semibold">
                      1 AUSD = ₹{quote.exchangeRate.toFixed(2)} INR
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-[oklch(0.22_0.02_188)]">
                    <span className="text-[oklch(0.65_0.015_188)]">Gross Fiat Payout</span>
                    <span className="font-mono text-white">₹{quote.fiatAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-[oklch(0.22_0.02_188)]">
                    <span className="text-[oklch(0.65_0.015_188)]">OnMeta Platform Fee (0.5%)</span>
                    <span className="font-mono text-[oklch(0.65_0.015_188)]">-₹{quote.platformFeeInr.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-[oklch(0.22_0.02_188)]">
                    <span className="text-[oklch(0.65_0.015_188)]">TDS / Compliance Tax (1%)</span>
                    <span className="font-mono text-[oklch(0.65_0.015_188)]">-₹{quote.tdsInr.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm py-2 bg-[oklch(0.18_0.02_188)] px-3 rounded-lg border border-[oklch(0.73_0.105_169)]/20">
                    <span className="font-bold text-[oklch(0.73_0.105_169)]">Net INR in Bank</span>
                    <span className="font-mono text-lg font-bold text-white">
                      ₹{quote.netPayoutInr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {quoteError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                  {quoteError}
                </div>
              )}

              {/* ⚡ 1-Click Instant Settlement CTA */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleInstant1ClickSettle}
                  disabled={isCreatingOrder || !quote}
                  className="w-full py-3.5 rounded-xl bg-[oklch(0.73_0.105_169)] text-black font-extrabold text-sm hover:brightness-110 flex items-center justify-center gap-2 transition-all shadow-xl"
                >
                  {isCreatingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Settling into Bank Account via IMPS...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-black" />
                      <span>
                        Instant Cash Out to Bank (₹
                        {quote?.netPayoutInr.toLocaleString("en-IN", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                        )
                      </span>
                    </>
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleCreateOrder}
                    disabled={isCreatingOrder || !quote}
                    className="text-xs text-[oklch(0.65_0.015_188)] hover:text-white transition-colors underline"
                  >
                    Custom transfer / view OnMeta deposit address →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: TRANSFER CRYPTO / SUBMIT TX HASH */}
          {currentStep === "transfer" && activeOrder && (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-white">Deposit Crypto to OnMeta</h4>
                  <p className="text-xs text-[oklch(0.65_0.015_188)]">
                    Order Status: <span className="font-mono font-bold text-amber-400">cryptoInit</span>
                  </p>
                </div>
                <div className="text-right text-xs font-mono text-[oklch(0.65_0.015_188)]">
                  <div>Order ID:</div>
                  <div className="text-white font-bold">{activeOrder.orderId}</div>
                </div>
              </div>

              {/* Deposit Instructions Card */}
              <div className="p-4 rounded-xl bg-[oklch(0.18_0.02_188)] border border-[oklch(0.28_0.03_188)] space-y-3">
                <div className="flex items-center justify-between text-xs text-[oklch(0.65_0.015_188)]">
                  <span>Send Amount:</span>
                  <span className="font-mono text-white font-bold text-sm">
                    {activeOrder.cryptoAmount} {activeOrder.cryptoToken}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[oklch(0.65_0.015_188)]">
                  <span>Network:</span>
                  <span className="text-white font-semibold">{activeOrder.chainName}</span>
                </div>
                <div>
                  <span className="text-xs text-[oklch(0.65_0.015_188)] block mb-1">
                    OnMeta Designated Deposit Address:
                  </span>
                  <div className="p-2.5 rounded-lg bg-[oklch(0.12_0.012_185)] border border-[oklch(0.25_0.02_188)] font-mono text-xs text-white break-all flex items-center justify-between">
                    <span>{activeOrder.depositAddress}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(activeOrder.depositAddress)}
                      className="ml-2 text-[10px] px-2 py-1 rounded bg-[oklch(0.25_0.02_188)] text-[oklch(0.73_0.105_169)] hover:bg-[oklch(0.35_0.03_188)] shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Monad Action */}
              <div className="space-y-3">
                <button
                  onClick={handleInstantMonadTransfer}
                  disabled={isSubmittingTx}
                  className="w-full py-3 rounded-xl bg-[oklch(0.73_0.105_169)] text-black font-bold text-sm hover:brightness-110 flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  {isSubmittingTx ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Broadcasting on Monad Testnet...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Transfer {activeOrder.cryptoAmount} AUSD & Submit TX Hash</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2 text-xs text-[oklch(0.55_0.015_188)] my-2">
                  <div className="flex-1 h-px bg-[oklch(0.25_0.02_188)]" />
                  <span>or enter transaction hash manually</span>
                  <div className="flex-1 h-px bg-[oklch(0.25_0.02_188)]" />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="0x..."
                    value={manualTxHash}
                    onChange={(e) => setManualTxHash(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-[oklch(0.12_0.012_185)] border border-[oklch(0.28_0.03_188)] text-white font-mono"
                  />
                  <button
                    onClick={() => handleSubmitTxHash()}
                    disabled={!manualTxHash || isSubmittingTx}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-[oklch(0.25_0.02_188)] text-white hover:bg-[oklch(0.35_0.03_188)] disabled:opacity-40"
                  >
                    Submit Hash
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: STATUS TRACKER & IMPS PAYOUT CONFIRMATION */}
          {currentStep === "status" && activeOrder && (
            <div className="space-y-6">
              <div className="text-center space-y-2 py-2">
                {activeOrder.status === "completed" ? (
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/40">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[oklch(0.73_0.105_169)]/20 text-[oklch(0.73_0.105_169)] mx-auto flex items-center justify-center border border-[oklch(0.73_0.105_169)]/40 animate-pulse">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                )}

                <h4 className="text-xl font-bold text-white">
                  {activeOrder.status === "completed"
                    ? "Fiat INR Payout Completed!"
                    : activeOrder.status === "fiatPending"
                      ? "Processing IMPS Bank Payout..."
                      : "Awaiting On-Chain Confirmation"}
                </h4>
                <p className="text-xs text-[oklch(0.65_0.015_188)] max-w-md mx-auto">
                  {activeOrder.note}
                </p>
              </div>

              {/* Progress Flow Steps */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div
                  className={`p-3 rounded-xl border ${activeOrder.status !== "cryptoInit"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                    : "bg-[oklch(0.18_0.02_188)] border-[oklch(0.28_0.03_188)] text-white"
                    }`}
                >
                  <div className="font-bold">1. cryptoInit</div>
                  <div className="text-[10px] text-[oklch(0.65_0.015_188)]">Crypto Deposited</div>
                </div>
                <div
                  className={`p-3 rounded-xl border ${activeOrder.status === "completed"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                    : activeOrder.status === "fiatPending"
                      ? "bg-[oklch(0.73_0.105_169)]/15 border-[oklch(0.73_0.105_169)] text-[oklch(0.73_0.105_169)] font-semibold"
                      : "bg-[oklch(0.14_0.015_188)] border-[oklch(0.22_0.02_188)] text-[oklch(0.45_0.015_188)]"
                    }`}
                >
                  <div className="font-bold">2. fiatPending</div>
                  <div className="text-[10px] text-[oklch(0.65_0.015_188)]">IMPS Initiated</div>
                </div>
                <div
                  className={`p-3 rounded-xl border ${activeOrder.status === "completed"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold"
                    : "bg-[oklch(0.14_0.015_188)] border-[oklch(0.22_0.02_188)] text-[oklch(0.45_0.015_188)]"
                    }`}
                >
                  <div className="font-bold">3. completed</div>
                  <div className="text-[10px] text-[oklch(0.65_0.015_188)]">Funds in Account</div>
                </div>
              </div>

              {/* Official Receipt Card */}
              <div className="p-4 rounded-xl bg-[oklch(0.12_0.012_185)] border border-[oklch(0.25_0.02_188)] space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[oklch(0.2_0.02_188)]">
                  <span className="text-[oklch(0.65_0.015_188)]">Payout Amount</span>
                  <span className="text-white text-base font-bold font-sans">
                    ₹{activeOrder.netPayoutInr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[oklch(0.65_0.015_188)]">OnMeta Order ID</span>
                  <span className="text-white">{activeOrder.orderId}</span>
                </div>
                {activeOrder.utr && (
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span>IMPS UTR Reference</span>
                    <span>{activeOrder.utr}</span>
                  </div>
                )}
                {activeOrder.bankAccount && (
                  <div className="flex items-center justify-between">
                    <span className="text-[oklch(0.65_0.015_188)]">Beneficiary Account</span>
                    <span className="text-white">
                      {activeOrder.bankAccount.bankName} ({activeOrder.bankAccount.accountNumberMasked})
                    </span>
                  </div>
                )}
                {activeOrder.txHash && (
                  <div className="flex items-center justify-between">
                    <span className="text-[oklch(0.65_0.015_188)]">On-Chain TX Hash</span>
                    <span className="text-[oklch(0.73_0.105_169)]">
                      {activeOrder.txHash.slice(0, 10)}...{activeOrder.txHash.slice(-8)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[oklch(0.55_0.015_188)] text-[11px] pt-1">
                  <span>Timestamp</span>
                  <span>{new Date(activeOrder.updatedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 rounded-xl bg-[oklch(0.22_0.025_187)] border border-[oklch(0.32_0.03_188)] hover:bg-[oklch(0.28_0.03_188)] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-[oklch(0.73_0.105_169)] text-black text-xs font-bold hover:brightness-110 flex items-center justify-center gap-2 transition-all"
                >
                  <span>Done</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
