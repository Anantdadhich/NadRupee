import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAccount } from '../context/AccountContext';
import * as Haptics from 'expo-haptics';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Activity,
  Zap,
  Lock,
  Banknote,
  Coins,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface Props {
  onNavigateTab: (tab: 'freelancer' | 'client' | 'offramp' | 'protocol') => void;
}

export const HomeScreen: React.FC<Props> = ({ onNavigateTab }) => {
  const { fxRate } = useAccount();

  // Interactive Calculator State
  const [calcAmountUsd, setCalcAmountUsd] = useState<number>(1000);

  const instantAdvanceUsd = calcAmountUsd * 0.8;
  const remainderUsd = calcAmountUsd * 0.2;
  const instantAdvanceInr = instantAdvanceUsd * fxRate;
  const remainderInr = remainderUsd * fxRate;

  const handleSelectCalc = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCalcAmountUsd(amount);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. HERO SECTION */}
      <View style={styles.hero}>
        <View style={styles.eyebrow}>
          <Sparkles size={11} color={Colors.mintBright} />
          <Text style={styles.eyebrowText}>NADRUPEE · BUILT ON MONAD TESTNET</Text>
        </View>

        <Text style={styles.heroTitle}>
          Get paid the moment <Text style={styles.heroHighlight}>work is funded.</Text>
        </Text>

        <Text style={styles.heroSubtitle}>
          Instant, escrow-backed payments for Indian freelancers working with global clients —
          settled onchain in AUSD, cashed out to your bank via UPI in &lt;60s.
        </Text>

        {/* CTA Buttons */}
        <View style={styles.heroCtaRow}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => onNavigateTab('freelancer')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>Freelancer Portal</Text>
            <ArrowRight size={14} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => onNavigateTab('client')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Client Portal</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Visual Banner */}
        <View style={styles.heroImageCard}>
          <Image
            source={require('../../assets/nadrupee-hero.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlayPill}>
            <Zap size={12} color={Colors.mintBright} />
            <Text style={styles.heroOverlayText}>80% Instant Advance · 0 Gas Fees</Text>
          </View>
        </View>
      </View>

      {/* 2. STATS ROW */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>80%</Text>
          <Text style={styles.statLabel}>Instant Advance</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: Colors.mintBright }]}>₹0</Text>
          <Text style={styles.statLabel}>Gas (Relayer)</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>&lt;60s</Text>
          <Text style={styles.statLabel}>Bank IMPS Settle</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>0.5%</Text>
          <Text style={styles.statLabel}>Flat Platform Fee</Text>
        </View>
      </View>

      {/* 3. INTERACTIVE ESCROW & ADVANCE CALCULATOR */}
      <View style={styles.calcSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.smallEyebrow}>
            <Coins size={10} color={Colors.mint} />
            <Text style={styles.smallEyebrowText}>INTERACTIVE CALCULATOR</Text>
          </View>
          <Text style={styles.sectionTitle}>See your guaranteed payout</Text>
          <Text style={styles.sectionSubtitle}>
            When a client locks escrow on Monad, 80% is unlocked immediately for you to cash out.
          </Text>
        </View>

        <View style={styles.calcCard}>
          <Text style={styles.calcFieldLabel}>SELECT CLIENT CONTRACT VALUE</Text>
          <View style={styles.presetRow}>
            {[500, 1000, 2500, 5000].map((amt) => (
              <TouchableOpacity
                key={amt}
                onPress={() => handleSelectCalc(amt)}
                style={[
                  styles.presetChip,
                  calcAmountUsd === amt && styles.presetChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    calcAmountUsd === amt && styles.presetChipTextActive,
                  ]}
                >
                  ${amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Breakdown Rows */}
          <View style={styles.breakdownWrap}>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLabelGroup}>
                <View style={[styles.dotIndicator, { backgroundColor: Colors.mint }]} />
                <Text style={styles.breakdownTitle}>80% Instant Advance</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.breakdownValMint}>
                  ₹{instantAdvanceInr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
                <Text style={styles.breakdownSub}>(${instantAdvanceUsd.toFixed(0)} AUSD)</Text>
              </View>
            </View>

            <View style={styles.calcDivider} />

            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLabelGroup}>
                <View style={[styles.dotIndicator, { backgroundColor: Colors.paperDim }]} />
                <Text style={styles.breakdownTitle}>20% Milestone Remainder</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.breakdownVal}>
                  ₹{remainderInr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
                <Text style={styles.breakdownSub}>(${remainderUsd.toFixed(0)} AUSD)</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.calcCta}
            onPress={() => onNavigateTab('freelancer')}
            activeOpacity={0.8}
          >
            <Text style={styles.calcCtaText}>Claim Advance on Live Escrows</Text>
            <ArrowRight size={14} color={Colors.mintBright} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. KEY FEATURES CARDS */}
      <View style={styles.featuresSection}>
        <View style={styles.smallEyebrow}>
          <ShieldCheck size={10} color={Colors.mint} />
          <Text style={styles.smallEyebrowText}>ZERO RISK PROTOCOL</Text>
        </View>
        <Text style={styles.sectionTitle}>
          Built to remove the two things that hurt freelancers most
        </Text>
        <Text style={styles.sectionSubtitle}>
          Payment delays and non-payment risk. Verified transparently on Monad.
        </Text>

        <View style={styles.featureCardsCol}>
          {/* Card 1 */}
          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Lock size={18} color={Colors.mint} />
            </View>
            <Text style={styles.featureTitle}>Certainty Before You Start</Text>
            <Text style={styles.featureDesc}>
              Your client deposits Agora AUSD into the smart escrow contract before you write a single line of code.
            </Text>
            <View style={styles.featureMetaRow}>
              <Check size={12} color={Colors.mint} />
              <Text style={styles.featureMetaText}>On-chain Escrow Verified</Text>
            </View>
          </View>

          {/* Card 2 */}
          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Zap size={18} color={Colors.mint} />
            </View>
            <Text style={styles.featureTitle}>Zero Seed Phrases / Passkey Native</Text>
            <Text style={styles.featureDesc}>
              Log in seamlessly using Mera WebAuthn PRF passkeys. Sign on-chain releases using Touch ID or Face ID.
            </Text>
            <View style={styles.featureMetaRow}>
              <Check size={12} color={Colors.mint} />
              <Text style={styles.featureMetaText}>No Private Key Leaks</Text>
            </View>
          </View>

          {/* Card 3 */}
          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Banknote size={18} color={Colors.mint} />
            </View>
            <Text style={styles.featureTitle}>Instant UPI & IMPS Cashout</Text>
            <Text style={styles.featureDesc}>
              Sell your AUSD directly to Indian Rupees. Automated RBI & FIU-IND compliant settlement with real UTR receipts.
            </Text>
            <View style={styles.featureMetaRow}>
              <Check size={12} color={Colors.mint} />
              <Text style={styles.featureMetaText}>&lt;60s Bank Delivery</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 5. RISK COMPARISON */}
      <View style={styles.riskCard}>
        <Text style={styles.smallEyebrowText}>PAYMENT RISK COMPARISON</Text>
        <Text style={styles.riskTitle}>How NadRupee eliminates payment defaults</Text>

        <View style={styles.riskBarsWrap}>
          <View style={styles.riskBarItem}>
            <Text style={styles.riskBarLabel}>Traditional Net-30</Text>
            <View style={styles.riskBarOuter}>
              <View style={[styles.riskBarInner, { width: '100%', backgroundColor: Colors.danger }]} />
            </View>
            <Text style={[styles.riskBarVal, { color: Colors.danger }]}>100% Risk</Text>
          </View>

          <View style={styles.riskBarItem}>
            <Text style={styles.riskBarLabel}>Partial Deposit</Text>
            <View style={styles.riskBarOuter}>
              <View style={[styles.riskBarInner, { width: '50%', backgroundColor: Colors.amber }]} />
            </View>
            <Text style={[styles.riskBarVal, { color: Colors.amber }]}>50% Risk</Text>
          </View>

          <View style={styles.riskBarItem}>
            <Text style={styles.riskBarLabel}>NadRupee Escrow</Text>
            <View style={styles.riskBarOuter}>
              <View style={[styles.riskBarInner, { width: '4%', backgroundColor: Colors.mint }]} />
            </View>
            <Text style={[styles.riskBarVal, { color: Colors.mintBright }]}>~0% Risk</Text>
          </View>
        </View>
      </View>

      {/* 6. PROTOCOL RAILS BANNER */}
      <View style={styles.railsCard}>
        <Activity size={16} color={Colors.mint} />
        <Text style={styles.railsText}>
          SECURED BY MONAD · AGORA AUSD · MERA PASSKEYS · ONMETA OFF-RAMP
        </Text>
      </View>
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
    paddingBottom: 40,
  },
  hero: {
    paddingTop: 16,
    paddingBottom: 24,
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
    marginBottom: 12,
  },
  eyebrowText: {
    color: Colors.mintBright,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: Colors.paper,
    lineHeight: 38,
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  heroHighlight: {
    color: Colors.mint,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.paperMuted,
    lineHeight: 22,
    marginBottom: 20,
  },
  heroCtaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  primaryBtn: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.mint,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBtn: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.nightElevated,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: Colors.paper,
    fontSize: 14,
    fontWeight: '700',
  },
  heroImageCard: {
    width: '100%',
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlayPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(14, 23, 24, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.35)',
    paddingVertical: 7,
    borderRadius: 12,
  },
  heroOverlayText: {
    color: Colors.mintBright,
    fontSize: 11,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  statBox: {
    width: (width - 40) / 2,
    backgroundColor: Colors.nightElevated,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 14,
    padding: 14,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.paper,
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.paperDim,
  },
  calcSection: {
    marginBottom: 28,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  smallEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  smallEyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: Colors.mint,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.paper,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.paperMuted,
    lineHeight: 18,
  },
  calcCard: {
    backgroundColor: Colors.nightElevated,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 18,
    padding: 16,
  },
  calcFieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: Colors.paperDim,
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  presetChip: {
    flex: 1,
    height: 38,
    backgroundColor: Colors.nightSoft,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipActive: {
    borderColor: Colors.mint,
    backgroundColor: Colors.mintSoft,
  },
  presetChipText: {
    color: Colors.paperMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  presetChipTextActive: {
    color: Colors.mintBright,
  },
  breakdownWrap: {
    backgroundColor: Colors.nightSoft,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    gap: 12,
    marginBottom: 14,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.paper,
  },
  breakdownValMint: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.mintBright,
  },
  breakdownVal: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.paper,
  },
  breakdownSub: {
    fontSize: 10,
    color: Colors.paperDim,
  },
  calcDivider: {
    height: 1,
    backgroundColor: Colors.nightBorder,
  },
  calcCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  calcCtaText: {
    color: Colors.mintBright,
    fontSize: 12,
    fontWeight: '700',
  },
  featuresSection: {
    marginBottom: 28,
  },
  featureCardsCol: {
    gap: 12,
    marginTop: 14,
  },
  featureCard: {
    backgroundColor: Colors.nightElevated,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 16,
    padding: 16,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.paper,
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 12,
    color: Colors.paperMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  featureMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureMetaText: {
    fontSize: 11,
    color: Colors.mint,
    fontWeight: '700',
  },
  riskCard: {
    backgroundColor: Colors.nightElevated,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.paper,
    marginTop: 4,
    marginBottom: 16,
  },
  riskBarsWrap: {
    gap: 14,
  },
  riskBarItem: {
    gap: 4,
  },
  riskBarLabel: {
    fontSize: 11,
    color: Colors.paperMuted,
    fontWeight: '600',
  },
  riskBarOuter: {
    height: 8,
    backgroundColor: Colors.nightSoft,
    borderRadius: 4,
    overflow: 'hidden',
  },
  riskBarInner: {
    height: '100%',
    borderRadius: 4,
  },
  riskBarVal: {
    fontSize: 10,
    fontWeight: '800',
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  railsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: Colors.nightSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
  },
  railsText: {
    color: Colors.paperDim,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
