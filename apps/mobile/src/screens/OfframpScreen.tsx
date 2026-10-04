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
  Sparkles,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react-native';

export const OfframpScreen: React.FC = () => {
  const { fxRate } = useAccount();

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
      style={styles.pageContainer}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. PORTAL HERO */}
      <View style={styles.portalHero}>
        <View style={styles.darkEyebrow}>
          <Sparkles size={11} color={Colors.mint} />
          <Text style={styles.darkEyebrowText}>
            NADRUPEE · INSTANT INR OFF-RAMP RAIL <Text style={styles.eyebrowSub}>ONMETA</Text>
          </Text>
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
          <Text style={styles.portalLabel}>INSTANT INR CASHOUT CALCULATOR</Text>
          <View style={styles.ratePill}>
            <TrendingUp size={11} color={Colors.mint} />
            <Text style={styles.ratePillText}>1 USD = ₹{fxRate.toFixed(2)}</Text>
          </View>
        </View>

        {/* Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>YOU SELL (AUSD)</Text>
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
        </View>

        {/* Output */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>YOU RECEIVE (ESTIMATED IN BANK)</Text>
          <View style={styles.outputWrap}>
            <Text style={styles.outputNumber}>
              ₹{finalInr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Text>
            <Text style={[styles.amountSuffix, { color: Colors.mintBright }]}>INR</Text>
          </View>
        </View>

        {/* Specs */}
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
          <Text style={styles.actionBtnText}>Launch Instant Cashout Modal</Text>
        </TouchableOpacity>
      </View>

      {/* 3. COMPLIANCE & TRUST */}
      <View style={[styles.portalCard, { marginTop: 24 }]}>
        <View style={styles.portalCardHeader}>
          <Text style={styles.sectionH2Em}>
            Compliant & Regulated <Text style={styles.sectionH2White}>Infrastructure</Text>
          </Text>
        </View>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <CheckCircle2 size={16} color={Colors.mint} />
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>Instant IMPS & UPI Bank Transfers</Text>
              <Text style={styles.featureDesc}>
                Direct payout to all Indian banks (HDFC, ICICI, SBI, Axis) and UPI VPAs.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <CheckCircle2 size={16} color={Colors.mint} />
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 60,
  },
  portalHero: {
    marginBottom: 24,
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
    marginBottom: 14,
  },
  darkEyebrowText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(248, 250, 252, 0.75)',
    letterSpacing: 0.5,
  },
  eyebrowSub: {
    color: Colors.mutedForeground,
    marginLeft: 4,
  },
  portalH1Em: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '500',
    color: 'rgba(248, 250, 252, 0.5)',
  },
  portalH1White: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '500',
    color: Colors.paper,
    marginBottom: 10,
  },
  portalDesc: {
    fontSize: 13,
    color: 'rgba(248, 250, 252, 0.65)',
    lineHeight: 18,
  },
  portalCard: {
    backgroundColor: Colors.nightCard,
    borderWidth: 1,
    borderColor: Colors.nightCardBorder,
    borderRadius: 16,
    padding: 20,
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
  },
  ratePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 217, 169, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  ratePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.mintBright,
  },
  inputGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.mutedForeground,
    letterSpacing: 0.5,
    marginBottom: 6,
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
    height: 44,
    color: Colors.paper,
    fontSize: 15,
    fontWeight: '600',
  },
  amountSuffix: {
    color: Colors.mint,
    fontSize: 12,
    fontWeight: '700',
  },
  outputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  outputNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.paper,
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
  },
  specSub: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.mutedForeground,
    letterSpacing: 0.5,
  },
  specVal: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.paper,
    marginTop: 2,
  },
  actionBtn: {
    height: 38,
    borderRadius: 22,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  actionBtnText: {
    color: Colors.night,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionH2Em: {
    fontSize: 17,
    fontWeight: '500',
    color: 'rgba(248, 250, 252, 0.5)',
  },
  sectionH2White: {
    fontSize: 17,
    fontWeight: '500',
    color: Colors.paper,
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
  },
  featureDesc: {
    fontSize: 11,
    color: Colors.mutedForeground,
    lineHeight: 16,
  },
});
