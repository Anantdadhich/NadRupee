import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAccount } from '../context/AccountContext';
import { KNOWN_FREELANCERS, JobState, JOB_STATE_LABELS } from '../constants/config';
import * as Haptics from 'expo-haptics';
import {
  Sparkles,
  Check,
  RefreshCw,
  ExternalLink,
} from 'lucide-react-native';

export const ClientScreen: React.FC = () => {
  const { jobs, createJob, releaseRemainder, fxRate } = useAccount();

  const [freelancerInput, setFreelancerInput] = useState<string>('@arjun.monad');
  const [jobTitle, setJobTitle] = useState<string>('Smart Contract Security Audit & Integration');
  const [amountStr, setAmountStr] = useState<string>('1000');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [actionJobId, setActionJobId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const amountUsd = parseFloat(amountStr) || 0;
  const partialAdvanceUsd = amountUsd * 0.8;
  const remainderUsd = amountUsd * 0.2;

  const resolvedAddress =
    KNOWN_FREELANCERS[freelancerInput.trim().toLowerCase()] || freelancerInput.trim();

  const handleCreateJob = async () => {
    if (amountUsd <= 0 || !jobTitle.trim() || !freelancerInput.trim()) {
      return;
    }
    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await createJob(jobTitle.trim(), resolvedAddress, amountUsd);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setFeedbackMsg(`Escrow #${res.jobId} created & funded on Monad Testnet!`);
        setTimeout(() => setFeedbackMsg(null), 4000);
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleReleaseRemainder = async (jobId: string) => {
    setActionJobId(jobId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await releaseRemainder(jobId);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setFeedbackMsg(`Milestone confirmed! 20% remainder settled to freelancer.`);
        setTimeout(() => setFeedbackMsg(null), 4000);
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setActionJobId(null);
    }
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
            NADRUPEE · CLIENT ESCROW PORTAL <Text style={styles.eyebrowSub}>MONAD TESTNET</Text>
          </Text>
        </View>

        <Text style={styles.portalH1Em}>Fund work with certainty.</Text>
        <Text style={styles.portalH1White}>Zero dispute risk.</Text>

        <Text style={styles.portalDesc}>
          Deposit and lock Agora AUSD into on-chain escrow to guarantee payments for Indian freelancers. 80% is unlocked when confirmed; 20% remainder upon milestone approval.
        </Text>
      </View>

      {/* Success Notification */}
      {feedbackMsg && (
        <View style={styles.alertSuccess}>
          <Check size={14} color={Colors.mint} />
          <Text style={styles.alertSuccessText}>{feedbackMsg}</Text>
        </View>
      )}

      {/* 2. CREATE ESCROW CARD */}
      <View style={styles.portalCard}>
        <View style={styles.portalCardHeader}>
          <Text style={styles.portalLabel}>CREATE & FUND ESCROW JOB</Text>
        </View>

        {/* Freelancer Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>FREELANCER HANDLE OR ADDRESS</Text>
          <TextInput
            style={styles.portalInput}
            value={freelancerInput}
            onChangeText={setFreelancerInput}
            placeholder="@arjun.monad or 0x..."
            placeholderTextColor="rgba(248, 250, 252, 0.3)"
            autoCapitalize="none"
          />
          {KNOWN_FREELANCERS[freelancerInput.trim().toLowerCase()] && (
            <Text style={styles.resolvedText}>
              ✓ {KNOWN_FREELANCERS[freelancerInput.trim().toLowerCase()].slice(0, 16)}...
            </Text>
          )}
        </View>

        {/* Deliverable Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>DELIVERABLE / JOB TITLE</Text>
          <TextInput
            style={styles.portalInput}
            value={jobTitle}
            onChangeText={setJobTitle}
            placeholder="e.g. Smart Contract Security Audit"
            placeholderTextColor="rgba(248, 250, 252, 0.3)"
          />
        </View>

        {/* Amount */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>DEPOSIT AMOUNT (AUSD)</Text>
          <View style={styles.amountWrap}>
            <TextInput
              style={styles.amountInput}
              value={amountStr}
              onChangeText={setAmountStr}
              keyboardType="numeric"
              placeholder="1000"
              placeholderTextColor="rgba(248, 250, 252, 0.3)"
            />
            <Text style={styles.amountSuffix}>AUSD</Text>
          </View>
        </View>

        {/* Splits Info */}
        <View style={styles.splitsCard}>
          <View>
            <Text style={styles.splitsSub}>80% ADVANCE</Text>
            <Text style={styles.splitsValMint}>${partialAdvanceUsd.toFixed(0)} AUSD</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.splitsSub}>20% REMAINDER</Text>
            <Text style={styles.splitsVal}>${remainderUsd.toFixed(0)} AUSD</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleCreateJob}
          disabled={isCreating}
          activeOpacity={0.8}
        >
          {isCreating ? (
            <ActivityIndicator color={Colors.night} />
          ) : (
            <Text style={styles.actionBtnText}>
              Deposit & Lock ${amountUsd} AUSD in Escrow
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 3. ACTIVE ESCROWS LIST */}
      <View style={[styles.portalCard, { marginTop: 24 }]}>
        <View style={styles.portalCardHeader}>
          <Text style={styles.sectionH2Em}>
            Created Escrows <Text style={styles.sectionH2White}>({jobs.length})</Text>
          </Text>
        </View>

        <View style={styles.jobsList}>
          {jobs.map((job) => {
            const isFunded = job.state === JobState.Funded;
            const isPartial = job.state === JobState.PartiallyReleased;
            const isCompleted = job.state === JobState.Completed;
            const isActing = actionJobId === job.id;

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
                    Freelancer: <Text style={{ color: Colors.paper }}>{job.freelancer.slice(0, 6)}...{job.freelancer.slice(-4)}</Text>
                  </Text>
                  <Text style={styles.jobItemMetaText}>
                    Total Locked: <Text style={{ color: Colors.paper, fontWeight: '700' }}>${job.amountUsd} AUSD</Text>
                  </Text>
                </View>

                {isPartial && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleReleaseRemainder(job.id)}
                    disabled={isActing}
                    activeOpacity={0.8}
                  >
                    {isActing ? (
                      <ActivityIndicator color={Colors.night} />
                    ) : (
                      <Text style={styles.actionBtnText}>
                        Approve Milestone & Release 20% (${job.remainderAmountUsd} AUSD)
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                {isCompleted && (
                  <View style={styles.claimedRow}>
                    <Check size={13} color={Colors.mintBright} />
                    <Text style={styles.claimedText}>Milestone Settled 100%</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
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
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 217, 169, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.3)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 18,
  },
  alertSuccessText: {
    color: Colors.paper,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
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
  portalInput: {
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: Colors.paper,
    fontSize: 13,
  },
  resolvedText: {
    fontSize: 11,
    color: Colors.mintBright,
    marginTop: 4,
    fontWeight: '500',
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
    fontSize: 14,
    fontWeight: '600',
  },
  amountSuffix: {
    color: Colors.mint,
    fontSize: 12,
    fontWeight: '600',
  },
  splitsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
  },
  splitsSub: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.mutedForeground,
    letterSpacing: 0.5,
  },
  splitsValMint: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.mintBright,
    marginTop: 2,
  },
  splitsVal: {
    fontSize: 13,
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
    flex: 1,
    marginRight: 8,
  },
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
  },
  badgeMint: {
    backgroundColor: 'rgba(56, 217, 169, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.25)',
  },
  badgeMintText: {
    color: Colors.mintBright,
    fontSize: 10,
    fontWeight: '600',
  },
  badgeMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeMutedText: {
    color: 'rgba(248, 250, 252, 0.7)',
    fontSize: 10,
    fontWeight: '500',
  },
  jobItemMeta: {
    gap: 3,
  },
  jobItemMetaText: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  claimedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  claimedText: {
    fontSize: 11,
    color: Colors.mintBright,
    fontWeight: '600',
  },
});
