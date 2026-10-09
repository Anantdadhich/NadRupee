import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAccount } from '../context/AccountContext';
import { JobDetailsModal } from '../components/JobDetailsModal';
import { SendAusdModal } from '../components/SendAusdModal';
import { Toast, ToastConfig } from '../components/Toast';
import {
  KNOWN_FREELANCERS,
  JobState,
  JOB_STATE_LABELS,
  EscrowJobItem,
} from '../constants/config';
import * as Haptics from 'expo-haptics';
import {
  Sparkles,
  Check,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  ChevronRight,
  Send,
} from 'lucide-react-native';
import { TabType } from '../components/BottomNav';

interface Props {
  onNavigateTab?: (tab: TabType) => void;
}

type ClientJobFilter = 'all' | 'actionable' | 'completed';

export const ClientScreen: React.FC<Props> = ({ onNavigateTab }) => {
  const { jobs, createJob, releaseRemainder, fxRate, refreshAccountData } = useAccount();

  const [freelancerInput, setFreelancerInput] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [actionJobId, setActionJobId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [selectedJob, setSelectedJob] = useState<EscrowJobItem | null>(null);
  const [sendAusdVisible, setSendAusdVisible] = useState<boolean>(false);
  const [sendAusdRecipient, setSendAusdRecipient] = useState<string>('');
  const [jobFilter, setJobFilter] = useState<ClientJobFilter>('all');
  const [toast, setToast] = useState<ToastConfig | null>(null);

  const amountUsd = parseFloat(amountStr) || 0;
  const partialAdvanceUsd = amountUsd * 0.8;
  const remainderUsd = amountUsd * 0.2;

  const resolvedAddress =
    KNOWN_FREELANCERS[freelancerInput.trim().toLowerCase()] || freelancerInput.trim();

  const actionableCount = jobs.filter((j) => j.state === JobState.PartiallyReleased).length;
  const completedCount = jobs.filter((j) => j.state === JobState.Completed).length;

  const displayedJobs = jobs.filter((j) => {
    if (jobFilter === 'actionable') return j.state === JobState.PartiallyReleased;
    if (jobFilter === 'completed') return j.state === JobState.Completed;
    return true;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await refreshAccountData();
      setToast({ type: 'success', message: 'Escrow records synced with Monad Testnet.' });
    } catch {
      setToast({ type: 'error', message: 'Unable to refresh data. Please check connection.' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateJob = async () => {
    if (!freelancerInput.trim()) {
      setFormError('Please select or enter a freelancer address or handle.');
      return;
    }
    if (!jobTitle.trim()) {
      setFormError('Please enter a deliverable title for the escrow.');
      return;
    }
    if (amountUsd <= 0) {
      setFormError('Please enter a valid deposit amount in AUSD.');
      return;
    }

    setFormError(null);
    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await createJob(jobTitle.trim(), resolvedAddress, amountUsd);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setToast({
          type: 'success',
          message: `Escrow #${res.jobId} created & funded with $${amountUsd} AUSD!`,
        });
        setJobTitle('');
        setAmountStr('');
      }
    } catch (e: any) {
      const msg = e?.message || 'Failed to create escrow on Monad.';
      setFormError(msg);
      setToast({ type: 'error', message: msg });
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
        setToast({
          type: 'success',
          message: 'Milestone approved! 20% remainder settled to freelancer.',
        });
      }
      return res;
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setToast({ type: 'error', message: e?.message || 'Failed to release remainder.' });
      throw e;
    } finally {
      setActionJobId(null);
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
      {/* 1. PORTAL HERO */}
      <View style={styles.portalHero}>
        <View style={styles.heroTopRow}>
          <View style={styles.darkEyebrow}>
            <Sparkles size={11} color={Colors.mint} />
            <Text style={styles.darkEyebrowText}>
              NADRUPEE · CLIENT ESCROW PORTAL <Text style={styles.eyebrowSub}>MONAD TESTNET</Text>
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
              <Text style={styles.switchBtnText}>Switch to Freelancer</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.portalH1Em}>Fund work with certainty.</Text>
        <Text style={styles.portalH1White}>Zero dispute risk.</Text>

        <Text style={styles.portalDesc}>
          Deposit and lock Agora AUSD into on-chain escrow to guarantee payments for Indian freelancers. 80% is unlocked when confirmed; 20% remainder upon milestone approval.
        </Text>
      </View>



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
          <View style={styles.chipRow}>
            {Object.keys(KNOWN_FREELANCERS).map((handle) => {
              const active = freelancerInput.trim().toLowerCase() === handle.toLowerCase();
              return (
                <TouchableOpacity
                  key={handle}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setFreelancerInput(handle);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {handle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
          <View style={styles.chipRow}>
            {['250', '500', '1000', '2500'].map((amt) => {
              const active = amountStr === amt;
              return (
                <TouchableOpacity
                  key={amt}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAmountStr(amt);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    ${amt}
                  </Text>
                </TouchableOpacity>
              );
            })}
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

        {formError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        )}

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
      <View style={[styles.portalCard, { marginTop: 20 }]}>
        <View style={styles.portalCardHeader}>
          <Text style={styles.sectionH2Em}>
            Created Escrows <Text style={styles.sectionH2White}>({jobs.length})</Text>
          </Text>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterChipsRow}>
          <TouchableOpacity
            style={[styles.filterChip, jobFilter === 'all' && styles.filterChipActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setJobFilter('all');
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, jobFilter === 'all' && styles.filterChipTextActive]}>
              All ({jobs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, jobFilter === 'actionable' && styles.filterChipActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setJobFilter('actionable');
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, jobFilter === 'actionable' && styles.filterChipTextActive]}>
              Needs Approval ({actionableCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, jobFilter === 'completed' && styles.filterChipActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setJobFilter('completed');
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, jobFilter === 'completed' && styles.filterChipTextActive]}>
              Completed ({completedCount})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.jobsList}>
          {displayedJobs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {jobFilter === 'all'
                  ? 'No escrows created yet.'
                  : `No ${jobFilter} escrows found.`}
              </Text>
              <Text style={styles.emptyText}>
                Use the form above to fund your first deliverable on Monad Testnet.
              </Text>
              {onNavigateTab && (
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onNavigateTab('freelancer');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyActionBtnText}>Switch to Freelancer Portal</Text>
                  <ArrowRight size={12} color={Colors.night} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            displayedJobs.map((job) => {
              const isFunded = job.state === JobState.Funded;
              const isPartial = job.state === JobState.PartiallyReleased;
              const isCompleted = job.state === JobState.Completed;
              const isActing = actionJobId === job.id;

              return (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobItemCard}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedJob(job);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.jobItemTop}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.jobItemTitle}>{job.title}</Text>
                      <Text style={styles.jobItemSubCode}>Escrow #{job.id}</Text>
                    </View>
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

                  {/* Actions & Inspect Bar */}
                  <View style={styles.jobActionsRow}>
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
                            Approve & Release 20% (${job.remainderAmountUsd} AUSD)
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

                    <View style={styles.inspectRow}>
                      <Text style={styles.inspectText}>Inspect</Text>
                      <ChevronRight size={13} color={Colors.mint} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>

      {/* Job Details Modal */}
      <JobDetailsModal
        visible={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        job={selectedJob}
        fxRate={fxRate}
        isFreelancerView={false}
        onReleaseRemainder={handleReleaseRemainder}
        onOpenSendAusd={(recipient) => {
          setSendAusdRecipient(recipient);
          setSendAusdVisible(true);
        }}
      />

      {/* Send AUSD Modal */}
      <SendAusdModal
        visible={sendAusdVisible}
        onClose={() => {
          setSendAusdVisible(false);
          setSendAusdRecipient('');
        }}
        defaultRecipient={sendAusdRecipient}
        defaultAmount={50}
      />

      {/* Global Toast */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
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
  inputGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.mutedForeground,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
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
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  resolvedText: {
    fontSize: 11,
    color: Colors.mintBright,
    marginTop: 4,
    fontWeight: '500',
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
    height: 44,
    color: Colors.paper,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  amountSuffix: {
    color: Colors.mint,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
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
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    letterSpacing: 0.5,
  },
  splitsValMint: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.mintBright,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    marginTop: 2,
  },
  splitsVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.paper,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    marginTop: 2,
  },
  actionBtn: {
    height: 42,
    borderRadius: 999,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  actionBtnText: {
    color: Colors.night,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
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
  badgeMint: {
    backgroundColor: 'rgba(56, 217, 169, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.25)',
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
  },
  badgeMutedText: {
    color: 'rgba(248, 250, 252, 0.7)',
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  jobItemMeta: {
    gap: 3,
  },
  jobItemMetaText: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(56, 217, 169, 0.15)',
    borderColor: Colors.mint,
  },
  filterChipText: {
    fontSize: 11,
    color: Colors.paperDim,
    fontWeight: '600',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  filterChipTextActive: {
    color: Colors.mintBright,
    fontWeight: '700',
  },
  jobItemSubCode: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  jobActionsRow: {
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  inspectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
  },
  inspectText: {
    fontSize: 11,
    color: Colors.mint,
    fontWeight: '600',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
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
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipActive: {
    backgroundColor: 'rgba(56, 217, 169, 0.15)',
    borderColor: 'rgba(56, 217, 169, 0.4)',
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
  errorBox: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
  },
});
