import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAccount } from '../context/AccountContext';
import { CashoutModal } from '../components/CashoutModal';
import * as Haptics from 'expo-haptics';
import {
  Banknote,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react-native';

export const OfframpScreen: React.FC = () => {
  const { ausdBalance, fxRate } = useAccount();

  const [inputUsd, setInputUsd] = useState<string>('250');
  const [cashoutVisible, setCashoutVisible] = useState<boolean>(false);

  const numUsd = parseFloat(inputUsd) || 0;
  const numInr = numUsd * fxRate;
  const feeInr = numInr * 0.005;
  const finalInr = Math.max(0, numInr - feeInr);

  const handleLaunchModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCashoutVisible(true);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. HERO */}
      <View style={styles.hero}>
        <View style={styles.eyebrow}>
          <Banknote size={11} color={Colors.mintBright} />
          <Text style={styles.eyebrowText}>INSTANT INR OFF-RAMP RAIL</Text>
        </View>
        <Text style={styles.heroTitle}>
          Get Paid in Crypto. <Text style={styles.heroHighlight}>Settle in INR Instantly.</Text>
        </Text>
        <Text style={styles.heroSubtitle}>
          Turn your Monad escrow earnings and AUSD milestone payments directly into Indian Rupees.
          Instant IMPS bank deposits, zero wire delays, flat 0.5% fee, and automated tax compliance.
        </Text>
      </View>

      {/* 2. LIVE CURRENCY CONVERTER CARD */}
      <View style={styles.converterCard}>
        <View style={styles.converterHeader}>
          <View style={styles.oracleBadge}>
            <TrendingUp size={12} color={Colors.mint} />
            <Text style={styles.oracleText}>LIVE FX ORACLE</Text>
          </View>
          <Text style={styles.oracleRate}>1 AUSD = ₹{fxRate.toFixed(2)}</Text>
        </View>

        {/* You Sell Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>YOU SELL</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={inputUsd}
              onChangeText={setInputUsd}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={Colors.paperDim}
            />
            <View style={styles.tokenPill}>
              <Text style={styles.tokenPillText}>AUSD</Text>
            </View>
          </View>
        </View>

        {/* You Receive Calculation */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>YOU RECEIVE (ESTIMATED IN BANK)</Text>
          <View style={[styles.inputRow, styles.outputRow]}>
            <Text style={styles.outputInr}>
              ₹{finalInr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Text>
            <View style={[styles.tokenPill, styles.tokenPillInr]}>
              <Text style={[styles.tokenPillText, { color: Colors.mintBright }]}>INR</Text>
            </View>
          </View>
        </View>

        {/* Specs breakdown */}
        <View style={styles.specsRow}>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>PLATFORM FEE</Text>
            <Text style={styles.specVal}>0.5% (Flat)</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>GAS NETWORK</Text>
            <Text style={[styles.specVal, { color: Colors.mintBright }]}>₹0 Free</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>SPEED</Text>
            <Text style={styles.specVal}>&lt;60s IMPS</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.settleBtn}
          onPress={handleLaunchModal}
          activeOpacity={0.8}
        >
          <Zap size={16} color="#000" />
          <Text style={styles.settleBtnText}>Launch Instant Cashout Modal</Text>
        </TouchableOpacity>
      </View>

      {/* 3. COMPLIANCE & TRUST HIGHLIGHTS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compliant & Regulated Infrastructure</Text>
        <Text style={styles.sectionSubtitle}>
          Zero P2P fraud risk. Official banking channels through licensed payment gateways.
        </Text>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <CheckCircle2 size={16} color={Colors.mint} />
            <View style={{ flex: 1 }}>
              <Text style={styles.featureItemTitle}>Instant IMPS & UPI Bank Transfers</Text>
              <Text style={styles.featureItemDesc}>
                Direct payout to all Indian banks (HDFC, ICICI, SBI, Axis) and UPI handles.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <CheckCircle2 size={16} color={Colors.mint} />
            <View style={{ flex: 1 }}>
              <Text style={styles.featureItemTitle}>100% RBI & FIU-IND Compliant</Text>
              <Text style={styles.featureItemDesc}>
                Compliant with Indian virtual digital asset guidelines with automated 1% TDS certificates.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <CheckCircle2 size={16} color={Colors.mint} />
            <View style={{ flex: 1 }}>
              <Text style={styles.featureItemTitle}>Verified IMPS UTR Reference</Text>
              <Text style={styles.featureItemDesc}>
                Every payout includes an official 12-digit UTR reference code queryable in your netbanking app.
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
  container: {
    flex: 1,
    backgroundColor: Colors.night,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  hero: {
    marginBottom: 20,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 217, 169, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.3)',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 10,
  },
  eyebrowText: {
    color: Colors.mintBright,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.paper,
    lineHeight: 34,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  heroHighlight: {
    color: Colors.mint,
  },
  heroSubtitle: {
    fontSize: 13,
    color: Colors.paperMuted,
    lineHeight: 20,
  },
  converterCard: {
    backgroundColor: Colors.nightElevated,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  converterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  oracleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  oracleText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.mint,
    letterSpacing: 0.5,
  },
  oracleRate: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.paper,
  },
  inputGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.paperDim,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.nightSurface,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  textInput: {
    flex: 1,
    height: 48,
    color: Colors.paper,
    fontSize: 18,
    fontWeight: '700',
  },
  tokenPill: {
    backgroundColor: Colors.nightSoft,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tokenPillText: {
    color: Colors.paper,
    fontSize: 12,
    fontWeight: '800',
  },
  outputRow: {
    height: 48,
    justifyContent: 'space-between',
  },
  outputInr: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.mintBright,
  },
  tokenPillInr: {
    borderColor: Colors.mintBorder,
    backgroundColor: Colors.mintSoft,
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.nightSoft,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  specItem: {
    gap: 2,
  },
  specLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.paperDim,
  },
  specVal: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.paper,
  },
  settleBtn: {
    height: 50,
    backgroundColor: Colors.mint,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  settleBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.paper,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.paperDim,
    marginTop: 2,
    marginBottom: 14,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.nightElevated,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 14,
    padding: 14,
  },
  featureItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.paper,
    marginBottom: 3,
  },
  featureItemDesc: {
    fontSize: 11,
    color: Colors.paperMuted,
    lineHeight: 16,
  },
});
