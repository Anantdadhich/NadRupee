import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAccount } from '../context/AccountContext';
import { KNOWN_FREELANCERS, MONAD_EXPLORER_URL } from '../constants/config';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  X,
  Send,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  defaultRecipient?: string;
  defaultAmount?: number;
}

export const SendAusdModal: React.FC<Props> = ({
  visible,
  onClose,
  defaultRecipient = '',
  defaultAmount = 0,
}) => {
  const { ausdBalance, fxRate, sendAusd } = useAccount();

  const [recipientInput, setRecipientInput] = useState<string>(defaultRecipient);
  const [resolvedAddress, setResolvedAddress] = useState<string>(
    defaultRecipient ? (KNOWN_FREELANCERS[defaultRecipient] || '') : ''
  );
  const [amountStr, setAmountStr] = useState<string>(
    defaultAmount > 0 ? defaultAmount.toString() : ''
  );
  const [memo, setMemo] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedTx, setCopiedTx] = useState<boolean>(false);
  const [receipt, setReceipt] = useState<{
    txHash: string;
    amountUsd: number;
    recipient: string;
  } | null>(null);

  const amountUsd = parseFloat(amountStr) || 0;
  const inrEquivalent = (amountUsd * fxRate).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });

  const handleRecipientChange = (val: string) => {
    setRecipientInput(val);
    const cleaned = val.trim().toLowerCase();
    if (KNOWN_FREELANCERS[cleaned]) {
      setResolvedAddress(KNOWN_FREELANCERS[cleaned]);
    } else if (cleaned.startsWith('0x') && cleaned.length === 42) {
      setResolvedAddress(cleaned);
    } else {
      setResolvedAddress('');
    }
  };

  const handleSelectHandle = (handle: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRecipientInput(handle);
    if (KNOWN_FREELANCERS[handle]) {
      setResolvedAddress(KNOWN_FREELANCERS[handle]);
    }
  };

  const handleSelectQuick = (val: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmountStr(val.toString());
  };

  const handleMax = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmountStr(Math.floor(ausdBalance).toString());
  };

  const handleSend = async () => {
    const target = resolvedAddress || recipientInput.trim();

    if (!target.startsWith('0x') || target.length !== 42) {
      setError('Please enter a valid Monad address (0x...) or select a known handle.');
      return;
    }

    if (amountUsd <= 0) {
      setError('Transfer amount must be greater than 0 AUSD.');
      return;
    }

    if (amountUsd > ausdBalance) {
      setError(`Insufficient balance. You have $${ausdBalance.toFixed(2)} AUSD available.`);
      return;
    }

    setError(null);
    setIsProcessing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    try {
      const res = await sendAusd(target, amountUsd);
      setReceipt({
        txHash: res.txHash,
        amountUsd,
        recipient: target,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err?.message || 'Failed to complete AUSD transfer.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyTx = async () => {
    if (receipt?.txHash) {
      await Clipboard.setStringAsync(receipt.txHash);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopiedTx(true);
      setTimeout(() => setCopiedTx(false), 2000);
    }
  };

  const handleReset = () => {
    setReceipt(null);
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleReset}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Send size={18} color={Colors.mint} />
              <Text style={styles.headerTitle}>Send Agora AUSD</Text>
            </View>
            <TouchableOpacity onPress={handleReset} style={styles.closeBtn}>
              <X size={18} color={Colors.paperMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {receipt ? (
              // Success Receipt State
              <View style={styles.receiptWrap}>
                <View style={styles.receiptBadge}>
                  <CheckCircle2 size={36} color={Colors.mint} />
                  <Text style={styles.receiptTitle}>Transfer Confirmed</Text>
                  <Text style={styles.receiptSubtitle}>
                    Settled on Monad Testnet via Agora Dollar
                  </Text>
                </View>

                <View style={styles.receiptCard}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Amount Sent</Text>
                    <Text style={styles.receiptHighlight}>
                      ${receipt.amountUsd.toFixed(2)} AUSD
                    </Text>
                  </View>

                  <View style={styles.receiptDivider} />

                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Recipient</Text>
                    <Text style={styles.receiptValue}>
                      {receipt.recipient.slice(0, 8)}...{receipt.recipient.slice(-6)}
                    </Text>
                  </View>

                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Transaction Hash</Text>
                    <TouchableOpacity
                      onPress={handleCopyTx}
                      style={styles.hashBadge}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.hashText}>
                        {receipt.txHash.slice(0, 10)}...{receipt.txHash.slice(-6)}
                      </Text>
                      {copiedTx ? (
                        <Check size={12} color={Colors.mint} />
                      ) : (
                        <Copy size={12} color={Colors.paperMuted} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Gas Model</Text>
                    <Text style={[styles.receiptValue, { color: Colors.mintBright }]}>
                      Sponsored (Free)
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleReset}
                  style={styles.doneBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.doneBtnText}>Return to Portal</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Form State
              <>
                {/* Available Balance Card */}
                <View style={styles.rateCard}>
                  <View>
                    <Text style={styles.rateLabel}>ON-CHAIN BALANCE</Text>
                    <Text style={styles.rateValue}>{ausdBalance.toFixed(2)} AUSD</Text>
                  </View>
                  <View style={styles.balancePill}>
                    <Zap size={10} color={Colors.mintBright} />
                    <Text style={styles.balanceVal}>Instant Rail</Text>
                  </View>
                </View>

                {/* Recipient Handle / Address */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>RECIPIENT ADDRESS OR HANDLE</Text>
                  <TextInput
                    style={styles.textInput}
                    value={recipientInput}
                    onChangeText={handleRecipientChange}
                    placeholder="@handle or 0x..."
                    placeholderTextColor={Colors.paperDim}
                    autoCapitalize="none"
                  />
                  {resolvedAddress ? (
                    <View style={styles.resolvedRow}>
                      <ShieldCheck size={11} color={Colors.mint} />
                      <Text style={styles.resolvedText}>
                        Resolves to: {resolvedAddress.slice(0, 8)}...{resolvedAddress.slice(-6)}
                      </Text>
                    </View>
                  ) : null}

                  {/* Known Quick Handles */}
                  <View style={styles.chipRow}>
                    {Object.keys(KNOWN_FREELANCERS).map((handle) => (
                      <TouchableOpacity
                        key={handle}
                        onPress={() => handleSelectHandle(handle)}
                        style={[
                          styles.chip,
                          recipientInput === handle && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            recipientInput === handle && styles.chipTextActive,
                          ]}
                        >
                          {handle}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Amount Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>TRANSFER AMOUNT (AUSD)</Text>
                  <View style={styles.amountInputRow}>
                    <TextInput
                      style={styles.amountInput}
                      value={amountStr}
                      onChangeText={setAmountStr}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={Colors.paperDim}
                    />
                    <Text style={styles.currencyBadge}>AUSD</Text>
                  </View>

                  {/* Quick Selectors */}
                  <View style={styles.chipRow}>
                    {[25, 50, 100, 250].map((val) => (
                      <TouchableOpacity
                        key={val}
                        onPress={() => handleSelectQuick(val)}
                        style={[
                          styles.chip,
                          amountStr === val.toString() && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            amountStr === val.toString() && styles.chipTextActive,
                          ]}
                        >
                          ${val}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity onPress={handleMax} style={[styles.chip, styles.chipMax]}>
                      <Text style={[styles.chipText, styles.chipMaxText]}>MAX</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Memo Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>MEMO / NOTE (OPTIONAL)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={memo}
                    onChangeText={setMemo}
                    placeholder="e.g. Design review payment"
                    placeholderTextColor={Colors.paperDim}
                  />
                </View>

                {/* Summary Quote */}
                <View style={styles.summaryBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Estimated INR Value</Text>
                    <Text style={styles.summaryVal}>₹{inrEquivalent}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Network Gas Fee</Text>
                    <Text style={[styles.summaryVal, { color: Colors.mintBright }]}>
                      Sponsored (Free)
                    </Text>
                  </View>
                </View>

                {/* Error Banner */}
                {error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitBtn, isProcessing && styles.submitBtnDisabled]}
                  onPress={handleSend}
                  disabled={isProcessing}
                  activeOpacity={0.8}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#0a0d0c" />
                  ) : (
                    <>
                      <Send size={14} color="#0a0d0c" />
                      <Text style={styles.submitBtnText}>Send {amountUsd} AUSD</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 6, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: Colors.nightCard,
    borderWidth: 1,
    borderColor: Colors.nightCardBorder,
    borderRadius: 24,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.paper,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  rateCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  rateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.paperMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  rateValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.mint,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 217, 169, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  balanceVal: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.mintBright,
  },
  inputGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.paperMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.paper,
  },
  resolvedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  resolvedText: {
    fontSize: 11,
    color: Colors.mint,
    fontWeight: '500',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.paper,
  },
  currencyBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.mint,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: 'rgba(56, 217, 169, 0.15)',
    borderColor: Colors.mint,
  },
  chipText: {
    fontSize: 11,
    color: Colors.paperDim,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.mintBright,
  },
  chipMax: {
    backgroundColor: 'rgba(56, 217, 169, 0.1)',
    borderColor: 'rgba(56, 217, 169, 0.3)',
  },
  chipMaxText: {
    color: Colors.mint,
  },
  summaryBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.paperMuted,
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.paper,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#f87171',
    lineHeight: 16,
  },
  submitBtn: {
    backgroundColor: Colors.mint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a0d0c',
  },
  receiptWrap: {
    paddingVertical: 12,
  },
  receiptBadge: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.paper,
  },
  receiptSubtitle: {
    fontSize: 12,
    color: Colors.paperMuted,
    textAlign: 'center',
  },
  receiptCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 12,
    color: Colors.paperMuted,
  },
  receiptHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.mint,
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.paper,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  hashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hashText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: Colors.paper,
  },
  doneBtn: {
    backgroundColor: Colors.mint,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a0d0c',
  },
});
