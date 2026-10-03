import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAccount } from '../context/AccountContext';
import { CashoutModal } from '../components/CashoutModal';
import { JobState } from '../constants/config';
import * as Haptics from 'expo-haptics';
import {
  Banknote,
  Zap,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Briefcase,
  ShieldAlert,
  Sparkles,
} from 'lucide-react-native';

export const FreelancerScreen: React.FC = () => {
  const {
    address,
    isConnected,
    ausdBalance,
    fxRate,
    jobs,
    ledger,
    claimAdvance,
    connectTestnetPasskey,
  } = useAccount();

  const [cashoutVisible, setCashoutVisible] = useState<boolean>(false);
  const [claimingJobId, setClaimingJobId] = useState<string | null>(null);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<string | null>(null);

  const balanceInr = ausdBalance * fxRate;

  const handleClaim = async (jobId: string) => {
    setClaimingJobId(jobId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await claimAdvance(jobId);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setClaimSuccessMsg(`80% Advance claimed & deposited! Tx: ${res.txHash.slice(0, 10)}...`);
        setTimeout(() => setClaimSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setClaimingJobId(null);
    }
  };

  if (!isConnected || !address) {
    return (
      <View style={styles.authPromptContainer}>
        <Briefcase size={36} color={Colors.mint} />
        <Text style={styles.authPromptTitle}>Freelancer Escrow Portal</Text>
        <Text style={styles.authPromptSubtitle}>
          Connect your passkey to view funded contracts, claim your 80% advance without gas fees, and cash out to INR.
        </Text>
        <TouchableOpacity
          style={styles.connectPromptBtn}
          onPress={connectTestnetPasskey}
          activeOpacity={0.8}
        >
          <Zap size={16} color="#000" />
          <Text style={styles.connectPromptBtnText}>⚡ 1-Click Testnet Passkey</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. BALANCE HERO CARD */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>AVAILABLE ESCROW EARNINGS</Text>
          <View style={styles.ratePill}>
            <Text style={styles.ratePillText}>1 AUSD = ₹{fxRate.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.balanceUsd}>
          ${ausdBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
          <Text style={styles.currencyCode}>AUSD</Text>
        </Text>

        <Text style={styles.balanceInr}>
          ≈ ₹{balanceInr.toLocaleString('en-IN', { maximumFractionDigits: 2 })} INR
        </Text>

        {/* Quick action buttons */}
        <View style={styles.balanceActionsRow}>
          <TouchableOpacity
            style={styles.cashoutBtn}
            onPress={() => setCashoutVisible(true)}
            activeOpacity={0.8}
          >
            <Banknote size={15} color="#000" />
            <Text style={styles.cashoutBtnText}>Instant Cash Out to Bank</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Success Notification */}
      {claimSuccessMsg && (
        <View style={styles.alertSuccess}>
          <CheckCircle2 size={16} color={Colors.mint} />
          <Text style={styles.alertSuccessText}>{claimSuccessMsg}</Text>
        </View>
      )}

      {/* 2. ACTIVE ESCROWS & 80% ADVANCE SECTION */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Funded Contracts</Text>
            <Text style={styles.sectionSubtitle}>
              Locked on Monad testnet · 80% claimable immediately
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{jobs.length} Active</Text>
          </View>
        </View>

        <View style={styles.jobsList}>
          {jobs.map((job) => {
            const isFunded = job.state === JobState.Funded;
            const isPartial = job.state === JobState.PartiallyReleased;
            const isCompleted = job.state === JobState.Completed;
            const isClaiming = claimingJobId === job.id;

            return (
              <View key={job.id} style={styles.jobCard}>
                <View style={styles.jobTopRow}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <View
                    style={[
                      styles.statusChip,
                      isFunded && styles.statusFunded,
                      isPartial && styles.statusPartial,
                      isCompleted && styles.statusCompleted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        isFunded && styles.statusFundedText,
                        isPartial && styles.statusPartialText,
                        isCompleted && styles.statusCompletedText,
                      ]}
                    >
                      {isFunded ? 'Funded (Locked)' : isPartial ? '80% Claimed' : 'Completed'}
                    </Text>
                  </View>
                </View>

                {/* Amount splits */}
                <View style={styles.jobSplitsRow}>
                  <View>
                    <Text style={styles.splitLabel}>TOTAL ESCROW</Text>
                    <Text style={styles.splitValue}>${job.amountUsd} AUSD</Text>
                  </View>
                  <View>
                    <Text style={styles.splitLabel}>80% ADVANCE</Text>
                    <Text style={[styles.splitValue, { color: Colors.mintBright }]}>
                      ${job.partialAmountUsd} AUSD
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.splitLabel}>20% REMAINDER</Text>
                    <Text style={styles.splitValue}>${job.remainderAmountUsd} AUSD</Text>
                  </View>
                </View>

                {/* Claim CTA */}
                {isFunded && (
                  <TouchableOpacity
                    style={styles.claimBtn}
                    onPress={() => handleClaim(job.id)}
                    disabled={isClaiming}
                    activeOpacity={0.8}
                  >
                    {isClaiming ? (
                      <ActivityIndicator color={Colors.mint} />
                    ) : (
                      <>
                        <Zap size={14} color={Colors.mint} />
                        <Text style={styles.claimBtnText}>
                          Claim 80% Advance (${job.partialAmountUsd} AUSD) · 0 Gas
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {isPartial && (
                  <View style={styles.claimedNote}>
                    <CheckCircle2 size={13} color={Colors.mint} />
                    <Text style={styles.claimedNoteText}>
                      80% Advance transferred. 20% milestone unlock pending client review.
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* 3. TRANSACTION LEDGER */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        <Text style={styles.sectionSubtitle}>
          Real-time onchain claims and IMPS bank payouts
        </Text>

        <View style={styles.ledgerList}>
          {ledger.map((item) => (
            <View key={item.id} style={styles.ledgerCard}>
              <View style={styles.ledgerLeft}>
                <View
                  style={[
                    styles.ledgerIconWrap,
                    item.isCredit ? styles.ledgerIconCredit : styles.ledgerIconDebit,
                  ]}
                >
                  {item.isCredit ? (
                    <Zap size={14} color={Colors.mint} />
                  ) : (
                    <Banknote size={14} color={Colors.paper} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ledgerDesc} numberOfLines={1}>
                    {item.description}
                  </Text>
                  <View style={styles.ledgerMetaRow}>
                    <Text style={styles.ledgerTime}>{item.timestamp}</Text>
                    {item.referenceCode && (
                      <Text style={styles.ledgerRef}>Ref: {item.referenceCode}</Text>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.ledgerRight}>
                <Text
                  style={[
                    styles.ledgerAmount,
                    item.isCredit ? styles.ledgerAmountCredit : styles.ledgerAmountDebit,
                  ]}
                >
                  {item.isCredit ? '+' : '-'}₹{item.amountInr.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.ledgerUsd}>
                  {item.isCredit ? '+' : '-'}${item.amountUsd} AUSD
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Cashout Modal */}
      <CashoutModal
        visible={cashoutVisible}
        onClose={() => setCashoutVisible(false)}
        defaultAmount={Math.min(500, Math.floor(ausdBalance))}
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
  authPromptContainer: {
    flex: 1,
    backgroundColor: Colors.night,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  authPromptTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.paper,
  },
  authPromptSubtitle: {
    fontSize: 13,
    color: Colors.paperMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 10,
  },
  connectPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.mint,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  connectPromptBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  balanceCard: {
    backgroundColor: Colors.nightElevated,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: Colors.paperDim,
  },
  ratePill: {
    backgroundColor: Colors.nightSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
  },
  ratePillText: {
    color: Colors.mintBright,
    fontSize: 10,
    fontWeight: '700',
  },
  balanceUsd: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.paper,
    letterSpacing: -0.6,
  },
  currencyCode: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.mint,
  },
  balanceInr: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.paperMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  balanceActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cashoutBtn: {
    flex: 1,
    height: 46,
    backgroundColor: Colors.mint,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cashoutBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.mintSoft,
    borderWidth: 1,
    borderColor: Colors.mintBorder,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  alertSuccessText: {
    color: Colors.mintBright,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  },
  countBadge: {
    backgroundColor: Colors.nightSoft,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.paperMuted,
  },
  jobsList: {
    gap: 12,
  },
  jobCard: {
    backgroundColor: Colors.nightElevated,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  jobTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.paper,
    flex: 1,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusFunded: {
    backgroundColor: Colors.amberSoft,
    borderWidth: 1,
    borderColor: Colors.amber,
  },
  statusFundedText: {
    color: Colors.amber,
    fontSize: 10,
    fontWeight: '700',
  },
  statusPartial: {
    backgroundColor: Colors.mintSoft,
    borderWidth: 1,
    borderColor: Colors.mintBorder,
  },
  statusPartialText: {
    color: Colors.mintBright,
    fontSize: 10,
    fontWeight: '700',
  },
  statusCompleted: {
    backgroundColor: Colors.blueSoft,
    borderWidth: 1,
    borderColor: Colors.blue,
  },
  statusCompletedText: {
    color: Colors.blue,
    fontSize: 10,
    fontWeight: '700',
  },
  jobSplitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.nightSoft,
    padding: 10,
    borderRadius: 12,
  },
  splitLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.paperDim,
    marginBottom: 2,
  },
  splitValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.paper,
  },
  claimBtn: {
    height: 42,
    backgroundColor: Colors.mintSoft,
    borderWidth: 1,
    borderColor: Colors.mintBorder,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  claimBtnText: {
    color: Colors.mintBright,
    fontSize: 12,
    fontWeight: '800',
  },
  claimedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  claimedNoteText: {
    fontSize: 11,
    color: Colors.paperDim,
    flex: 1,
  },
  ledgerList: {
    gap: 8,
    marginTop: 10,
  },
  ledgerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.nightElevated,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 14,
    padding: 12,
  },
  ledgerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  ledgerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerIconCredit: {
    backgroundColor: Colors.mintSoft,
  },
  ledgerIconDebit: {
    backgroundColor: Colors.nightSoft,
  },
  ledgerDesc: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.paper,
  },
  ledgerMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  ledgerTime: {
    fontSize: 10,
    color: Colors.paperDim,
  },
  ledgerRef: {
    fontSize: 10,
    color: Colors.mint,
    fontFamily: 'monospace',
  },
  ledgerRight: {
    alignItems: 'flex-end',
  },
  ledgerAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  ledgerAmountCredit: {
    color: Colors.mintBright,
  },
  ledgerAmountDebit: {
    color: Colors.paperMuted,
  },
  ledgerUsd: {
    fontSize: 10,
    color: Colors.paperDim,
    marginTop: 1,
  },
});
