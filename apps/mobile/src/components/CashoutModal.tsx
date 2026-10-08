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
  Linking,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAccount } from '../context/AccountContext';
import { getMonadTxExplorerUrl } from '../services/monadRpc';
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
  Building2,
  ExternalLink,
  ArrowRight,
} from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  defaultAmount?: number;
}

type PayoutMode = 'upi' | 'bank';

export const CashoutModal: React.FC<Props> = ({ visible, onClose, defaultAmount = 0 }) => {
  const { ausdBalance, fxRate, processCashout } = useAccount();

  const [mode, setMode] = useState<PayoutMode>('upi');
  const [amountStr, setAmountStr] = useState<string>(
    defaultAmount > 0 ? defaultAmount.toString() : ''
  );
  const [upiId, setUpiId] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<boolean>(false);
  const [copiedTx, setCopiedTx] = useState<boolean>(false);
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
      setError('Please enter a valid cashout amount.');
      return;
    }
    if (amountUsd > ausdBalance) {
      setError(`Amount exceeds your available balance ($${ausdBalance.toFixed(2)} AUSD).`);
      return;
    }

    let destination = '';
    let bankDetails:
      | {
          accountNumber: string;
          ifsc: string;
          beneficiaryName: string;
        }
      | undefined;

    if (mode === 'upi') {
      if (!upiId.trim() || !upiId.includes('@')) {
        setError('Please enter a valid UPI VPA (e.g. yourname@axl or yourname@okhdfcbank).');
        return;
      }
      destination = upiId.trim();
    } else {
      if (!accountName.trim()) {
        setError('Please enter the bank account holder name.');
        return;
      }
      if (!accountNumber.trim() || accountNumber.trim().length < 8) {
        setError('Please enter a valid bank account number.');
        return;
      }
      if (!ifscCode.trim() || ifscCode.trim().length < 9) {
        setError('Please enter a valid 11-digit IFSC code (e.g. HDFC0001234).');
        return;
      }
      destination = `${accountNumber.trim()} (${ifscCode.trim().toUpperCase()})`;
      bankDetails = {
        accountNumber: accountNumber.trim(),
        ifsc: ifscCode.trim().toUpperCase(),
        beneficiaryName: accountName.trim(),
      };
    }

    setError(null);
    setIsProcessing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    try {
      const res = await processCashout(amountUsd, destination, bankDetails);
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

  const handleCopyTx = async () => {
    if (receipt?.txHash) {
      await Clipboard.setStringAsync(receipt.txHash);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopiedTx(true);
      setTimeout(() => setCopiedTx(false), 2000);
    }
  };

  const handleOpenExplorer = () => {
    if (receipt?.txHash) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const url = getMonadTxExplorerUrl(receipt.txHash);
      Linking.openURL(url).catch((e) => console.warn('Could not open Monad explorer:', e));
    }
  };

  const handleReset = () => {
    setReceipt(null);
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleReset}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Banknote size={18} color={Colors.mint} />
              <Text style={styles.headerTitle}>Instant INR Bank Cashout</Text>
            </View>
            <TouchableOpacity onPress={handleReset} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color={Colors.paperMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {receipt ? (
              // Success Receipt State
              <View style={styles.receiptWrap}>
                <View style={styles.receiptBadge}>
                  <CheckCircle2 size={38} color={Colors.mint} />
                  <Text style={styles.receiptTitle}>Settlement Dispatched</Text>
                  <Text style={styles.receiptSubtitle}>
                    Instant IMPS fiat payout credited to Indian bank account
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

                  {/* Monad Testnet Tx Hash */}
                  {receipt.txHash ? (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Monad Testnet Tx</Text>
                      <TouchableOpacity
                        onPress={handleCopyTx}
                        style={styles.utrBadge}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.utrText}>
                          {receipt.txHash.slice(0, 8)}...{receipt.txHash.slice(-6)}
                        </Text>
                        {copiedTx ? (
                          <Check size={12} color={Colors.mint} />
                        ) : (
                          <Copy size={12} color={Colors.paperMuted} />
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : null}

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

                {/* View on Monad Explorer Action */}
                {receipt.txHash ? (
                  <TouchableOpacity
                    onPress={handleOpenExplorer}
                    style={styles.explorerBtn}
                    activeOpacity={0.8}
                  >
                    <ExternalLink size={14} color={Colors.mint} />
                    <Text style={styles.explorerBtnText}>View on Monad Explorer</Text>
                  </TouchableOpacity>
                ) : null}

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

                  {/* Quick Preset Selectors */}
                  <View style={styles.chipRow}>
                    {[50, 100, 250, 500].map((val) => (
                      <TouchableOpacity
                        key={val}
                        onPress={() => handleSelectQuick(val)}
                        style={[
                          styles.chip,
                          amountStr === val.toString() && styles.chipActive,
                        ]}
                        activeOpacity={0.7}
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
                    <TouchableOpacity
                      onPress={handleMax}
                      style={[styles.chip, styles.chipMax]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, styles.chipMaxText]}>MAX</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Payout Rail Switcher: UPI vs Bank Account */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>PAYOUT DESTINATION</Text>
                  <View style={styles.modeToggleRow}>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setMode('upi');
                      }}
                      style={[styles.modeBtn, mode === 'upi' && styles.modeBtnActive]}
                      activeOpacity={0.7}
                    >
                      <Zap size={13} color={mode === 'upi' ? Colors.mint : Colors.paperDim} />
                      <Text
                        style={[
                          styles.modeBtnText,
                          mode === 'upi' && styles.modeBtnTextActive,
                        ]}
                      >
                        UPI ID / VPA
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setMode('bank');
                      }}
                      style={[styles.modeBtn, mode === 'bank' && styles.modeBtnActive]}
                      activeOpacity={0.7}
                    >
                      <Building2
                        size={13}
                        color={mode === 'bank' ? Colors.mint : Colors.paperDim}
                      />
                      <Text
                        style={[
                          styles.modeBtnText,
                          mode === 'bank' && styles.modeBtnTextActive,
                        ]}
                      >
                        Bank Transfer (IMPS)
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {mode === 'upi' ? (
                    // UPI Input Mode
                    <View style={{ gap: 8 }}>
                      <TextInput
                        style={styles.textInput}
                        value={upiId}
                        onChangeText={setUpiId}
                        placeholder="e.g. yourname@axl or yourname@okhdfcbank"
                        placeholderTextColor={Colors.paperDim}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {/* Quick UPI Handle Suffix Chips */}
                      <View style={styles.chipRow}>
                        {['@axl', '@okaxis', '@okhdfcbank', '@paytm', '@ybl'].map((suffix) => (
                          <TouchableOpacity
                            key={suffix}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              const prefix = upiId.split('@')[0] || 'user';
                              setUpiId(`${prefix}${suffix}`);
                            }}
                            style={styles.chip}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.chipText}>{suffix}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ) : (
                    // Bank Account Mode
                    <View style={{ gap: 10 }}>
                      <TextInput
                        style={styles.textInput}
                        value={accountName}
                        onChangeText={setAccountName}
                        placeholder="Beneficiary Account Holder Name"
                        placeholderTextColor={Colors.paperDim}
                      />
                      <TextInput
                        style={styles.textInput}
                        value={accountNumber}
                        onChangeText={setAccountNumber}
                        keyboardType="numeric"
                        placeholder="Bank Account Number"
                        placeholderTextColor={Colors.paperDim}
                      />
                      <TextInput
                        style={styles.textInput}
                        value={ifscCode}
                        onChangeText={(t) => setIfscCode(t.toUpperCase())}
                        autoCapitalize="characters"
                        placeholder="IFSC Code (e.g. HDFC0001234)"
                        placeholderTextColor={Colors.paperDim}
                      />
                    </View>
                  )}
                  <Text style={styles.inputHint}>
                    Instant IMPS bank credit verified under RBI & FIU-IND compliance via Onmeta.
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
                    <ActivityIndicator color={Colors.night} />
                  ) : (
                    <>
                      <Zap size={16} color={Colors.night} />
                      <Text style={styles.submitBtnText}>Settle to Bank Instantly</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.trustFooter}>
                  <ShieldCheck size={13} color={Colors.mint} />
                  <Text style={styles.trustText}>
                    Powered by Monad Testnet and Onmeta Compliant Settlement Rails
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
    backgroundColor: Colors.nightCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '90%',
    paddingBottom: 24,
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
  rateCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  rateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.paperDim,
    letterSpacing: 0.5,
  },
  rateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.mint,
    marginTop: 2,
  },
  balancePill: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 10,
    color: Colors.paperDim,
  },
  balanceVal: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.paper,
  },
  inputGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.paperDim,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  amountInput: {
    flex: 1,
    color: Colors.paper,
    fontSize: 16,
    fontWeight: '700',
  },
  currencyBadge: {
    color: Colors.mint,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
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
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipActive: {
    backgroundColor: 'rgba(56, 217, 169, 0.15)',
    borderColor: Colors.mint,
  },
  chipText: {
    color: Colors.paperDim,
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.mint,
    fontWeight: '700',
  },
  chipMax: {
    backgroundColor: 'rgba(56, 217, 169, 0.1)',
  },
  chipMaxText: {
    color: Colors.mint,
    fontWeight: '800',
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modeBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.3)',
  },
  modeBtnText: {
    color: Colors.paperDim,
    fontSize: 12,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: Colors.paper,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.paper,
    fontSize: 13,
  },
  inputHint: {
    fontSize: 10,
    color: Colors.paperMuted,
    marginTop: 6,
    lineHeight: 14,
  },
  calcCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcLabel: {
    fontSize: 11,
    color: Colors.paperDim,
  },
  calcVal: {
    fontSize: 11,
    color: Colors.paper,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 4,
  },
  netLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.paper,
  },
  netVal: {
    fontSize: 14,
    fontWeight: '800',
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
    height: 46,
    borderRadius: 24,
    marginBottom: 12,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: Colors.night,
    fontSize: 13,
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
  // Receipt
  receiptWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  receiptBadge: {
    alignItems: 'center',
    marginBottom: 16,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    marginBottom: 16,
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
  explorerBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 217, 169, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.25)',
    height: 42,
    borderRadius: 21,
    marginBottom: 10,
  },
  explorerBtnText: {
    color: Colors.mint,
    fontSize: 12,
    fontWeight: '700',
  },
  doneBtn: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    height: 42,
    borderRadius: 21,
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
