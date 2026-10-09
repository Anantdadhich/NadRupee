import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { Colors } from '../theme/colors';
import { TransactionLedgerItem } from '../constants/config';
import { getMonadTxExplorerUrl } from '../services/monadRpc';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  X,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Share2,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  item: TransactionLedgerItem | null;
}

export const TransactionReceiptModal: React.FC<Props> = ({ visible, onClose, item }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!item) return null;

  const handleCopy = async (key: string, text: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenExplorer = () => {
    if (item.onchainTxHash) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const url = getMonadTxExplorerUrl(item.onchainTxHash);
      Linking.openURL(url).catch((err) =>
        console.warn('Could not open Monad explorer URL:', err)
      );
    }
  };

  const handleShareReceipt = async () => {
    const summary = [
      '--- NadRupee Transaction Receipt ---',
      `Type: ${item.type}`,
      `Description: ${item.description}`,
      `Amount INR: ₹${item.amountInr.toLocaleString('en-IN')}`,
      `Amount AUSD: $${item.amountUsd.toFixed(2)} AUSD`,
      item.referenceCode ? `IMPS UTR: ${item.referenceCode}` : null,
      item.onchainTxHash ? `Monad Tx: ${item.onchainTxHash}` : null,
      'Network: Monad Testnet (Chain ID 10143)',
      'Status: Verified & Settled On-Chain',
      '------------------------------------',
    ]
      .filter(Boolean)
      .join('\n');

    await Clipboard.setStringAsync(summary);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedKey('share');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Receipt size={18} color={Colors.mint} />
              <Text style={styles.headerTitle}>Transaction Receipt</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color={Colors.paperMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Success Status Badge */}
            <View style={styles.statusBadgeWrap}>
              <View style={styles.iconCircle}>
                <CheckCircle2 size={36} color={Colors.mint} />
              </View>
              <Text style={styles.statusHeading}>Settled & Verified</Text>
              <Text style={styles.statusSub}>Monad Testnet · Gas Sponsored</Text>
            </View>

            {/* Big Amount Card */}
            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>{item.type.toUpperCase()}</Text>
              <Text
                style={[
                  styles.amountBigInr,
                  item.isCredit ? styles.creditColor : styles.debitColor,
                ]}
              >
                {item.isCredit ? '+' : '-'}₹{item.amountInr.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.amountSubUsd}>
                {item.isCredit ? '+' : '-'}${item.amountUsd.toFixed(2)} Agora AUSD
              </Text>
            </View>

            {/* Receipt Details Breakdown */}
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>DESCRIPTION</Text>
                <Text style={styles.detailVal} numberOfLines={2}>
                  {item.description}
                </Text>
              </View>

              <View style={styles.separator} />

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>TIMESTAMP</Text>
                <Text style={styles.detailValMuted}>{item.timestamp}</Text>
              </View>

              {item.referenceCode && (
                <>
                  <View style={styles.separator} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>IMPS 12-DIGIT UTR</Text>
                    <TouchableOpacity
                      onPress={() => handleCopy('utr', item.referenceCode!)}
                      style={styles.copyableRow}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.detailValCode}>{item.referenceCode}</Text>
                      {copiedKey === 'utr' ? (
                        <Check size={12} color={Colors.mint} />
                      ) : (
                        <Copy size={12} color={Colors.paperDim} />
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {item.onchainTxHash && (
                <>
                  <View style={styles.separator} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>ON-CHAIN TX HASH</Text>
                    <TouchableOpacity
                      onPress={() => handleCopy('tx', item.onchainTxHash!)}
                      style={styles.copyableRow}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.detailValCode}>
                        {item.onchainTxHash.slice(0, 10)}...{item.onchainTxHash.slice(-8)}
                      </Text>
                      {copiedKey === 'tx' ? (
                        <Check size={12} color={Colors.mint} />
                      ) : (
                        <Copy size={12} color={Colors.paperDim} />
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <View style={styles.separator} />

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>SETTLEMENT PROTOCOL</Text>
                <View style={styles.badgeMint}>
                  <ShieldCheck size={11} color={Colors.mintBright} />
                  <Text style={styles.badgeMintText}>Monad Instant Escrow</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsStack}>
              {item.onchainTxHash && (
                <TouchableOpacity
                  onPress={handleOpenExplorer}
                  style={styles.explorerBtn}
                  activeOpacity={0.8}
                >
                  <ExternalLink size={14} color={Colors.mint} />
                  <Text style={styles.explorerBtnText}>Inspect on Monad Explorer</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleShareReceipt}
                style={styles.shareBtn}
                activeOpacity={0.8}
              >
                {copiedKey === 'share' ? (
                  <Check size={14} color={Colors.night} />
                ) : (
                  <Share2 size={14} color={Colors.night} />
                )}
                <Text style={styles.shareBtnText}>
                  {copiedKey === 'share' ? 'Receipt Copied to Clipboard!' : 'Copy Receipt Summary'}
                </Text>
              </TouchableOpacity>
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
    maxHeight: '90%',
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
    paddingTop: 20,
  },
  statusBadgeWrap: {
    alignItems: 'center',
    marginBottom: 18,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(56, 217, 169, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statusHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.paper,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  statusSub: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 3,
  },
  amountCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: Colors.paperMuted,
    marginBottom: 6,
  },
  amountBigInr: {
    fontSize: 30,
    fontWeight: '800',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  creditColor: {
    color: Colors.mintBright,
  },
  debitColor: {
    color: Colors.paper,
  },
  amountSubUsd: {
    fontSize: 13,
    color: Colors.paperDim,
    fontWeight: '500',
    marginTop: 4,
  },
  detailsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailKey: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: Colors.paperMuted,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.paper,
    maxWidth: '60%',
    textAlign: 'right',
  },
  detailValMuted: {
    fontSize: 13,
    color: Colors.paperDim,
    fontWeight: '500',
  },
  detailValCode: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: Colors.mintBright,
    fontWeight: '600',
  },
  copyableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 10,
  },
  badgeMint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 217, 169, 0.12)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  badgeMintText: {
    color: Colors.mintBright,
    fontSize: 11,
    fontWeight: '700',
  },
  actionsStack: {
    gap: 10,
    marginBottom: 24,
  },
  explorerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 217, 169, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.25)',
    paddingVertical: 13,
    borderRadius: 14,
  },
  explorerBtnText: {
    color: Colors.mint,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.paper,
    paddingVertical: 13,
    borderRadius: 14,
  },
  shareBtnText: {
    color: Colors.night,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
});
