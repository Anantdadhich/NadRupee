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

export const CashoutModal: React.FC<Props> = ({ visible, onClose, defaultAmount = 100 }) => {
  const { ausdBalance, fxRate, processCashout } = useAccount();

  const [amountStr, setAmountStr] = useState<string>(defaultAmount.toString());
  const [upiId, setUpiId] = useState<string>('arjun@axl');
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
  const netInr = Math.max(0, grossInr - feeInr);

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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.nightElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
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
    borderBottomColor: Colors.nightBorder,
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
    padding: 6,
    borderRadius: 16,
    backgroundColor: Colors.nightSoft,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.nightSoft,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    marginBottom: 16,
  },
  rateLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: Colors.mintBright,
  },
  rateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.paper,
    marginTop: 2,
  },
  balancePill: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 9,
    color: Colors.paperDim,
    textTransform: 'uppercase',
  },
  balanceVal: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.mint,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.paperMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
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
    fontSize: 18,
    fontWeight: '700',
  },
  currencyBadge: {
    color: Colors.mint,
    fontSize: 13,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.nightSoft,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 10,
  },
  chipActive: {
    borderColor: Colors.mint,
    backgroundColor: Colors.mintSoft,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.paperMuted,
  },
  chipTextActive: {
    color: Colors.mintBright,
    fontWeight: '700',
  },
  chipMax: {
    borderColor: Colors.mintBorder,
  },
  chipMaxText: {
    color: Colors.mint,
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
  inputHint: {
    fontSize: 10,
    color: Colors.paperDim,
    marginTop: 5,
  },
  calcCard: {
    backgroundColor: Colors.nightSoft,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    marginBottom: 16,
    gap: 6,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcLabel: {
    fontSize: 12,
    color: Colors.paperMuted,
  },
  calcVal: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.paper,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.nightBorder,
    marginVertical: 4,
  },
  netLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.paper,
  },
  netVal: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.mintBright,
  },
  errorBox: {
    backgroundColor: Colors.dangerSoft,
    borderWidth: 1,
    borderColor: Colors.danger,
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
    backgroundColor: Colors.mint,
    height: 50,
    borderRadius: 14,
    marginBottom: 12,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 24,
  },
  trustText: {
    fontSize: 10,
    color: Colors.paperDim,
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
    fontSize: 18,
    fontWeight: '800',
    color: Colors.paper,
    marginTop: 10,
  },
  receiptSubtitle: {
    fontSize: 12,
    color: Colors.paperDim,
    marginTop: 4,
    textAlign: 'center',
  },
  receiptCard: {
    width: '100%',
    backgroundColor: Colors.nightSoft,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 24,
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
    fontSize: 20,
    fontWeight: '800',
    color: Colors.mintBright,
  },
  receiptValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.paper,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: Colors.nightBorder,
  },
  utrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.nightSurface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  utrText: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: Colors.mint,
  },
  doneBtn: {
    width: '100%',
    backgroundColor: Colors.nightSoft,
    borderWidth: 1,
    borderColor: Colors.mintBorder,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  doneBtnText: {
    color: Colors.mintBright,
    fontSize: 14,
    fontWeight: '700',
  },
});
