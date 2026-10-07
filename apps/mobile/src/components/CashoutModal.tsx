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
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  X,
  Banknote,
  CheckCircle2,
  Copy,
  Zap,
  ShieldCheck,
  Check,
} from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  defaultAmount?: number;
}

export const CashoutModal: React.FC<Props> = ({ visible, onClose, defaultAmount = 0 }) => {
  const { ausdBalance, fxRate, processCashout } = useAccount();

  const [amountStr, setAmountStr] = useState<string>(
    defaultAmount > 0 ? defaultAmount.toString() : ''
  );
  const [upiId, setUpiId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<boolean>(false);
  const [receipt, setReceipt] = useState<{
    receiptId: string;
    utr: string;
    amountInr: number;
    amountUsd: number;
    txHash: string;
  } | null>(null);

  const amountUsd = parseFloat(amountStr) || 0;
  const grossInr = amountUsd * fxRate;
  const feeInr = grossInr * 0.005; // 0.5% flat fee
  const tdsInr = grossInr * 0.01;  // 1% TDS Section 194S
  const netInr = Math.max(0, grossInr - feeInr - tdsInr);

  const handleSelectQuick = (val: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmountStr(val.toString());
  };

  const handleMax = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmountStr(Math.floor(ausdBalance).toString());
  };

  const handleSubmit = async () => {
    if (amountUsd <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (amountUsd > ausdBalance) {
      setError('Amount exceeds your available balance.');
      return;
    }
    if (!upiId.trim()) {
      setError('Please enter a valid UPI VPA or Bank Account.');
      return;
    }

    setError(null);
    setIsProcessing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    try {
      const res = await processCashout(amountUsd, upiId.trim());
      setReceipt(res);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err?.message || 'Failed to process IMPS cashout.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyUtr = async () => {
    if (receipt?.utr) {
      await Clipboard.setStringAsync(receipt.utr);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopiedUtr(true);
      setTimeout(() => setCopiedUtr(false), 2000);
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
              <Banknote size={18} color={Colors.mint} />
              <Text style={styles.headerTitle}>Instant INR Bank Cashout</Text>
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
                  <Text style={styles.receiptTitle}>Settlement Broadcasted</Text>
                  <Text style={styles.receiptSubtitle}>
                    Instant IMPS payout credited to bank account
                  </Text>
                </View>

                <View style={styles.receiptCard}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Net INR Credited</Text>
                    <Text style={styles.receiptHighlight}>
                      ₹{receipt.amountInr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={styles.receiptDivider} />

                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>IMPS Reference / UTR</Text>
                    <TouchableOpacity
                      onPress={handleCopyUtr}
                      style={styles.utrBadge}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.utrText}>{receipt.utr}</Text>
                      {copiedUtr ? (
                        <Check size={12} color={Colors.mint} />
                      ) : (
                        <Copy size={12} color={Colors.paperMuted} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>AUSD Sells</Text>
                    <Text style={styles.receiptValue}>{receipt.amountUsd} AUSD</Text>
                  </View>

                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Exchange Rate</Text>
                    <Text style={styles.receiptValue}>1 AUSD = ₹{fxRate.toFixed(2)}</Text>
                  </View>

                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Settlement Speed</Text>
                    <Text style={[styles.receiptValue, { color: Colors.mintBright }]}>
                      Instant (&lt;45s)
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
                {/* Balance & FX Ticker */}
                <View style={styles.rateCard}>
                  <View>
                    <Text style={styles.rateLabel}>LIVE ORACLE RATE</Text>
                    <Text style={styles.rateValue}>1 AUSD = ₹{fxRate.toFixed(2)} INR</Text>
                  </View>
                  <View style={styles.balancePill}>
                    <Text style={styles.balanceLabel}>Available</Text>
                    <Text style={styles.balanceVal}>{ausdBalance.toFixed(2)} AUSD</Text>
                  </View>
                </View>

                {/* Amount Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>CASH OUT AMOUNT (AUSD)</Text>
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
                    {[100, 250, 500, 1000].map((val) => (
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

                {/* Payout Destination */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>UPI ID OR BANK ACCOUNT</Text>
                  <TextInput
                    style={styles.textInput}
                    value={upiId}
                    onChangeText={setUpiId}
                    placeholder="e.g. arjun@axl or 50100492817"
                    placeholderTextColor={Colors.paperDim}
                    autoCapitalize="none"
                  />
                  <View style={styles.chipRow}>
                    {['arjun@axl', 'priya@okhdfcbank', 'rohit@paytm'].map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setUpiId(preset);
                        }}
                        style={[
                          styles.chip,
                          upiId === preset && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            upiId === preset && styles.chipTextActive,
                          ]}
                        >
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.inputHint}>
                    Instant IMPS bank credit verified under RBI & FIU-IND compliance.
                  </Text>
                </View>

                {/* Calculation breakdown */}
                <View style={styles.calcCard}>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Gross INR</Text>
                    <Text style={styles.calcVal}>₹{grossInr.toFixed(2)}</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Off-ramp Fee (0.5%)</Text>
                    <Text style={styles.calcVal}>-₹{feeInr.toFixed(2)}</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>TDS Compliance (1% Sec 194S)</Text>
                    <Text style={styles.calcVal}>-₹{tdsInr.toFixed(2)}</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Gas Network Fee</Text>
                    <Text style={[styles.calcVal, { color: Colors.mintBright }]}>
                      ₹0 (Gasless Relayer)
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.calcRow}>
                    <Text style={styles.netLabel}>Estimated Bank Credit</Text>
                    <Text style={styles.netVal}>₹{netInr.toFixed(2)}</Text>
                  </View>
                </View>

                {error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Submit button */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isProcessing}
                  style={[styles.submitBtn, isProcessing && styles.submitBtnDisabled]}
                  activeOpacity={0.8}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Zap size={16} color="#000" />
                      <Text style={styles.submitBtnText}>Settle to Bank Instantly</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.trustFooter}>
                  <ShieldCheck size={13} color={Colors.mint} />
                  <Text style={styles.trustText}>
                    Powered by Monad x402 and Onmeta Compliant Settlement
                  </Text>
                </View>
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
    backgroundColor: 'rgba(15, 24, 25, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.nightCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: Colors.nightCardBorder,
    maxHeight: '90%',
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
    fontWeight: '600',
    color: Colors.paper,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  rateLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: Colors.mintBright,
  },
  rateValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.paper,
    marginTop: 2,
  },
  balancePill: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 9,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
  },
  balanceVal: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.paper,
    marginTop: 2,
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
  amountInputRow: {
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
  currencyBadge: {
    color: Colors.mint,
    fontSize: 12,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },
  chipActive: {
    borderColor: 'rgba(56, 217, 169, 0.4)',
    backgroundColor: 'rgba(56, 217, 169, 0.12)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.paperMuted,
  },
  chipTextActive: {
    color: Colors.mintBright,
    fontWeight: '600',
  },
  chipMax: {
    borderColor: 'rgba(56, 217, 169, 0.3)',
  },
  chipMaxText: {
    color: Colors.mint,
    fontWeight: '600',
  },
  textInput: {
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: Colors.paper,
    fontSize: 13,
  },
  inputHint: {
    fontSize: 10,
    color: Colors.mutedForeground,
    marginTop: 4,
  },
  calcCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
    gap: 6,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcLabel: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  calcVal: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.paper,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 4,
  },
  netLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.paper,
  },
  netVal: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.mintBright,
  },
  errorBox: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.paper,
    height: 42,
    borderRadius: 22,
    marginBottom: 12,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: Colors.night,
    fontSize: 12,
    fontWeight: '700',
  },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  trustText: {
    fontSize: 10,
    color: Colors.mutedForeground,
  },
  // Receipt Styles
  receiptWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  receiptBadge: {
    alignItems: 'center',
    marginBottom: 20,
  },
  receiptTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.paper,
    marginTop: 10,
  },
  receiptSubtitle: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 4,
    textAlign: 'center',
  },
  receiptCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  receiptHighlight: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.mintBright,
  },
  receiptValue: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.paper,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  utrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  utrText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: Colors.mint,
  },
  doneBtn: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  doneBtnText: {
    color: Colors.paper,
    fontSize: 12,
    fontWeight: '600',
  },
});
