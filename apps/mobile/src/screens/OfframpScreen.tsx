import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAccount } from '../context/AccountContext';
import { CashoutModal } from '../components/CashoutModal';
import * as Haptics from 'expo-haptics';
import {
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Zap,
  ShieldCheck,
  Banknote,
  ArrowRight,
  Clock,
  ArrowUpRight,
  Landmark,
} from 'lucide-react-native';
import { TabType } from '../components/BottomNav';

interface Props {
  onNavigateTab?: (tab: TabType) => void;
}

export const OfframpScreen: React.FC<Props> = ({ onNavigateTab }) => {
  const { fxRate, ausdBalance, refreshAccountData } = useAccount();

  const [inputUsd, setInputUsd] = useState<string>('250');
  const [cashoutVisible, setCashoutVisible] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const numUsd = parseFloat(inputUsd) || 0;
  const grossInr = numUsd * fxRate;
  const feeInr = grossInr * 0.005; // 0.5% gateway fee
  const tdsInr = grossInr * 0.01;  // 1% TDS under Section 194S
  const netInr = Math.max(0, grossInr - feeInr - tdsInr);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await refreshAccountData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectQuick = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputUsd(amount.toString());
  };

  const handleSelectMax = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputUsd(Math.floor(ausdBalance).toString());
  };

  const handleLaunchModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCashoutVisible(true);
  };

  return (
    <ScrollView
      style={styles.pageContainer}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={Colors.mint}
          colors={[Colors.mint]}
        />
      }
    >
      {/* 1. PORTAL HERO */}
      <View style={styles.portalHero}>
        <View style={styles.heroTopRow}>
          <View style={styles.darkEyebrow}>
            <Sparkles size={11} color={Colors.mint} />
            <Text style={styles.darkEyebrowText}>
              NADRUPEE · INSTANT INR OFF-RAMP RAIL <Text style={styles.eyebrowSub}>ONMETA</Text>
            </Text>
          </View>

          {onNavigateTab && (
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onNavigateTab('freelancer');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.switchBtnText}>Freelancer Portal</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.portalH1Em}>Get Paid in Crypto.</Text>
        <Text style={styles.portalH1White}>Settle in INR Instantly.</Text>

        <Text style={styles.portalDesc}>
          Turn your Monad escrow earnings and AUSD milestone payments directly into Indian Rupees. Instant IMPS bank deposits, zero wire delays, flat 0.5% fee, and automated tax compliance.
        </Text>
      </View>

      {/* 2. LIVE CURRENCY CONVERTER CARD */}
      <View style={styles.portalCard}>
        <View style={styles.portalCardHeader}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Banknote size={15} color={Colors.mint} />
              <Text style={styles.portalLabel}>INSTANT INR CASHOUT CALCULATOR</Text>
            </View>
            <Text style={styles.subtext}>Real-time live quotation</Text>
          </View>
          <View style={styles.ratePill}>
            <TrendingUp size={11} color={Colors.mint} />
            <Text style={styles.ratePillText}>1 USD = ₹{fxRate.toFixed(2)}</Text>
          </View>
        </View>

        {/* Input */}
        <View style={styles.inputGroup}>
          <View style={styles.inputLabelRow}>
            <Text style={styles.fieldLabel}>YOU SELL (AUSD / USDC)</Text>
            <TouchableOpacity onPress={handleSelectMax} activeOpacity={0.7}>
              <Text style={styles.availableBalanceText}>
                Available: {ausdBalance.toFixed(2)} AUSD
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.amountWrap}>
            <TextInput
              style={styles.amountInput}
              value={inputUsd}
              onChangeText={setInputUsd}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="rgba(248, 250, 252, 0.3)"
            />
            <Text style={styles.amountSuffix}>AUSD</Text>
          </View>

          {/* Quick preset chips */}
          <View style={styles.chipRow}>
            {[50, 100, 250, 500, 1000].map((amt) => {
              const active = inputUsd === amt.toString();
              return (
                <TouchableOpacity
                  key={amt}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => handleSelectQuick(amt)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    ${amt}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.chip, styles.chipMax]}
              onPress={handleSelectMax}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, styles.chipMaxText]}>MAX</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Breakdown details */}
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownKey}>Gross Conversion</Text>
            <Text style={styles.breakdownVal}>
              ₹{grossInr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownKey}>Gateway Fee (0.5%)</Text>
            <Text style={styles.breakdownValMuted}>-₹{feeInr.toFixed(2)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownKey}>TDS Compliance (1% Sec 194S)</Text>
            <Text style={styles.breakdownValMuted}>-₹{tdsInr.toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.netRow}>
            <Text style={styles.netLabel}>Net Bank Deposit:</Text>
            <Text style={styles.netVal}>
              ₹{netInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Specs Row */}
        <View style={styles.specsRow}>
          <View>
            <Text style={styles.specSub}>PLATFORM FEE</Text>
            <Text style={styles.specVal}>0.5% (Flat)</Text>
          </View>
          <View>
            <Text style={styles.specSub}>GAS NETWORK</Text>
            <Text style={[styles.specVal, { color: Colors.mintBright }]}>₹0 Free</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.specSub}>SPEED</Text>
            <Text style={styles.specVal}>&lt;60s IMPS</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleLaunchModal}
          activeOpacity={0.8}
        >
          <Zap size={15} color={Colors.night} />
          <Text style={styles.actionBtnText}>
            Settle ₹{netInr.toFixed(0)} into Bank Account
          </Text>
        </TouchableOpacity>

        <View style={styles.securityNote}>
          <ShieldCheck size={13} color={Colors.mintBright} />
          <Text style={styles.securityNoteText}>
            Dispatched via IMPS with automatic UTR reference number
          </Text>
        </View>
      </View>

      {/* 3. TRADITIONAL WIRE VS NADRUPEE COMPARISON */}
      <View style={[styles.portalCard, { marginTop: 20 }]}>
        <View style={styles.portalCardHeader}>
          <View>
            <Text style={styles.sectionH2Em}>Traditional Wire vs <Text style={styles.sectionH2White}>NadRupee</Text></Text>
            <Text style={styles.subtext}>Why freelancers switch to instant settlement</Text>
          </View>
        </View>

        <View style={styles.compareGrid}>
          {/* Legacy Rail */}
          <View style={styles.compareColLegacy}>
            <Text style={styles.compareColHeaderLegacy}>Traditional SWIFT / Bank</Text>
            <View style={styles.compareItem}>
              <Clock size={12} color="#f87171" />
              <Text style={styles.compareItemText}>3 to 5 business days wait</Text>
            </View>
            <View style={styles.compareItem}>
              <Clock size={12} color="#f87171" />
              <Text style={styles.compareItemText}>4% – 7% hidden FX margin</Text>
            </View>
            <View style={styles.compareItem}>
              <Clock size={12} color="#f87171" />
              <Text style={styles.compareItemText}>$25 – $45 intermediary fees</Text>
            </View>
          </View>

          {/* NadRupee Rail */}
          <View style={styles.compareColNad}>
            <View style={styles.compareNadTag}>
              <Text style={styles.compareNadTagText}>RECOMMENDED</Text>
            </View>
            <Text style={styles.compareColHeaderNad}>NadRupee Onmeta Rail</Text>
            <View style={styles.compareItem}>
              <CheckCircle2 size={12} color={Colors.mintBright} />
              <Text style={styles.compareItemTextNad}>&lt;60s direct IMPS / UPI</Text>
            </View>
            <View style={styles.compareItem}>
              <CheckCircle2 size={12} color={Colors.mintBright} />
              <Text style={styles.compareItemTextNad}>Flat 0.5% transparent fee</Text>
            </View>
            <View style={styles.compareItem}>
              <CheckCircle2 size={12} color={Colors.mintBright} />
              <Text style={styles.compareItemTextNad}>Automated Form 16 / TDS</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 4. COMPLIANCE & TRUST */}
      <View style={[styles.portalCard, { marginTop: 20 }]}>
        <View style={styles.portalCardHeader}>
          <Text style={styles.sectionH2Em}>
            Compliant & Regulated <Text style={styles.sectionH2White}>Infrastructure</Text>
          </Text>
        </View>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Landmark size={16} color={Colors.mint} />
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>Instant IMPS & UPI Bank Transfers</Text>
              <Text style={styles.featureDesc}>
                Direct payout to all Indian banks (HDFC, ICICI, SBI, Axis) and UPI VPAs.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <ShieldCheck size={16} color={Colors.mint} />
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>100% RBI & FIU-IND Compliant</Text>
              <Text style={styles.featureDesc}>
                Compliant with Indian virtual digital asset guidelines with automated 1% TDS compliance.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <CheckCircle2 size={16} color={Colors.mint} />
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>Verified IMPS UTR Reference</Text>
              <Text style={styles.featureDesc}>
                Every payout includes an official 12-digit UTR reference code queryable in your netbanking statement.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Cashout Modal */}
      <CashoutModal
        visible={cashoutVisible}
        onClose={() => setCashoutVisible(false)}
        defaultAmount={numUsd}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: Colors.night,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  portalHero: {
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  switchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  switchBtnText: {
    color: Colors.paper,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  darkEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.25)',
    alignSelf: 'flex-start',
  },
  darkEyebrowText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(248, 250, 252, 0.75)',
    letterSpacing: 0.5,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  eyebrowSub: {
    color: Colors.mutedForeground,
    marginLeft: 4,
  },
  portalH1Em: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '400',
    color: 'rgba(248, 250, 252, 0.5)',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    letterSpacing: -0.6,
  },
  portalH1White: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '500',
    color: Colors.paper,
    marginBottom: 8,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    letterSpacing: -0.6,
  },
  portalDesc: {
    fontSize: 13,
    color: 'rgba(248, 250, 252, 0.65)',
    lineHeight: 18,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  portalCard: {
    backgroundColor: Colors.nightCard,
    borderWidth: 1,
    borderColor: Colors.nightCardBorder,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 6,
  },
  portalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 14,
    marginBottom: 16,
  },
  portalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.mutedForeground,
    letterSpacing: 0.5,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  subtext: {
    fontSize: 11,
    color: Colors.mutedForeground,
    marginTop: 2,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  ratePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 217, 169, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.25)',
  },
  ratePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.mintBright,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.mutedForeground,
    letterSpacing: 0.5,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  availableBalanceText: {
    fontSize: 11,
    color: Colors.mintBright,
    fontWeight: '600',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  amountInput: {
    flex: 1,
    height: 46,
    color: Colors.paper,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  amountSuffix: {
    color: Colors.mint,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipActive: {
    backgroundColor: 'rgba(56, 217, 169, 0.15)',
    borderColor: 'rgba(56, 217, 169, 0.4)',
  },
  chipMax: {
    backgroundColor: 'rgba(56, 217, 169, 0.1)',
    borderColor: 'rgba(56, 217, 169, 0.3)',
  },
  chipText: {
    color: Colors.paperDim,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  chipTextActive: {
    color: Colors.mintBright,
    fontWeight: '700',
  },
  chipMaxText: {
    color: Colors.mintBright,
    fontWeight: '700',
  },
  breakdownCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownKey: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  breakdownVal: {
    fontSize: 12,
    color: Colors.paper,
    fontWeight: '600',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  breakdownValMuted: {
    fontSize: 11,
    color: 'rgba(248, 250, 252, 0.6)',
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 4,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.mintBright,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  netVal: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.paper,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  specSub: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.mutedForeground,
    letterSpacing: 0.5,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  specVal: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.paper,
    marginTop: 2,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  actionBtn: {
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.paper,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    shadowColor: Colors.paper,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  actionBtnText: {
    color: Colors.night,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  securityNoteText: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  compareGrid: {
    gap: 12,
  },
  compareColLegacy: {
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  compareColHeaderLegacy: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f87171',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    marginBottom: 2,
  },
  compareColNad: {
    backgroundColor: 'rgba(56, 217, 169, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.25)',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    position: 'relative',
  },
  compareNadTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(56, 217, 169, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compareNadTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.mintBright,
    letterSpacing: 0.5,
  },
  compareColHeaderNad: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.mintBright,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    marginBottom: 2,
  },
  compareItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compareItemText: {
    fontSize: 11,
    color: 'rgba(248, 250, 252, 0.65)',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  compareItemTextNad: {
    fontSize: 11,
    color: Colors.paper,
    fontWeight: '500',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  sectionH2Em: {
    fontSize: 17,
    fontWeight: '500',
    color: 'rgba(248, 250, 252, 0.5)',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  sectionH2White: {
    fontSize: 17,
    fontWeight: '500',
    color: Colors.paper,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  featuresList: {
    gap: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.paper,
    marginBottom: 2,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  featureDesc: {
    fontSize: 11,
    color: Colors.mutedForeground,
    lineHeight: 16,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
});
