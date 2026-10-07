import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAccount } from '../context/AccountContext';
import { CashoutModal } from '../components/CashoutModal';
import { SendAusdModal } from '../components/SendAusdModal';
import { JobState, JOB_STATE_LABELS, ESCROW_CONTRACT_ADDRESS } from '../constants/config';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  Sparkles,
  Check,
  RefreshCw,
  Send,
  ExternalLink,
  ArrowRight,
} from 'lucide-react-native';
import { TabType } from '../components/BottomNav';

interface Props {
  onNavigateTab?: (tab: TabType) => void;
}

export const FreelancerScreen: React.FC<Props> = ({ onNavigateTab }) => {
  const {
    address,
    isConnected,
    ausdBalance,
    fxRate,
    jobs,
    ledger,
    claimAdvance,
    refreshAccountData,
  } = useAccount();

  const [cashoutVisible, setCashoutVisible] = useState<boolean>(false);
  const [sendAusdVisible, setSendAusdVisible] = useState<boolean>(false);
  const [claimingJobId, setClaimingJobId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<string | null>(null);

  const inrBalance = (ausdBalance * fxRate).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await refreshAccountData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClaim = async (jobId: string) => {
    setClaimingJobId(jobId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await claimAdvance(jobId);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setClaimSuccessMsg(`80% Advance claimed & deposited on Monad!`);
        setTimeout(() => setClaimSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setClaimingJobId(null);
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
      {/* 1. PORTAL HERO (Matching web .portal-hero) */}
      <View style={styles.portalHero}>
        <View style={styles.heroTopRow}>
          <View style={styles.darkEyebrow}>
            <Sparkles size={11} color={Colors.mint} />
            <Text style={styles.darkEyebrowText}>
              NADRUPEE · FREELANCER DASHBOARD <Text style={styles.eyebrowSub}>MONAD TESTNET</Text>
            </Text>
          </View>

          {onNavigateTab && (
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onNavigateTab('client');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.switchBtnText}>Switch to Client</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.portalH1Em}>Your earnings,</Text>
        <Text style={styles.portalH1White}>ready when you are.</Text>

        <Text style={styles.portalDesc}>
          Instant, escrow-backed payments settled in Agora AUSD on Monad Testnet and cashed out directly to your Indian bank account via UPI.
        </Text>
      </View>

      {/* Claim Success Banner */}
      {claimSuccessMsg && (
        <View style={styles.alertSuccess}>
          <Check size={14} color={Colors.mint} />
          <Text style={styles.alertSuccessText}>{claimSuccessMsg}</Text>
        </View>
      )}

      {/* 2. THREE TOP METRIC CARDS (Exact replica of web .portal-card) */}
      <View style={styles.cardsStack}>
        {/* Card 1: Available Earnings in INR */}
        <View style={styles.portalCard}>
          <View style={styles.portalCardHeader}>
            <Text style={styles.portalLabel}>AVAILABLE EARNINGS</Text>
            <View style={styles.badgeMint}>
              <Check size={10} color={Colors.mintBright} />
              <Text style={styles.badgeMintText}>Real-time Quote</Text>
            </View>
          </View>

          <View style={styles.metricBlock}>
            <Text style={styles.metricSubhead}>Estimated Value in INR</Text>
            <Text style={styles.metricBigNumber}>₹{inrBalance}</Text>
          </View>

          <View style={styles.cardFooterRow}>
            <View>
              <Text style={styles.footerSubhead}>ON-CHAIN BALANCE</Text>
              <Text style={styles.footerBalanceMint}>
                {ausdBalance.toFixed(2)} AUSD
              </Text>
            </View>

            <View style={styles.footerActions}>
              <TouchableOpacity
                style={styles.actionBtnDark}
                onPress={() => setSendAusdVisible(true)}
                activeOpacity={0.8}
              >
                <Send size={12} color={Colors.paper} />
                <Text style={styles.actionBtnDarkText}>Send AUSD</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setCashoutVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnText}>Cash Out (OnMeta)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Card 2: USD / INR Exchange Rate */}
        <View style={styles.portalCard}>
          <View style={styles.portalCardHeader}>
            <Text style={styles.portalLabel}>USD / INR EXCHANGE RATE</Text>
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={isRefreshing}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              activeOpacity={0.7}
            >
              <RefreshCw size={11} color={Colors.mutedForeground} />
              <Text style={styles.refreshText}>{isRefreshing ? 'Updating...' : 'Refresh'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metricBlock}>
            <Text style={styles.metricSubhead}>Guaranteed Cashout Rate</Text>
            <Text style={[styles.metricBigNumber, { color: Colors.mint }]}>
              1 USD = ₹{fxRate.toFixed(2)}
            </Text>
          </View>

          <View style={styles.cardNoteRow}>
            <Text style={styles.cardNoteText}>
              Source: Open Exchange Rates API (strictly event-driven, zero synthetic ticks)
            </Text>
          </View>
        </View>

        {/* Card 3: Security & Protocol */}
        <View style={styles.portalCard}>
          <View style={styles.portalCardHeader}>
            <Text style={styles.portalLabel}>SECURITY & PROTOCOL</Text>
            <View style={styles.badgeMuted}>
              <Text style={styles.badgeMutedText}>Facilitator Active</Text>
            </View>
          </View>

          <View style={styles.securityStack}>
            <View>
              <Text style={styles.securityKey}>PASSKEY IDENTITY</Text>
              <Text style={styles.securityVal}>
                {isConnected ? 'Mera Biometric Passkey' : 'Unconnected'}
              </Text>
            </View>

            <View>
              <Text style={styles.securityKey}>GAS FEES</Text>
              <Text style={[styles.securityVal, { color: Colors.mintBright }]}>
                ₹0 — Sponsored by Monad Facilitator
              </Text>
            </View>

            <View style={styles.contractRow}>
              <Text style={styles.contractLabel}>Smart Contract:</Text>
              <Text style={styles.contractCode}>
                {ESCROW_CONTRACT_ADDRESS.slice(0, 8)}...{ESCROW_CONTRACT_ADDRESS.slice(-6)}
              </Text>
              <ExternalLink size={10} color={Colors.mutedForeground} />
            </View>
          </View>
        </View>
      </View>

      {/* 3. CONTRACT ESCROWS (Matching web active jobs card) */}
      <View style={[styles.portalCard, { marginTop: 20 }]}>
        <View style={styles.portalCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionH2Em}>
              Contract Escrows <Text style={styles.sectionH2White}>({jobs.length})</Text>
            </Text>
            <Text style={styles.sectionSubDesc}>
              Jobs where your address is the designated freelancer. Funds are locked by the client before you begin work.
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={isRefreshing}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 }}
            activeOpacity={0.7}
          >
            <RefreshCw size={11} color={Colors.mutedForeground} />
            <Text style={styles.refreshText}>{isRefreshing ? '...' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.jobsList}>
          {jobs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                No active job escrows found for your address yet.
              </Text>
              <Text style={styles.emptyText}>
                When a client creates and funds a job in the Client Portal, it will appear here immediately.
              </Text>
              {onNavigateTab && (
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onNavigateTab('client');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyActionBtnText}>Switch to Client Portal</Text>
                  <ArrowRight size={12} color={Colors.night} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            jobs.map((job) => {
              const totalInr = (job.amountUsd * fxRate).toLocaleString('en-IN');
              const advanceInr = (job.partialAmountUsd * fxRate).toLocaleString('en-IN');
              const isFunded = job.state === JobState.Funded;
              const isPartial = job.state === JobState.PartiallyReleased;
              const isCompleted = job.state === JobState.Completed;
              const isClaiming = claimingJobId === job.id;

              return (
                <View key={job.id} style={styles.jobItemCard}>
                  <View style={styles.jobItemTop}>
                    <Text style={styles.jobItemTitle}>{job.title}</Text>
                    <View
                      style={[
                        styles.stateBadge,
                        isCompleted || isPartial ? styles.badgeMint : styles.badgeMuted,
                      ]}
                    >
                      <Text
                        style={
                          isCompleted || isPartial ? styles.badgeMintText : styles.badgeMutedText
                        }
                      >
                        {JOB_STATE_LABELS[job.state]}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.jobItemMeta}>
                    <Text style={styles.jobItemMetaText}>
                      Client: <Text style={{ color: Colors.paper }}>{job.client.slice(0, 6)}...{job.client.slice(-4)}</Text>
                    </Text>
                    <Text style={styles.jobItemMetaText}>
                      Total: <Text style={{ color: Colors.paper, fontWeight: '700' }}>₹{totalInr} ({job.amountUsd} AUSD)</Text>
                    </Text>
                    <Text style={styles.jobItemMetaText}>
                      80% Advance: ₹{advanceInr}
                    </Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.jobActionsRow}>
                    {isFunded && (
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleClaim(job.id)}
                        disabled={isClaiming}
                        activeOpacity={0.8}
                      >
                        {isClaiming ? (
                          <ActivityIndicator color={Colors.night} />
                        ) : (
                          <Text style={styles.actionBtnText}>Claim 80% Instant Payout</Text>
                        )}
                      </TouchableOpacity>
                    )}

                    {isPartial && (
                      <View style={styles.claimedRow}>
                        <Check size={13} color={Colors.mintBright} />
                        <Text style={styles.claimedText}>80% Advance Deposited</Text>
                      </View>
                    )}

                    {isCompleted && (
                      <View style={styles.claimedRow}>
                        <Check size={13} color={Colors.mintBright} />
                        <Text style={styles.claimedText}>100% Payout Finalized</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>

      {/* 4. TRANSACTION LEDGER */}
      <View style={[styles.portalCard, { marginTop: 20 }]}>
        <View style={styles.portalCardHeader}>
          <Text style={styles.sectionH2Em}>
            Ledger & Activity <Text style={styles.sectionH2White}>({ledger.length})</Text>
          </Text>
        </View>

        <View style={styles.ledgerList}>
          {ledger.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No transactions recorded yet. Activity will appear after payouts or settlements.
              </Text>
            </View>
          ) : (
            ledger.map((item) => (
              <View key={item.id} style={styles.ledgerItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ledgerItemDesc}>{item.description}</Text>
                  <View style={styles.ledgerMeta}>
                    <Text style={styles.ledgerTime}>{item.timestamp}</Text>
                    {item.referenceCode && (
                      <Text style={styles.ledgerUtr}>UTR: {item.referenceCode}</Text>
                    )}
                    {item.onchainTxHash && (
                      <TouchableOpacity
                        onPress={async () => {
                          await Clipboard.setStringAsync(item.onchainTxHash!);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }}
                        style={styles.ledgerTxBadge}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.ledgerTxText}>
                          Tx: {item.onchainTxHash.slice(0, 6)}...{item.onchainTxHash.slice(-4)}
                        </Text>
                        <ExternalLink size={9} color={Colors.mint} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={[
                      styles.ledgerAmount,
                      item.isCredit ? styles.amountCredit : styles.amountDebit,
                    ]}
                  >
                    {item.isCredit ? '+' : '-'}₹{item.amountInr.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.ledgerUsd}>
                    {item.isCredit ? '+' : '-'}${item.amountUsd} AUSD
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Cashout Modal */}
      <CashoutModal
        visible={cashoutVisible}
        onClose={() => setCashoutVisible(false)}
        defaultAmount={Math.min(500, Math.floor(ausdBalance))}
      />

      {/* Send AUSD Modal */}
      <SendAusdModal
        visible={sendAusdVisible}
        onClose={() => setSendAusdVisible(false)}
        defaultAmount={Math.min(50, Math.floor(ausdBalance))}
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
  darkEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.25)',
    backgroundColor: 'rgba(56, 217, 169, 0.08)',
  },
  darkEyebrowText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(248, 250, 252, 0.75)',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    letterSpacing: 0.5,
  },
  eyebrowSub: {
    color: Colors.mutedForeground,
    marginLeft: 4,
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
  portalH1Em: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '400',
    fontStyle: 'normal',
    color: 'rgba(248, 250, 252, 0.50)',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    letterSpacing: -0.6,
  },
  portalH1White: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '500',
    color: Colors.paper,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  portalDesc: {
    fontSize: 13,
    color: 'rgba(248, 250, 252, 0.65)',
    lineHeight: 18,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    maxWidth: 380,
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 217, 169, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.3)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  alertSuccessText: {
    color: Colors.paper,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    flex: 1,
  },
  cardsStack: {
    gap: 16,
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
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  badgeMint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 217, 169, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.25)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeMintText: {
    color: Colors.mintBright,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  badgeMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeMutedText: {
    color: 'rgba(248, 250, 252, 0.7)',
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  refreshText: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  metricBlock: {
    marginBottom: 16,
  },
  metricSubhead: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    marginBottom: 4,
  },
  metricBigNumber: {
    fontSize: 38,
    fontWeight: '500',
    color: Colors.paper,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    letterSpacing: -0.8,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 14,
    flexWrap: 'wrap',
    gap: 10,
  },
  footerSubhead: {
    fontSize: 9,
    color: Colors.mutedForeground,
    fontWeight: '700',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    letterSpacing: 0.5,
  },
  footerBalanceMint: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.mintBright,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    marginTop: 2,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: Colors.night,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  actionBtnDark: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnDarkText: {
    color: Colors.paper,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  cardNoteRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
  },
  cardNoteText: {
    fontSize: 10,
    color: Colors.mutedForeground,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    lineHeight: 14,
  },
  securityStack: {
    gap: 10,
  },
  securityKey: {
    fontSize: 9,
    color: Colors.mutedForeground,
    fontWeight: '700',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    letterSpacing: 0.5,
  },
  securityVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.paper,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    marginTop: 2,
  },
  contractRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 8,
    marginTop: 4,
  },
  contractLabel: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  contractCode: {
    fontSize: 11,
    color: Colors.paper,
    fontFamily: 'monospace',
  },

  // Jobs
  sectionH2Em: {
    fontSize: 17,
    fontWeight: '400',
    fontStyle: 'normal',
    color: 'rgba(248, 250, 252, 0.5)',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  sectionH2White: {
    fontSize: 17,
    fontWeight: '500',
    color: Colors.paper,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  sectionSubDesc: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    marginTop: 4,
    lineHeight: 15,
  },
  jobsList: {
    gap: 12,
  },
  jobItemCard: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    gap: 10,
  },
  jobItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.paper,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    flex: 1,
    marginRight: 8,
  },
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
  },
  jobItemMeta: {
    gap: 3,
  },
  jobItemMetaText: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  jobActionsRow: {
    paddingTop: 4,
  },
  claimedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  claimedText: {
    fontSize: 11,
    color: Colors.mintBright,
    fontWeight: '600',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },

  // Ledger
  ledgerList: {
    gap: 10,
  },
  ledgerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  ledgerItemDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.paper,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  ledgerMeta: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 3,
  },
  ledgerTime: {
    fontSize: 10,
    color: Colors.mutedForeground,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  ledgerUtr: {
    fontSize: 10,
    color: Colors.mint,
    fontFamily: 'monospace',
  },
  ledgerTxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(56, 217, 169, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ledgerTxText: {
    fontSize: 9,
    color: Colors.mint,
    fontFamily: 'monospace',
  },
  ledgerAmount: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  amountCredit: {
    color: Colors.mintBright,
  },
  amountDebit: {
    color: Colors.paperMuted,
  },
  ledgerUsd: {
    fontSize: 10,
    color: Colors.paperDim,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    marginTop: 1,
  },
  emptyContainer: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.paper,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 320,
  },
  emptyActionBtn: {
    marginTop: 14,
    paddingHorizontal: 18,
    height: 38,
    borderRadius: 999,
    backgroundColor: Colors.paper,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyActionBtnText: {
    color: Colors.night,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
});
