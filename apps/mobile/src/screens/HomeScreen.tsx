import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { Colors } from '../theme/colors';
import { BrandMark } from '../components/BrandMark';
import * as Haptics from 'expo-haptics';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Activity,
  IndianRupee,
} from 'lucide-react-native';
import { useAccount } from '../context/AccountContext';

interface Props {
  onNavigateTab: (tab: 'freelancer' | 'client' | 'offramp' | 'protocol') => void;
}

export const HomeScreen: React.FC<Props> = ({ onNavigateTab }) => {
  const { refreshAccountData } = useAccount();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await refreshAccountData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setIsRefreshing(false);
    }
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
      {/* 1. HERO SECTION (Matching web .hero & .hero-content) */}
      <View style={styles.heroSection}>
        {/* Dark Eyebrow */}
        <View style={styles.darkEyebrow}>
          <Sparkles size={11} color={Colors.mint} />
          <Text style={styles.darkEyebrowText}>
            NADRUPEE · BUILT ON MONAD <Text style={styles.eyebrowSub}>TESTNET</Text>
          </Text>
        </View>

        {/* Hero Heading: em muted 50%, main text clean white */}
        <View style={styles.heroHeadingWrap}>
          <Text style={styles.heroH1Em}>Get paid the moment</Text>
          <Text style={styles.heroH1White}>work is funded.</Text>
        </View>

        {/* Hero Paragraph */}
        <Text style={styles.heroParagraph}>
          Instant, escrow-backed payments for Indian freelancers working with global clients —
          settled onchain, cashed out to your bank, no wallet required.
        </Text>

        {/* Button Row */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onNavigateTab('freelancer');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.textLink}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onNavigateTab('freelancer');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.textLinkText}>See how it works</Text>
            <ArrowRight size={13} color="rgba(248, 250, 252, 0.7)" />
          </TouchableOpacity>
        </View>

        {/* Hero Product Graphic with Radial Mint Glow */}
        <View style={styles.heroProductWrap}>
          <View style={styles.radialGlow} />
          <Image
            source={require('../../assets/nadrupee-hero.png')}
            style={styles.heroProductImg}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* 2. KEY FEATURES SECTION (Matching web .features & .feature-grid) */}
      <View style={styles.featuresSection}>
        <View style={styles.sectionHeading}>
          <View style={styles.eyebrow}>
            <Sparkles size={11} color={Colors.mutedForeground} />
            <Text style={styles.eyebrowText}>KEY FEATURES</Text>
          </View>
          <Text style={styles.sectionH2Em}>NadRupee was built to remove</Text>
          <Text style={styles.sectionH2White}>the two things that hurt freelancers most</Text>
          <Text style={styles.sectionDesc}>
            Getting paid shouldn't require trust, delay, or a crash course in crypto.
          </Text>
        </View>

        {/* Feature Photo */}
        <View style={styles.photoCard}>
          <Image
            source={require('../../assets/assets/freelancer-desk.jpg')}
            style={styles.photoImg}
            resizeMode="cover"
          />
        </View>

        {/* Funding Card (Exact replica of web .funding-card & .funding-widget) */}
        <View style={styles.fundingCard}>
          <Text style={styles.cardH3}>Certainty before you start</Text>
          <Text style={styles.cardDesc}>
            Your client locks payment in escrow before work begins — visible onchain.
          </Text>

          <View style={styles.fundingWidget}>
            <Text style={styles.widgetSub}>JOB ESCROW · ACME STUDIO</Text>
            <Text style={styles.widgetAmount}>₹68,000</Text>

            <View style={styles.chipsRow}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>Locked</Text>
              </View>
              <View style={styles.chip}>
                <Check size={10} color={Colors.mint} />
                <Text style={[styles.chipText, { color: Colors.mint }]}>Onchain</Text>
              </View>
            </View>

            {/* Range Bar */}
            <View style={styles.rangeTrack}>
              <View style={styles.rangeFill} />
            </View>
            <View style={styles.rangeLabelRow}>
              <Text style={styles.rangeLabel}>80% INSTANT</Text>
              <Text style={styles.rangeLabel}>20% ON COMPLETION</Text>
            </View>

            <TouchableOpacity
              style={styles.widgetBtn}
              onPress={() => onNavigateTab('client')}
              activeOpacity={0.8}
            >
              <Text style={styles.widgetBtnText}>Confirmed</Text>
              <Check size={12} color="#f8fafc" />
            </TouchableOpacity>
          </View>

          {/* Lifetime bar */}
          <View style={styles.lifetimeBar}>
            <IndianRupee size={18} color={Colors.paper} />
            <View>
              <Text style={styles.lifetimeSub}>INSTANT RELEASE · 80%</Text>
              <Text style={styles.lifetimeAmount}>₹54,400</Text>
            </View>
            <View style={styles.lifetimeMeter}>
              <View style={styles.lifetimeFill} />
            </View>
          </View>
        </View>

        {/* Risk Card (Exact replica of web .risk-card & .risk-chart) */}
        <View style={styles.riskCard}>
          <View style={styles.cardTopline}>
            <Text style={styles.toplineText}>REDUCING RISK WITH NADRUPEE</Text>
            <Text style={styles.toplineTag}>Compare scenarios</Text>
          </View>

          <Text style={styles.cardH3}>Payment risk</Text>

          {/* 3-Column Risk Chart */}
          <View style={styles.riskChart}>
            <View style={[styles.riskCol, styles.riskColPartial]}>
              <Text style={styles.riskColB}>50%</Text>
              <Text style={styles.riskColSpan}>PARTIAL DEPOSIT</Text>
            </View>
            <View style={[styles.riskCol, styles.riskColDanger]}>
              <Text style={styles.riskColB}>100%</Text>
              <Text style={styles.riskColSpan}>NO ESCROW</Text>
            </View>
            <View style={[styles.riskCol, styles.riskColSafe]}>
              <Text style={[styles.riskColB, { color: Colors.mintBright }]}>~0%</Text>
              <Text style={[styles.riskColSpan, { color: Colors.mint }]}>NADRUPEE</Text>
            </View>
          </View>

          <Text style={[styles.cardH3, { marginTop: 14 }]}>Full payment locked</Text>
          <Text style={styles.cardDesc}>
            Funds are locked before work starts and 80% releases instantly on confirmation.
          </Text>
        </View>
      </View>

      {/* 3. TESTIMONIALS SECTION (Matching web .industry & .founder-card) */}
      <View style={styles.industrySection}>
        <View style={styles.eyebrow}>
          <Text style={styles.eyebrowText}>INDUSTRY</Text>
        </View>
        <Text style={styles.sectionH2White}>Freelancers on NadRupee say</Text>

        <View style={styles.foundersList}>
          {/* Founder 1 */}
          <View style={styles.founderCard}>
            <Image
              source={require('../../assets/assets/founder-curly.jpg')}
              style={styles.founderImg}
              resizeMode="cover"
            />
            <View style={styles.founderCaption}>
              <Text style={styles.founderQuote}>
                “I used to wait three weeks after a project shipped. Now I see the money the second the client confirms.”
              </Text>
              <Text style={styles.founderName}>Early user</Text>
              <Text style={styles.founderCo}>Web development</Text>
            </View>
          </View>

          {/* Founder 2 */}
          <View style={styles.founderCard}>
            <Image
              source={require('../../assets/assets/founder-office.jpg')}
              style={styles.founderImg}
              resizeMode="cover"
            />
            <View style={styles.founderCaption}>
              <Text style={styles.founderQuote}>
                “I don't have to explain crypto to my clients. They just pay, and I just get paid.”
              </Text>
              <Text style={styles.founderName}>Early user</Text>
              <Text style={styles.founderCo}>Design</Text>
            </View>
          </View>

          {/* Founder 3 */}
          <View style={styles.founderCard}>
            <Image
              source={require('../../assets/assets/founder-outdoor.jpg')}
              style={styles.founderImg}
              resizeMode="cover"
            />
            <View style={styles.founderCaption}>
              <Text style={styles.founderQuote}>
                “The first time I saw the escrow lock happen live, I actually trusted the process for once.”
              </Text>
              <Text style={styles.founderName}>Early user</Text>
              <Text style={styles.founderCo}>Content</Text>
            </View>
          </View>

          {/* Stat Card */}
          <View style={styles.industryStatCard}>
            <Text style={styles.industryStatNumber}>~60s</Text>
            <Text style={styles.industryStatDesc}>
              average time from escrow release to stablecoins in wallet
            </Text>
          </View>
        </View>
      </View>

      {/* 4. PLATFORM INFRASTRUCTURE (Matching web .platform & .dashboard-stack) */}
      <View style={styles.platformSection}>
        <View style={styles.darkEyebrow}>
          <Activity size={11} color={Colors.mint} />
          <Text style={styles.darkEyebrowText}>PAYMENT INFRASTRUCTURE</Text>
        </View>

        <Text style={styles.sectionH2Em}>Built for</Text>
        <Text style={styles.sectionH2White}>real-time settlement</Text>

        <Text style={styles.sectionDesc}>
          Every payment runs through Monad's x402 protocol. Gas is covered by the facilitator — freelancers never pay network fees.
        </Text>

        {/* Dashboard Stack */}
        <View style={styles.dashboardStack}>
          {/* Main Feed Card */}
          <View style={styles.dashMainCard}>
            <View style={styles.dashHeaderRow}>
              <BrandMark compact />
              <Text style={styles.dashFeedTitle}>Live transaction feed · Envio</Text>
            </View>
            <View style={styles.metricWrap}>
              <Text style={styles.metricLabel}>Escrow locked</Text>
              <Text style={styles.metricAmount}>₹42,000</Text>
            </View>
            {/* 7 Vertical Indicator Bars */}
            <View style={styles.barsRow}>
              {[28, 42, 35, 62, 54, 79, 70].map((h, i) => (
                <View key={i} style={[styles.dashBar, { height: `${h}%` }]} />
              ))}
            </View>
          </View>

          {/* Dash Small Card */}
          <View style={styles.dashSmallCard}>
            <ShieldCheck size={20} color={Colors.mint} />
            <Text style={styles.dashSmallLabel}>Partial released (80%)</Text>
            <Text style={styles.dashSmallAmount}>₹33,600</Text>
          </View>

          {/* Dash Toolkit Grid */}
          <View style={styles.dashToolkitGrid}>
            {[
              ['Finality', '<1s'],
              ['Off-ramp', 'Onmeta'],
              ['Gas fees', '₹0'],
              ['Cash out', 'UPI'],
            ].map(([k, v]) => (
              <View key={k} style={styles.toolkitItem}>
                <Text style={styles.toolkitKey}>{k}</Text>
                <Text style={styles.toolkitVal}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 5. BUILT FOR TRUST & STATEMENT (Matching web .ambition & .statement) */}
      <View style={styles.ambitionSection}>
        <View style={styles.eyebrow}>
          <Sparkles size={11} color={Colors.mutedForeground} />
          <Text style={styles.eyebrowText}>BUILT FOR TRUST, NOT JUST SPEED</Text>
        </View>

        <Text style={styles.sectionH2Em}>At the core of NadRupee is</Text>
        <Text style={styles.sectionH2White}>a commitment to verifiable payments</Text>

        <View style={styles.growthCard}>
          <Text style={styles.growthTag}>LOG IN WITH A PASSKEY</Text>
          <Text style={styles.growthNumber}>0 seed phrases</Text>
          <Text style={styles.growthDesc}>
            Mera passkey identity, AUSD stablecoins by Agora, and licensed INR payouts to your bank via UPI.
          </Text>
        </View>

        <View style={styles.photoCard}>
          <Image
            source={require('../../assets/assets/freelancer-phone.jpg')}
            style={styles.photoImg}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* 6. STATEMENT BANNER */}
      <View style={styles.statementBanner}>
        <BrandMark compact />
        <Text style={styles.statementH2Em}>NadRupee — get paid your way:</Text>
        <Text style={styles.statementH2White}>
          payments that work the way freelancers actually need them to
        </Text>
        <Text style={styles.statementDesc}>
          A payments platform for Indian freelancers working with global clients — certainty before you start, instant payout after.
        </Text>
        <View style={styles.statementBtnRow}>
          <TouchableOpacity
            style={styles.actionBtnSmall}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onNavigateTab('freelancer');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtnDarkSmall}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onNavigateTab('client');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnDarkText}>Switch to Client</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 7. CLOSING BANNER */}
      <View style={styles.closingBanner}>
        <View style={styles.darkEyebrow}>
          <Sparkles size={11} color={Colors.mint} />
          <Text style={styles.darkEyebrowText}>EMPOWER YOUR WORK</Text>
        </View>
        <Text style={styles.closingH2White}>Get paid without the wait</Text>
        <Text style={styles.closingDesc}>
          Stop chasing invoices. Start getting paid the moment your work is funded.
        </Text>
        <View style={styles.statementBtnRow}>
          <TouchableOpacity
            style={styles.actionBtnSmall}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onNavigateTab('freelancer');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>Launch Freelancer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtnDarkSmall}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onNavigateTab('offramp');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnDarkText}>Instant INR Offramp</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 8. TRUSTED TALENT CATEGORIES */}
      <View style={styles.trustedSection}>
        <Text style={styles.trustedHeading}>Built for independent talent</Text>
        <Text style={styles.trustedSub}>working with global clients</Text>
        <View style={styles.talentPillsWrap}>
          {['Developers', 'Designers', 'Writers', 'Consultants', 'Remote contractors'].map((role) => (
            <View key={role} style={styles.talentPill}>
              <Text style={styles.talentPillText}>{role}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 9. MOBILE FOOTER */}
      <View style={styles.mobileFooter}>
        <View style={styles.footerBrandRow}>
          <BrandMark />
        </View>
        <Text style={styles.footerTagline}>
          Instant, escrow-backed payments for Indian freelancers — built on Monad Testnet.
        </Text>
        <View style={styles.footerLinksRow}>
          <TouchableOpacity onPress={() => onNavigateTab('freelancer')}>
            <Text style={styles.footerLink}>Freelancers</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity onPress={() => onNavigateTab('client')}>
            <Text style={styles.footerLink}>Clients</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity onPress={() => onNavigateTab('offramp')}>
            <Text style={styles.footerLink}>INR Off-ramp</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity onPress={() => onNavigateTab('protocol')}>
            <Text style={styles.footerLink}>Protocol Lab</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footerCopy}>© 2026 NadRupee · Monad Testnet</Text>
      </View>
    </ScrollView>

  );
};

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: Colors.night,
  },
  content: {
    paddingBottom: 110,
  },
  // 1. Hero
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
    alignItems: 'center',
    textAlign: 'center',
  },
  darkEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.25)',
    marginBottom: 20,
  },
  darkEyebrowText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(248, 250, 252, 0.75)',
    letterSpacing: 0.5,
  },
  eyebrowSub: {
    color: Colors.mutedForeground,
    marginLeft: 6,
  },
  heroHeadingWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heroH1Em: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '400',
    fontStyle: 'normal',
    color: 'rgba(248, 250, 252, 0.5)',
    textAlign: 'center',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    letterSpacing: -0.6,
  },
  heroH1White: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '500',
    color: Colors.paper,
    textAlign: 'center',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    letterSpacing: -0.6,
  },
  heroParagraph: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(248, 250, 252, 0.65)',
    textAlign: 'center',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    maxWidth: 340,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 280,
    marginBottom: 28,
  },
  actionBtn: {
    height: 44,
    width: '100%',
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: Colors.night,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  textLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  textLinkText: {
    color: 'rgba(248, 250, 252, 0.7)',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  heroProductWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 10,
  },
  radialGlow: {
    position: 'absolute',
    width: 260,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(56, 217, 169, 0.18)',
  },
  heroProductImg: {
    width: '100%',
    height: 220,
  },

  // 2. Key Features
  featuresSection: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionHeading: {
    marginBottom: 20,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.mutedForeground,
    letterSpacing: 0.5,
  },
  sectionH2Em: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '500',
    color: 'rgba(248, 250, 252, 0.5)',
  },
  sectionH2White: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '500',
    color: Colors.paper,
    marginBottom: 10,
  },
  sectionDesc: {
    fontSize: 13,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  photoCard: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  fundingCard: {
    backgroundColor: Colors.nightCard,
    borderWidth: 1,
    borderColor: Colors.nightCardBorder,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardH3: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.paper,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.mutedForeground,
    lineHeight: 16,
  },
  fundingWidget: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginTop: 18,
    alignItems: 'center',
  },
  widgetSub: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  widgetAmount: {
    fontSize: 32,
    fontWeight: '500',
    color: '#0f1718',
    marginVertical: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  rangeTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginTop: 8,
    position: 'relative',
  },
  rangeFill: {
    width: '80%',
    height: '100%',
    backgroundColor: Colors.mint,
    borderRadius: 2,
  },
  rangeLabelRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  rangeLabel: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: '600',
  },
  widgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f1718',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 18,
    marginTop: 16,
  },
  widgetBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  lifetimeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.nightSoft,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  lifetimeSub: {
    fontSize: 8,
    color: Colors.paperDim,
  },
  lifetimeAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.paper,
  },
  lifetimeMeter: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginLeft: 10,
    overflow: 'hidden',
  },
  lifetimeFill: {
    width: '80%',
    height: '100%',
    backgroundColor: Colors.mint,
  },

  // Risk card
  riskCard: {
    backgroundColor: Colors.nightCard,
    borderWidth: 1,
    borderColor: Colors.nightCardBorder,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTopline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toplineText: {
    fontSize: 8,
    color: Colors.mutedForeground,
    fontWeight: '700',
  },
  toplineTag: {
    fontSize: 8,
    color: Colors.paperDim,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  riskChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 180,
    gap: 8,
    marginVertical: 14,
  },
  riskCol: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    justifyContent: 'flex-start',
  },
  riskColPartial: {
    height: '58%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  riskColDanger: {
    height: '95%',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  riskColSafe: {
    height: '35%',
    backgroundColor: 'rgba(56, 217, 169, 0.1)',
    borderColor: 'rgba(56, 217, 169, 0.35)',
  },
  riskColB: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.paper,
  },
  riskColSpan: {
    fontSize: 7,
    color: Colors.paperDim,
    marginTop: 2,
    fontWeight: '600',
  },

  // 3. Industry
  industrySection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  foundersList: {
    gap: 14,
    marginTop: 14,
  },
  founderCard: {
    backgroundColor: Colors.nightCard,
    borderWidth: 1,
    borderColor: Colors.nightCardBorder,
    borderRadius: 14,
    overflow: 'hidden',
  },
  founderImg: {
    width: '100%',
    height: 160,
  },
  founderCaption: {
    padding: 16,
  },
  founderQuote: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.paper,
    marginBottom: 8,
  },
  founderName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.paper,
  },
  founderCo: {
    fontSize: 10,
    color: Colors.mutedForeground,
  },
  industryStatCard: {
    backgroundColor: Colors.nightSoft,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.nightCardBorder,
  },
  industryStatNumber: {
    fontSize: 36,
    fontWeight: '500',
    color: Colors.paper,
    marginBottom: 4,
  },
  industryStatDesc: {
    fontSize: 11,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },

  // 4. Platform
  platformSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  dashboardStack: {
    gap: 12,
    marginTop: 18,
  },
  dashMainCard: {
    backgroundColor: Colors.nightCard,
    borderWidth: 1,
    borderColor: Colors.nightCardBorder,
    borderRadius: 16,
    padding: 18,
  },
  dashHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  dashFeedTitle: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  metricWrap: {
    marginBottom: 14,
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
  },
  metricAmount: {
    fontSize: 32,
    fontWeight: '500',
    color: Colors.paper,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 70,
    gap: 6,
  },
  dashBar: {
    flex: 1,
    backgroundColor: Colors.mint,
    borderRadius: 2,
    opacity: 0.85,
  },
  dashSmallCard: {
    backgroundColor: Colors.nightCard,
    borderWidth: 1,
    borderColor: Colors.nightCardBorder,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dashSmallLabel: {
    fontSize: 11,
    color: Colors.mutedForeground,
    flex: 1,
  },
  dashSmallAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.paper,
  },
  dashToolkitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.nightCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.nightCardBorder,
    overflow: 'hidden',
  },
  toolkitItem: {
    width: '50%',
    padding: 14,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  toolkitKey: {
    fontSize: 9,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  toolkitVal: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.mintBright,
  },

  // 5. Ambition
  ambitionSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  growthCard: {
    backgroundColor: Colors.nightCard,
    borderWidth: 1,
    borderColor: Colors.nightCardBorder,
    borderRadius: 14,
    padding: 20,
    marginVertical: 14,
  },
  growthTag: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.mutedForeground,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  growthNumber: {
    fontSize: 26,
    fontWeight: '500',
    color: Colors.paper,
    marginBottom: 6,
  },
  growthDesc: {
    fontSize: 12,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },

  // 6. Statement
  statementBanner: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: Colors.nightCard,
    borderWidth: 1,
    borderColor: Colors.nightCardBorder,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    textAlign: 'center',
    gap: 8,
  },
  statementH2Em: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(248, 250, 252, 0.5)',
    textAlign: 'center',
  },
  statementH2White: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.paper,
    textAlign: 'center',
    lineHeight: 24,
  },
  statementDesc: {
    fontSize: 12,
    color: 'rgba(248, 250, 252, 0.65)',
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: 4,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  statementBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    width: '100%',
    justifyContent: 'center',
  },
  actionBtnSmall: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDarkSmall: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDarkText: {
    color: Colors.paper,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },

  // 7. Closing
  closingBanner: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: 'rgba(56, 217, 169, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.2)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    textAlign: 'center',
  },
  closingH2White: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
    color: Colors.paper,
    textAlign: 'center',
    marginBottom: 6,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  closingDesc: {
    fontSize: 12,
    color: 'rgba(248, 250, 252, 0.65)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },

  // 8. Trusted
  trustedSection: {
    marginTop: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  trustedHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.paper,
    textAlign: 'center',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  trustedSub: {
    fontSize: 11,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 12,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  talentPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  talentPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  talentPillText: {
    fontSize: 11,
    color: 'rgba(248, 250, 252, 0.8)',
    fontWeight: '600',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },

  // 9. Footer
  mobileFooter: {
    marginTop: 36,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  footerBrandRow: {
    alignItems: 'center',
  },
  footerTagline: {
    fontSize: 11,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    maxWidth: 280,
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  footerLink: {
    fontSize: 11,
    color: Colors.mint,
    fontWeight: '600',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  footerDot: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  footerCopy: {
    fontSize: 10,
    color: 'rgba(248, 250, 252, 0.35)',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    marginTop: 4,
  },
});

