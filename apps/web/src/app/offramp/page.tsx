"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount } from "@/hooks/useAccount";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Clock,
  ExternalLink,
  Coins,
  Zap,
  Lock,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
  Menu,
  X,
  CreditCard,
  Banknote,
  Percent,
  Receipt,
  HelpCircle,
} from "lucide-react";
import { OnmetaOfframpModal } from "@/components/OnmetaOfframpModal";
import { getAusdBalance } from "@/lib/contracts/escrowClient";

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

export default function OfframpPage() {
  const {
    address,
    isConnected,
    isConnecting,
    storedCredentialId,
    signUp,
    signIn,
    connectTestnetPasskey,
    signOut,
  } = useAccount();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showOfframpModal, setShowOfframpModal] = useState(false);
  const [ausdBalance, setAusdBalance] = useState<number>(0);
  const [liveRate, setLiveRate] = useState<number>(95.92);
  const [calcAmount, setCalcAmount] = useState<number>(100);

  useEffect(() => {
    async function loadData() {
      if (address) {
        try {
          const bal = await getAusdBalance(address);
          const parsed = parseFloat(bal.balanceFormatted);
          if (!isNaN(parsed)) setAusdBalance(parsed);
        } catch (e) {
          console.error("Failed to load balance:", e);
        }
      }

      try {
        const res = await fetch("/api/fx");
        const data = await res.json();
        if (data && data.rate) setLiveRate(data.rate);
      } catch (e) {
        console.error("Failed to fetch live FX:", e);
      }
    }
    loadData();
  }, [address]);

  const handleAuthAction = () => {
    if (isConnected) {
      signOut();
    } else if (storedCredentialId) {
      signIn();
    } else {
      signUp("freelancer@nadrupee");
    }
  };

  const calculatedGross = calcAmount * liveRate;
  const calculatedFee = calculatedGross * 0.005;
  const calculatedTds = calculatedGross * 0.01;
  const calculatedNet = calculatedGross - calculatedFee - calculatedTds;

  return (
    <div className="min-h-screen bg-[oklch(0.115_0.012_185)] text-[oklch(0.985_0.003_165)] selection:bg-[oklch(0.73_0.105_169)] selection:text-black">
      {/* 1. TOP NAVIGATION */}
      <nav className="border-b border-[oklch(0.22_0.02_188)] bg-[oklch(0.13_0.014_186)]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center">
              <Mark />
            </Link>
            <div className="hidden md:flex items-center gap-6 text-xs font-semibold">
              <Link
                href="/freelancer"
                className="text-[oklch(0.75_0.015_188)] hover:text-white transition-colors"
              >
                Freelancer Dashboard
              </Link>
              <Link
                href="/client"
                className="text-[oklch(0.75_0.015_188)] hover:text-white transition-colors"
              >
                Client Dashboard
              </Link>
              <Link
                href="/offramp"
                className="text-[oklch(0.73_0.105_169)] font-bold border-b-2 border-[oklch(0.73_0.105_169)] pb-1"
              >
                Instant INR Payout
              </Link>
              <Link
                href="/auth-test"
                className="text-[oklch(0.75_0.015_188)] hover:text-white transition-colors"
              >
                Passkey & Relayer
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOfframpModal(true)}
              className="px-4 py-2 rounded-xl bg-[oklch(0.73_0.105_169)] text-black text-xs font-bold hover:brightness-110 shadow-lg flex items-center gap-2 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Settle to Bank</span>
            </button>

            {isConnected ? (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[oklch(0.18_0.02_188)] border border-[oklch(0.25_0.02_188)] text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                <button
                  onClick={signOut}
                  className="text-[10px] text-[oklch(0.65_0.015_188)] hover:text-white ml-1 cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={connectTestnetPasskey}
                  disabled={isConnecting}
                  className="text-xs font-semibold px-3 py-2 rounded-xl bg-[oklch(0.73_0.105_169)]/15 border border-[oklch(0.73_0.105_169)] text-[oklch(0.73_0.105_169)] hover:brightness-110 transition-all cursor-pointer"
                  title="Instant 1-Click Passkey for Local & Testnet Testing"
                >
                  ⚡ Testnet Passkey
                </button>
                <button
                  onClick={handleAuthAction}
                  disabled={isConnecting}
                  className="text-xs font-semibold px-3 py-2 rounded-xl bg-[oklch(0.18_0.02_188)] border border-[oklch(0.28_0.03_188)] text-white hover:bg-[oklch(0.24_0.02_188)] transition-all cursor-pointer"
                >
                  {isConnecting ? "Connecting..." : "Biometric"}
                </button>
              </div>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-[oklch(0.75_0.015_188)] hover:text-white"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div className="md:hidden px-4 pt-2 pb-4 space-y-2 border-t border-[oklch(0.22_0.02_188)] bg-[oklch(0.14_0.015_188)] text-sm">
            <Link href="/freelancer" className="block py-2 text-[oklch(0.75_0.015_188)]">
              Freelancer Dashboard
            </Link>
            <Link href="/client" className="block py-2 text-[oklch(0.75_0.015_188)]">
              Client Dashboard
            </Link>
            <Link href="/offramp" className="block py-2 text-[oklch(0.73_0.105_169)] font-bold">
              Instant INR Payout
            </Link>
            <Link href="/auth-test" className="block py-2 text-[oklch(0.75_0.015_188)]">
              Passkey & Relayer
            </Link>
          </div>
        )}
      </nav>

      {/* 2. HERO & LIVE SETTLEMENT CALCULATOR */}
      <header className="relative px-4 sm:px-6 lg:px-8 pt-12 pb-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Value Proposition */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[oklch(0.73_0.105_169)]/15 border border-[oklch(0.73_0.105_169)]/30 text-[oklch(0.73_0.105_169)] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Direct Bank Settlement via OnMeta Rails</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
              Get Paid in Crypto. <br />
              <span className="text-[oklch(0.73_0.105_169)]">Settle in INR Instantly.</span>
            </h1>

            <p className="text-base sm:text-lg text-[oklch(0.75_0.015_188)] leading-relaxed max-w-2xl">
              Turn your Monad escrow earnings and AUSD milestone payments directly into Indian Rupees.
              Instant IMPS bank deposits, zero wire delays, flat 0.5% fee, and automated tax compliance.
            </p>

            {/* Quick feature list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="flex items-center gap-2.5 text-[oklch(0.85_0.015_188)]">
                <CheckCircle2 className="w-4 h-4 text-[oklch(0.73_0.105_169)] shrink-0" />
                <span>Instant IMPS & UPI Bank Payouts</span>
              </div>
              <div className="flex items-center gap-2.5 text-[oklch(0.85_0.015_188)]">
                <CheckCircle2 className="w-4 h-4 text-[oklch(0.73_0.105_169)] shrink-0" />
                <span>Zero Gas Required (Passkey Relayer)</span>
              </div>
              <div className="flex items-center gap-2.5 text-[oklch(0.85_0.015_188)]">
                <CheckCircle2 className="w-4 h-4 text-[oklch(0.73_0.105_169)] shrink-0" />
                <span>100% RBI & FIU-IND Compliant</span>
              </div>
              <div className="flex items-center gap-2.5 text-[oklch(0.85_0.015_188)]">
                <CheckCircle2 className="w-4 h-4 text-[oklch(0.73_0.105_169)] shrink-0" />
                <span>Verified IMPS UTR Receipt in &lt;60s</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={() => setShowOfframpModal(true)}
                className="px-6 py-3.5 rounded-xl bg-[oklch(0.73_0.105_169)] text-black font-bold text-sm hover:brightness-110 shadow-xl flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Launch Cash Out Modal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/freelancer"
                className="px-5 py-3.5 rounded-xl bg-[oklch(0.18_0.02_188)] border border-[oklch(0.28_0.03_188)] text-white text-xs font-semibold hover:bg-[oklch(0.22_0.02_188)] flex items-center gap-2 transition-all"
              >
                <span>Go to Freelancer Dashboard</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Column: Live Interactive Settle Card */}
          <div className="lg:col-span-5">
            <div className="p-6 sm:p-7 rounded-3xl bg-[oklch(0.14_0.015_188)] border border-[oklch(0.25_0.02_188)] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[oklch(0.73_0.105_169)]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between pb-4 border-b border-[oklch(0.22_0.02_188)]">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-[oklch(0.73_0.105_169)]" />
                    <span>Instant INR Cashout</span>
                  </h3>
                  <p className="text-[11px] text-[oklch(0.65_0.015_188)]">Real-time live quotation</p>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-[oklch(0.73_0.105_169)]/15 border border-[oklch(0.73_0.105_169)]/30 text-[oklch(0.73_0.105_169)] font-mono text-xs font-bold">
                  1 AUSD = ₹{liveRate.toFixed(2)}
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-4 pt-4">
                <div>
                  <div className="flex justify-between text-xs text-[oklch(0.65_0.015_188)] mb-1.5">
                    <span>You Sell (AUSD / USDC)</span>
                    <span>Available: {ausdBalance.toFixed(2)} AUSD</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[oklch(0.18_0.02_188)] border border-[oklch(0.28_0.03_188)] rounded-2xl p-2 focus-within:border-[oklch(0.73_0.105_169)] transition-colors">
                    <input
                      type="number"
                      min="1"
                      value={calcAmount}
                      onChange={(e) => setCalcAmount(Math.max(1, Number(e.target.value)))}
                      className="flex-1 bg-transparent px-3 py-1.5 text-xl font-bold text-white font-mono focus:outline-none"
                    />
                    <div className="px-3 py-1 rounded-xl bg-[oklch(0.24_0.025_187)] text-xs font-bold text-white">
                      AUSD
                    </div>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-2">
                  {[50, 100, 250, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setCalcAmount(amt)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                        calcAmount === amt
                          ? "bg-[oklch(0.73_0.105_169)] text-black font-bold"
                          : "bg-[oklch(0.18_0.02_188)] text-[oklch(0.7_0.015_188)] hover:text-white"
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>

                {/* Breakdown details */}
                <div className="p-4 rounded-2xl bg-[oklch(0.16_0.018_187)] border border-[oklch(0.24_0.02_188)] space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-[oklch(0.7_0.015_188)]">
                    <span>Gross Conversion</span>
                    <span className="text-white">
                      ₹{calculatedGross.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-[oklch(0.7_0.015_188)]">
                    <span className="flex items-center gap-1">
                      <span>Gateway Fee</span>
                      <span className="text-[10px] text-[oklch(0.55_0.015_188)]">(0.5%)</span>
                    </span>
                    <span>-₹{calculatedFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[oklch(0.7_0.015_188)]">
                    <span className="flex items-center gap-1">
                      <span>TDS Compliance</span>
                      <span className="text-[10px] text-[oklch(0.55_0.015_188)]">(1%)</span>
                    </span>
                    <span>-₹{calculatedTds.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-[oklch(0.24_0.02_188)] flex justify-between items-baseline font-sans">
                    <span className="text-sm font-bold text-[oklch(0.73_0.105_169)]">
                      Net Bank Deposit:
                    </span>
                    <span className="text-xl font-black text-white font-mono">
                      ₹{calculatedNet.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => setShowOfframpModal(true)}
                  className="w-full py-4 rounded-2xl bg-[oklch(0.73_0.105_169)] text-black font-extrabold text-sm hover:brightness-110 shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Settle ₹{calculatedNet.toFixed(0)} into Bank Account</span>
                </button>

                <p className="text-[11px] text-center text-[oklch(0.6_0.015_188)] flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dispatched via IMPS with automatic UTR reference number</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 3. REAL-WORLD FREELANCER USE CASES */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 max-w-7xl mx-auto border-t border-[oklch(0.22_0.02_188)]">
        <div className="space-y-3 mb-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[oklch(0.73_0.105_169)] uppercase tracking-wider">
            <Coins className="w-4 h-4" />
            <span>Built For Real People</span>
          </div>
          <h2 className="text-3xl font-black text-white">
            Why Indian Freelancers & Global Clients Choose NadRupee
          </h2>
          <p className="text-xs sm:text-sm text-[oklch(0.7_0.015_188)]">
            Eliminating payment delays, high bank fees, and escrow disputes with automated smart contracts
            and direct banking rails.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Usecase 1 */}
          <div className="p-6 rounded-3xl bg-[oklch(0.14_0.015_188)] border border-[oklch(0.25_0.02_188)] space-y-4 hover:border-[oklch(0.73_0.105_169)]/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[oklch(0.73_0.105_169)]/15 border border-[oklch(0.73_0.105_169)]/30 flex items-center justify-center text-[oklch(0.73_0.105_169)]">
              <Banknote className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Global Client Invoicing</h3>
            <p className="text-xs text-[oklch(0.7_0.015_188)] leading-relaxed">
              International clients pay in USD/AUSD via Monad escrow. Freelancers receive Indian Rupees directly in their local bank without 5-7 business day delays.
            </p>
            <div className="pt-2 text-xs font-semibold text-[oklch(0.73_0.105_169)] flex items-center gap-1">
              <span>0 wire delays</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Usecase 2 */}
          <div className="p-6 rounded-3xl bg-[oklch(0.14_0.015_188)] border border-[oklch(0.25_0.02_188)] space-y-4 hover:border-[oklch(0.73_0.105_169)]/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Percent className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">80% Advance Cashout</h3>
            <p className="text-xs text-[oklch(0.7_0.015_188)] leading-relaxed">
              Once the client funds the escrow, freelancers can claim 80% upfront milestone payment and cash out immediately to pay bills, rent, or business expenses.
            </p>
            <div className="pt-2 text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <span>Immediate cashflow</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Usecase 3 */}
          <div className="p-6 rounded-3xl bg-[oklch(0.14_0.015_188)] border border-[oklch(0.25_0.02_188)] space-y-4 hover:border-[oklch(0.73_0.105_169)]/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Gasless Relayer Settle</h3>
            <p className="text-xs text-[oklch(0.7_0.015_188)] leading-relaxed">
              You never need to buy MON tokens or bridge gas to withdraw. Simply touch your fingerprint or FaceID passkey, and our gasless relayer sponsors execution.
            </p>
            <div className="pt-2 text-xs font-semibold text-blue-400 flex items-center gap-1">
              <span>Zero gas cost</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Usecase 4 */}
          <div className="p-6 rounded-3xl bg-[oklch(0.14_0.015_188)] border border-[oklch(0.25_0.02_188)] space-y-4 hover:border-[oklch(0.73_0.105_169)]/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Tax & Regulatory Compliant</h3>
            <p className="text-xs text-[oklch(0.7_0.015_188)] leading-relaxed">
              Automated 1% TDS deduction and verified KYC name matching ensures full compliance with Indian tax laws and FIU-IND regulations.
            </p>
            <div className="pt-2 text-xs font-semibold text-purple-400 flex items-center gap-1">
              <span>Full compliance</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE 3-STEP USER JOURNEY (CLEAN & SIMPLE) */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 max-w-7xl mx-auto border-t border-[oklch(0.22_0.02_188)]">
        <div className="space-y-3 mb-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[oklch(0.73_0.105_169)] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>How It Works</span>
          </div>
          <h2 className="text-3xl font-black text-white">
            Three Steps from Crypto to Bank Account
          </h2>
          <p className="text-xs sm:text-sm text-[oklch(0.7_0.015_188)]">
            A frictionless workflow designed for everyday freelancers — no crypto jargon, no exchange accounts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-7 rounded-3xl bg-[oklch(0.14_0.015_188)] border border-[oklch(0.25_0.02_188)] space-y-4 relative">
            <div className="w-10 h-10 rounded-xl bg-[oklch(0.73_0.105_169)] text-black font-extrabold flex items-center justify-center text-lg">
              1
            </div>
            <h3 className="text-lg font-bold text-white">One-Time KYC & Bank Linking</h3>
            <p className="text-xs text-[oklch(0.7_0.015_188)] leading-relaxed">
              Verify your identity using your PAN or Aadhaar via OnMeta&#39;s verified widget. Add your
              HDFC, ICICI, SBI or UPI ID with automated penny-drop verification.
            </p>
            <div className="p-3 rounded-xl bg-[oklch(0.18_0.02_188)] text-[11px] text-[oklch(0.75_0.015_188)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Only done once per profile</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-7 rounded-3xl bg-[oklch(0.14_0.015_188)] border border-[oklch(0.25_0.02_188)] space-y-4 relative">
            <div className="w-10 h-10 rounded-xl bg-[oklch(0.73_0.105_169)] text-black font-extrabold flex items-center justify-center text-lg">
              2
            </div>
            <h3 className="text-lg font-bold text-white">Lock Guaranteed Rate</h3>
            <p className="text-xs text-[oklch(0.7_0.015_188)] leading-relaxed">
              Lock in real-time institutional exchange rates for 30 seconds. Transparent pricing with
              a low 0.5% fee and exact INR payout calculation before you confirm.
            </p>
            <div className="p-3 rounded-xl bg-[oklch(0.18_0.02_188)] text-[11px] text-[oklch(0.75_0.015_188)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[oklch(0.73_0.105_169)] shrink-0" />
              <span>Zero hidden forex spread</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-7 rounded-3xl bg-[oklch(0.14_0.015_188)] border border-[oklch(0.25_0.02_188)] space-y-4 relative">
            <div className="w-10 h-10 rounded-xl bg-[oklch(0.73_0.105_169)] text-black font-extrabold flex items-center justify-center text-lg">
              3
            </div>
            <h3 className="text-lg font-bold text-white">Instant IMPS Bank Transfer</h3>
            <p className="text-xs text-[oklch(0.7_0.015_188)] leading-relaxed">
              Tap confirm with your passkey. AUSD transfers on Monad testnet and Indian Rupees land in
              your bank account in seconds with an official IMPS UTR number.
            </p>
            <div className="p-3 rounded-xl bg-[oklch(0.18_0.02_188)] text-[11px] text-[oklch(0.75_0.015_188)] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Verifiable bank UTR receipt</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. COMPARISON TABLE: TRADITIONAL VS NADRUPEE */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 max-w-7xl mx-auto border-t border-[oklch(0.22_0.02_188)]">
        <div className="space-y-3 mb-8 text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Traditional Wire Transfer vs. NadRupee + OnMeta
          </h2>
          <p className="text-xs sm:text-sm text-[oklch(0.7_0.015_188)]">
            Compare the friction of legacy international wires with instant on-chain settlement.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-[oklch(0.24_0.02_188)] rounded-2xl overflow-hidden bg-[oklch(0.13_0.014_186)]">
            <thead className="bg-[oklch(0.16_0.018_187)] text-[oklch(0.75_0.015_188)] font-bold uppercase tracking-wider border-b border-[oklch(0.24_0.02_188)]">
              <tr>
                <th className="py-4 px-6">Feature</th>
                <th className="py-4 px-6 text-red-400">Traditional Bank Wire / PayPal</th>
                <th className="py-4 px-6 text-[oklch(0.73_0.105_169)]">NadRupee + OnMeta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[oklch(0.22_0.02_188)]">
              <tr>
                <td className="py-4 px-6 font-bold text-white">Settlement Speed</td>
                <td className="py-4 px-6 text-[oklch(0.7_0.015_188)]">3 - 7 Business Days</td>
                <td className="py-4 px-6 font-bold text-emerald-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Instant (Under 60 Seconds)</span>
                </td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-bold text-white">Conversion & Platform Fees</td>
                <td className="py-4 px-6 text-[oklch(0.7_0.015_188)]">4.5% - 7.5% Hidden Forex Spread + $25 Wire Fee</td>
                <td className="py-4 px-6 font-bold text-emerald-400">Flat 0.5% Transparent Gateway Fee</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-bold text-white">Advance Milestone Escrow</td>
                <td className="py-4 px-6 text-[oklch(0.7_0.015_188)]">No escrow, high payment dispute risk</td>
                <td className="py-4 px-6 font-bold text-emerald-400">Smart Escrow with 80% Advance Claim</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-bold text-white">Gas Fees & Setup</td>
                <td className="py-4 px-6 text-[oklch(0.7_0.015_188)]">Complex SWIFT / IBAN setup</td>
                <td className="py-4 px-6 font-bold text-emerald-400">100% Gasless (Biometric Passkeys)</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-bold text-white">Indian Tax & Compliance</td>
                <td className="py-4 px-6 text-[oklch(0.7_0.015_188)]">Manual FIRC submission to branch</td>
                <td className="py-4 px-6 font-bold text-emerald-400">Automated 1% TDS & Instant IMPS UTR</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. TRUSTED SUPPORTED BANKS & PAYMENT METHODS */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 max-w-7xl mx-auto border-t border-[oklch(0.22_0.02_188)]">
        <div className="p-8 rounded-3xl bg-[oklch(0.14_0.015_188)] border border-[oklch(0.25_0.02_188)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[oklch(0.73_0.105_169)]" />
                <span>Supported Banks & Settlement Methods</span>
              </h3>
              <p className="text-xs text-[oklch(0.7_0.015_188)] pt-1">
                Direct payouts supported across all RBI-scheduled banks and NPCI-certified UPI applications.
              </p>
            </div>
            <button
              onClick={() => setShowOfframpModal(true)}
              className="px-5 py-2.5 rounded-xl bg-[oklch(0.73_0.105_169)] text-black font-bold text-xs hover:brightness-110 flex items-center gap-2 transition-all shrink-0 cursor-pointer"
            >
              <span>Verify & Add Bank</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center text-xs">
            {["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra", "All UPI Apps"].map((bank) => (
              <div key={bank} className="p-3 rounded-xl bg-[oklch(0.18_0.02_188)] border border-[oklch(0.26_0.02_188)] font-semibold text-white">
                {bank}
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-[oklch(0.16_0.018_187)] border border-[oklch(0.24_0.02_188)] text-xs text-[oklch(0.75_0.015_188)] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">Strict Name Matching Security:</span> For your regulatory protection, OnMeta ensures the name on your PAN/KYC document strictly matches the beneficiary bank account holder before initiating IMPS payout.
            </div>
          </div>
        </div>
      </section>

      {/* 7. MODAL INSTANCE */}
      <OnmetaOfframpModal
        isOpen={showOfframpModal}
        onClose={() => setShowOfframpModal(false)}
        userAddress={address}
        userEmail=""
        initialAmount={calcAmount}
        availableAusdBalance={ausdBalance}
      />
    </div>
  );
}
