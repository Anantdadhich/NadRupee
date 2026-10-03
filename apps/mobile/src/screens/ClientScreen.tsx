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
import { KNOWN_FREELANCERS, JobState } from '../constants/config';
import * as Haptics from 'expo-haptics';
import {
  Users,
  Lock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react-native';

export const ClientScreen: React.FC = () => {
  const { address, isConnected, jobs, createJob, releaseRemainder, fxRate } = useAccount();

  const [freelancerInput, setFreelancerInput] = useState<string>('@arjun.monad');
  const [jobTitle, setJobTitle] = useState<string>('Full-Stack Web3 DApp Development');
  const [amountStr, setAmountStr] = useState<string>('1200');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [actionJobId, setActionJobId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const amountUsd = parseFloat(amountStr) || 0;
  const partialAdvanceUsd = amountUsd * 0.8;
  const remainderUsd = amountUsd * 0.2;

  const resolvedAddress = KNOWN_FREELANCERS[freelancerInput.trim().toLowerCase()] || freelancerInput.trim();

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
        setFeedbackMsg(`Escrow #${res.jobId} created and locked on Monad!`);
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
        setFeedbackMsg(`Milestone approved! 20% remainder settled to freelancer.`);
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
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. HERO BANNER */}
      <View style={styles.hero}>
        <View style={styles.eyebrow}>
          <Users size={11} color={Colors.mintBright} />
          <Text style={styles.eyebrowText}>NADRUPEE · CLIENT ESCROW PORTAL</Text>
        </View>
        <Text style={styles.heroTitle}>
          Fund work with certainty. <Text style={styles.heroHighlight}>Zero dispute risk.</Text>
        </Text>
        <Text style={styles.heroSubtitle}>
          Deposit Agora AUSD into on-chain escrow to guarantee payments for Indian freelancers. 80% is unlocked when confirmed; 20% remainder upon milestone approval.
        </Text>
      </View>

      {/* Notification Banner */}
      {feedbackMsg && (
        <View style={styles.alertSuccess}>
          <CheckCircle2 size={16} color={Colors.mint} />
          <Text style={styles.alertSuccessText}>{feedbackMsg}</Text>
        </View>
      )}

      {/* 2. CREATE ESCROW CARD */}
      <View style={styles.createCard}>
        <View style={styles.cardHeader}>
          <Lock size={16} color={Colors.mint} />
          <Text style={styles.cardTitle}>Create & Fund Escrow</Text>
        </View>

        {/* Freelancer Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>FREELANCER HANDLE OR ADDRESS</Text>
          <TextInput
            style={styles.textInput}
            value={freelancerInput}
            onChangeText={setFreelancerInput}
            placeholder="@arjun.monad or 0x..."
            placeholderTextColor={Colors.paperDim}
            autoCapitalize="none"
          />
          {KNOWN_FREELANCERS[freelancerInput.trim().toLowerCase()] && (
            <Text style={styles.resolvedHandle}>
              ✓ Resolved: {KNOWN_FREELANCERS[freelancerInput.trim().toLowerCase()].slice(0, 14)}...
            </Text>
          )}
        </View>

        {/* Job Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>JOB TITLE / DELIVERABLES</Text>
          <TextInput
            style={styles.textInput}
            value={jobTitle}
            onChangeText={setJobTitle}
            placeholder="e.g. Smart Contract Security Audit"
            placeholderTextColor={Colors.paperDim}
          />
        </View>

        {/* Deposit Amount */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>MILESTONE ESCROW AMOUNT (AUSD)</Text>
          <View style={styles.amountInputRow}>
            <TextInput
              style={styles.amountInput}
              value={amountStr}
              onChangeText={setAmountStr}
              keyboardType="numeric"
              placeholder="1000"
              placeholderTextColor={Colors.paperDim}
            />
            <Text style={styles.currencyBadge}>AUSD</Text>
          </View>
        </View>

        {/* Split Preview */}
        <View style={styles.splitsPreview}>
          <View style={styles.splitItem}>
            <Text style={styles.splitItemLabel}>80% ADVANCE</Text>
            <Text style={[styles.splitItemVal, { color: Colors.mintBright }]}>
              ${partialAdvanceUsd.toFixed(0)} AUSD
            </Text>
          </View>
          <View style={styles.splitItem}>
            <Text style={styles.splitItemLabel}>20% REMAINDER</Text>
            <Text style={styles.splitItemVal}>${remainderUsd.toFixed(0)} AUSD</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.depositBtn}
          onPress={handleCreateJob}
          disabled={isCreating}
          activeOpacity={0.8}
        >
          {isCreating ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Lock size={15} color="#000" />
              <Text style={styles.depositBtnText}>Lock ${amountUsd} AUSD in Escrow</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* 3. ACTIVE ESCROWS LIST */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Escrows ({jobs.length})</Text>
        <Text style={styles.sectionSubtitle}>
          Real-time on-chain status of funded jobs
        </Text>

        <View style={styles.jobsList}>
          {jobs.map((job) => {
            const isFunded = job.state === JobState.Funded;
            const isPartial = job.state === JobState.PartiallyReleased;
            const isCompleted = job.state === JobState.Completed;
            const isActing = actionJobId === job.id;

            return (
              <View key={job.id} style={styles.jobItemCard}>
                <View style={styles.jobHeaderRow}>
                  <Text style={styles.jobItemTitle}>{job.title}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      isFunded && styles.statusPillFunded,
                      isPartial && styles.statusPillPartial,
                      isCompleted && styles.statusPillCompleted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isFunded && { color: Colors.amber },
                        isPartial && { color: Colors.mintBright },
                        isCompleted && { color: Colors.blue },
                      ]}
                    >
                      {isFunded ? 'Funded' : isPartial ? '80% Released' : 'Completed'}
                    </Text>
                  </View>
                </View>

                <View style={styles.jobAmountsRow}>
                  <Text style={styles.jobTotalText}>
                    Total: <Text style={{ color: Colors.paper }}>${job.amountUsd} AUSD</Text>
                  </Text>
                  <Text style={styles.jobTimeText}>{job.createdAt}</Text>
                </View>

                {/* Actions */}
                {isPartial && (
                  <TouchableOpacity
                    style={styles.releaseBtn}
                    onPress={() => handleReleaseRemainder(job.id)}
                    disabled={isActing}
                    activeOpacity={0.8}
                  >
                    {isActing ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <>
                        <CheckCircle2 size={14} color="#000" />
                        <Text style={styles.releaseBtnText}>
                          Approve Milestone & Release 20% (${job.remainderAmountUsd} AUSD)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {isCompleted && (
                  <View style={styles.completedBadge}>
                    <CheckCircle2 size={13} color={Colors.mint} />
                    <Text style={styles.completedBadgeText}>
                      100% Settled. Job successfully archived onchain.
                    </Text>
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
  createCard: {
    backgroundColor: Colors.nightElevated,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.paper,
  },
  inputGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.paperMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInput: {
    height: 48,
    backgroundColor: Colors.nightSurface,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: Colors.paper,
    fontSize: 14,
  },
  resolvedHandle: {
    fontSize: 11,
    color: Colors.mint,
    marginTop: 4,
    fontWeight: '600',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.nightSurface,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  amountInput: {
    flex: 1,
    height: 48,
    color: Colors.paper,
    fontSize: 16,
    fontWeight: '700',
  },
  currencyBadge: {
    color: Colors.mint,
    fontSize: 13,
    fontWeight: '700',
  },
  splitsPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.nightSoft,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  splitItem: {
    gap: 2,
  },
  splitItemLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.paperDim,
  },
  splitItemVal: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.paper,
  },
  depositBtn: {
    height: 48,
    backgroundColor: Colors.mint,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  depositBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  section: {
    marginBottom: 20,
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
    marginBottom: 12,
  },
  jobsList: {
    gap: 12,
  },
  jobItemCard: {
    backgroundColor: Colors.nightElevated,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  jobHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  jobItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.paper,
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillFunded: {
    backgroundColor: Colors.amberSoft,
    borderWidth: 1,
    borderColor: Colors.amber,
  },
  statusPillPartial: {
    backgroundColor: Colors.mintSoft,
    borderWidth: 1,
    borderColor: Colors.mintBorder,
  },
  statusPillCompleted: {
    backgroundColor: Colors.blueSoft,
    borderWidth: 1,
    borderColor: Colors.blue,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  jobAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobTotalText: {
    fontSize: 12,
    color: Colors.paperMuted,
  },
  jobTimeText: {
    fontSize: 11,
    color: Colors.paperDim,
  },
  releaseBtn: {
    height: 42,
    backgroundColor: Colors.mint,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  releaseBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  completedBadgeText: {
    fontSize: 11,
    color: Colors.mintBright,
    fontWeight: '600',
  },
});
