import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Colors } from '../theme/colors';
import {
  EscrowJobItem,
  JobState,
  JOB_STATE_LABELS,
  ESCROW_CONTRACT_ADDRESS,
} from '../constants/config';
import { getMonadAddressExplorerUrl, getMonadTxExplorerUrl } from '../services/monadRpc';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  X,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  Lock,
  CheckCircle2,
  Clock,
  ArrowRight,
  Send,
  Sparkles,
} from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  job: EscrowJobItem | null;
  fxRate: number;
  isFreelancerView: boolean;
  onClaimAdvance?: (jobId: string) => Promise<{ success: boolean; txHash: string }>;
  onReleaseRemainder?: (jobId: string) => Promise<{ success: boolean; txHash: string }>;
  onOpenSendAusd?: (recipient: string, amount: number) => void;
}

export const JobDetailsModal: React.FC<Props> = ({
  visible,
  onClose,
  job,
  fxRate,
  isFreelancerView,
  onClaimAdvance,
  onReleaseRemainder,
  onOpenSendAusd,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  if (!job) return null;

  const totalInr = (job.amountUsd * fxRate).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });
  const partialInr = (job.partialAmountUsd * fxRate).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });
  const remainderInr = (job.remainderAmountUsd * fxRate).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });

  const isFunded = job.state === JobState.Funded;
  const isPartial = job.state === JobState.PartiallyReleased;
  const isCompleted = job.state === JobState.Completed;

  const handleCopy = async (key: string, text: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenExplorer = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url).catch((err) =>
      console.warn('Could not open Monad explorer URL:', err)
    );
  };

  const handleClaim = async () => {
    if (!onClaimAdvance) return;
    setIsProcessing(true);
    setActionErrorMsg(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await onClaimAdvance(job.id);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setActionSuccessMsg('80% Advance claimed successfully on Monad Testnet!');
        setTimeout(() => setActionSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setActionErrorMsg(err?.message || 'Failed to claim advance.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRelease = async () => {
    if (!onReleaseRemainder) return;
    setIsProcessing(true);
    setActionErrorMsg(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await onReleaseRemainder(job.id);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setActionSuccessMsg('Milestone confirmed! 20% remainder settled.');
        setTimeout(() => setActionSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setActionErrorMsg(err?.message || 'Failed to release remainder.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <ShieldCheck size={18} color={Colors.mint} />
              <Text style={styles.headerTitle}>Escrow Job #{job.id}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color={Colors.paperMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Top State Badge & Title */}
            <View style={styles.topInfo}>
              <View style={styles.stateRow}>
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
                <Text style={styles.createdTime}>{job.createdAt || 'Active'}</Text>
              </View>

              <Text style={styles.jobTitle}>{job.title}</Text>
            </View>

            {/* Success or Error Banners */}
            {actionSuccessMsg && (
              <View style={styles.successBanner}>
                <Check size={14} color={Colors.mintBright} />
                <Text style={styles.successBannerText}>{actionSuccessMsg}</Text>
              </View>
            )}

            {actionErrorMsg && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{actionErrorMsg}</Text>
              </View>
            )}

            {/* Financial Overview Card */}
            <View style={styles.financialCard}>
              <Text style={styles.cardHeaderLabel}>ESCROW VALUATION</Text>
              <View style={styles.amountBigRow}>
                <Text style={styles.amountBigInr}>₹{totalInr}</Text>
                <Text style={styles.amountBigUsd}>${job.amountUsd.toFixed(2)} AUSD</Text>
              </View>

              <View style={styles.splitsGrid}>
                {/* 80% Advance */}
                <View style={styles.splitBox}>
                  <View style={styles.splitHeaderRow}>
                    <Text style={styles.splitSub}>80% ADVANCE</Text>
                    {isPartial || isCompleted ? (
                      <View style={styles.miniTagMint}>
                        <Check size={9} color={Colors.mintBright} />
                        <Text style={styles.miniTagMintText}>Paid</Text>
                      </View>
                    ) : (
                      <View style={styles.miniTagYellow}>
                        <Text style={styles.miniTagYellowText}>Ready</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.splitValInr}>₹{partialInr}</Text>
                  <Text style={styles.splitValUsd}>${job.partialAmountUsd.toFixed(2)} AUSD</Text>
                </View>

                {/* 20% Remainder */}
                <View style={styles.splitBox}>
                  <View style={styles.splitHeaderRow}>
                    <Text style={styles.splitSub}>20% MILESTONE</Text>
                    {isCompleted ? (
                      <View style={styles.miniTagMint}>
                        <Check size={9} color={Colors.mintBright} />
                        <Text style={styles.miniTagMintText}>Paid</Text>
                      </View>
                    ) : (
                      <View style={styles.miniTagMuted}>
                        <Lock size={9} color={Colors.paperDim} />
                        <Text style={styles.miniTagMutedText}>Locked</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.splitValInr}>₹{remainderInr}</Text>
                  <Text style={styles.splitValUsd}>${job.remainderAmountUsd.toFixed(2)} AUSD</Text>
                </View>
              </View>
            </View>

            {/* Counterparty Addresses Card */}
            <View style={styles.partiesCard}>
              <Text style={styles.cardHeaderLabel}>ESCROW PARTICIPANTS</Text>

              {/* Client Address */}
              <View style={styles.partyRow}>
                <View>
                  <Text style={styles.partyRole}>CLIENT</Text>
                  <Text style={styles.partyAddress}>
                    {job.client.slice(0, 10)}...{job.client.slice(-8)}
                  </Text>
                </View>
                <View style={styles.partyActions}>
                  <TouchableOpacity
                    onPress={() => handleCopy('client', job.client)}
                    style={styles.iconActionBtn}
                    activeOpacity={0.7}
                  >
                    {copiedKey === 'client' ? (
                      <Check size={12} color={Colors.mint} />
                    ) : (
                      <Copy size={12} color={Colors.paperDim} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleOpenExplorer(getMonadAddressExplorerUrl(job.client))}
                    style={styles.iconActionBtn}
                    activeOpacity={0.7}
                  >
                    <ExternalLink size={12} color={Colors.mint} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.separator} />

              {/* Freelancer Address */}
              <View style={styles.partyRow}>
                <View>
                  <Text style={styles.partyRole}>FREELANCER</Text>
                  <Text style={styles.partyAddress}>
                    {job.freelancer.slice(0, 10)}...{job.freelancer.slice(-8)}
                  </Text>
                </View>
                <View style={styles.partyActions}>
                  <TouchableOpacity
                    onPress={() => handleCopy('freelancer', job.freelancer)}
                    style={styles.iconActionBtn}
                    activeOpacity={0.7}
                  >
                    {copiedKey === 'freelancer' ? (
                      <Check size={12} color={Colors.mint} />
                    ) : (
                      <Copy size={12} color={Colors.paperDim} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleOpenExplorer(getMonadAddressExplorerUrl(job.freelancer))}
                    style={styles.iconActionBtn}
                    activeOpacity={0.7}
                  >
                    <ExternalLink size={12} color={Colors.mint} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Protocol Lifecycle Stepper */}
            <View style={styles.timelineCard}>
              <Text style={styles.cardHeaderLabel}>LIFECYCLE STATUS</Text>

              {/* Step 1 */}
              <View style={styles.stepItem}>
                <View style={styles.stepDotActive}>
                  <Check size={10} color={Colors.night} />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>1. Funded & Locked in Escrow</Text>
                  <Text style={styles.stepSub}>
                    Client deposited ${job.amountUsd} AUSD into Monad Escrow Contract.
                  </Text>
                </View>
              </View>

              {/* Step 2 */}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    (isPartial || isCompleted) && styles.stepDotActive,
                  ]}
                >
                  {isPartial || isCompleted ? (
                    <Check size={10} color={Colors.night} />
                  ) : (
                    <Clock size={10} color={Colors.paperDim} />
                  )}
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>2. 80% Instant Advance Payout</Text>
                  <Text style={styles.stepSub}>
                    {isPartial || isCompleted
                      ? '₹' + partialInr + ' released to freelancer with ₹0 gas fee.'
                      : 'Freelancer can claim ₹' + partialInr + ' immediately.'}
                  </Text>
                </View>
              </View>

              {/* Step 3 */}
              <View style={styles.stepItem}>
                <View
                  style={[styles.stepDot, isCompleted && styles.stepDotActive]}
                >
                  {isCompleted ? (
                    <Check size={10} color={Colors.night} />
                  ) : (
                    <Lock size={10} color={Colors.paperDim} />
                  )}
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>3. 20% Milestone Remainder</Text>
                  <Text style={styles.stepSub}>
                    {isCompleted
                      ? 'Milestone completed and ₹' + remainderInr + ' finalized.'
                      : 'Client confirms deliverable to release final ₹' + remainderInr + '.'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Smart Contract Deep Link */}
            <TouchableOpacity
              onPress={() => handleOpenExplorer(getMonadAddressExplorerUrl(ESCROW_CONTRACT_ADDRESS))}
              style={styles.contractLinkRow}
              activeOpacity={0.7}
            >
              <Text style={styles.contractLinkText}>
                Escrow Contract: {ESCROW_CONTRACT_ADDRESS.slice(0, 10)}...{ESCROW_CONTRACT_ADDRESS.slice(-6)}
              </Text>
              <ExternalLink size={12} color={Colors.mint} />
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.actionButtonsWrap}>
              {/* Freelancer Action: Claim Advance */}
              {isFreelancerView && isFunded && onClaimAdvance && (
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={handleClaim}
                  disabled={isProcessing}
                  activeOpacity={0.8}
                >
                  {isProcessing ? (
                    <ActivityIndicator color={Colors.night} />
                  ) : (
                    <>
                      <Sparkles size={14} color={Colors.night} />
                      <Text style={styles.primaryActionBtnText}>
                        Claim 80% Payout (₹{partialInr})
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Client Action: Release Remainder */}
              {!isFreelancerView && isPartial && onReleaseRemainder && (
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={handleRelease}
                  disabled={isProcessing}
                  activeOpacity={0.8}
                >
                  {isProcessing ? (
                    <ActivityIndicator color={Colors.night} />
                  ) : (
                    <>
                      <CheckCircle2 size={14} color={Colors.night} />
                      <Text style={styles.primaryActionBtnText}>
                        Approve Milestone & Release 20% (₹{remainderInr})
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Direct Send AUSD shortcut */}
              {onOpenSendAusd && (
                <TouchableOpacity
                  style={styles.secondaryActionBtn}
                  onPress={() => {
                    const counterparty = isFreelancerView ? job.client : job.freelancer;
                    onClose();
                    onOpenSendAusd(counterparty, 50);
                  }}
                  activeOpacity={0.8}
                >
                  <Send size={13} color={Colors.paper} />
                  <Text style={styles.secondaryActionBtnText}>
                    Send AUSD to {isFreelancerView ? 'Client' : 'Freelancer'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.nightCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '92%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.paper,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  topInfo: {
    marginBottom: 16,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stateBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  badgeMint: {
    backgroundColor: 'rgba(56, 217, 169, 0.15)',
  },
  badgeMintText: {
    color: Colors.mintBright,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeMutedText: {
    color: Colors.paperDim,
    fontSize: 11,
    fontWeight: '600',
  },
  createdTime: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.paper,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 217, 169, 0.12)',
    borderColor: 'rgba(56, 217, 169, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  successBannerText: {
    color: Colors.mintBright,
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  financialCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: Colors.paperMuted,
    marginBottom: 8,
  },
  amountBigRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 14,
  },
  amountBigInr: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.paper,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  amountBigUsd: {
    fontSize: 14,
    color: Colors.mintBright,
    fontWeight: '600',
  },
  splitsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  splitBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  splitHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  splitSub: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.paperDim,
    letterSpacing: 0.5,
  },
  miniTagMint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(56, 217, 169, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 6,
  },
  miniTagMintText: {
    color: Colors.mintBright,
    fontSize: 9,
    fontWeight: '700',
  },
  miniTagYellow: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 6,
  },
  miniTagYellowText: {
    color: '#facc15',
    fontSize: 9,
    fontWeight: '700',
  },
  miniTagMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 6,
  },
  miniTagMutedText: {
    color: Colors.paperDim,
    fontSize: 9,
    fontWeight: '600',
  },
  splitValInr: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.paper,
  },
  splitValUsd: {
    fontSize: 11,
    color: Colors.paperDim,
    marginTop: 2,
  },
  partiesCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partyRole: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: Colors.paperMuted,
  },
  partyAddress: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: Colors.paper,
    fontWeight: '600',
    marginTop: 2,
  },
  partyActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconActionBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 10,
  },
  timelineCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepDotActive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.mintBright,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.paper,
  },
  stepSub: {
    fontSize: 11,
    color: Colors.paperDim,
    marginTop: 2,
  },
  contractLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 16,
  },
  contractLinkText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: Colors.mint,
  },
  actionButtonsWrap: {
    gap: 10,
    marginBottom: 20,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.mintBright,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryActionBtnText: {
    color: Colors.night,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 13,
    borderRadius: 14,
  },
  secondaryActionBtnText: {
    color: Colors.paper,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
});
