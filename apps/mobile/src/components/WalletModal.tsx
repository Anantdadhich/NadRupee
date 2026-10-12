import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Linking,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAccount } from '../context/AccountContext';
import {
  MONAD_CHAIN_ID,
  RELAYER_ADDRESS,
  TESTNET_PASSKEY_ADDRESS,
  AUSD_CONTRACT_ADDRESS,
} from '../constants/config';
import { getMonadAddressExplorerUrl } from '../services/monadRpc';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  X,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  Coins,
  Zap,
  LogOut,
  Sparkles,
  ArrowRight,
  KeyRound,
  QrCode,
} from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<Props> = ({ visible, onClose }) => {
  const {
    address,
    isConnected,
    isConnecting,
    authType,
    ausdBalance,
    monBalance,
    fxRate,
    connectTestnetPasskey,
    connectBiometricPasskey,
    connectCustomAddress,
    signOut,
  } = useAccount();

  const [copied, setCopied] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [showImport, setShowImport] = useState<boolean>(false);
  const [customAddressInput, setCustomAddressInput] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);

  const handleCopy = async () => {
    if (address) {
      await Clipboard.setStringAsync(address);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenExplorer = () => {
    if (address) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const url = getMonadAddressExplorerUrl(address);
      Linking.openURL(url).catch((err) =>
        console.warn('Could not open Monad explorer URL:', err)
      );
    }
  };

  const handleImportSubmit = () => {
    setImportError(null);
    try {
      connectCustomAddress(customAddressInput.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowImport(false);
      setCustomAddressInput('');
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setImportError(err?.message || 'Invalid address format.');
    }
  };

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    signOut();
    setShowImport(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <ShieldCheck size={18} color={Colors.mint} />
              <Text style={styles.headerTitle}>Monad Account & Security</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color={Colors.paperMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Monad Testnet Network Status Pill */}
            <View style={styles.networkPill}>
              <View style={styles.networkIndicator} />
              <Text style={styles.networkName}>Monad Testnet</Text>
              <Text style={styles.networkChainId}>Chain ID: {MONAD_CHAIN_ID}</Text>
            </View>

            {isConnected && address ? (
              // Connected State
              <View style={styles.connectedCard}>
                <View style={styles.authBadgeRow}>
                  <View style={styles.authBadge}>
                    <Sparkles size={11} color={Colors.mint} />
                    <Text style={styles.authBadgeText}>
                      {authType === 'testnet' ? 'Testnet Passkey' : 'Biometric Passkey'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.mintBright }} />
                    <Text style={styles.statusActive}>Connected</Text>
                  </View>
                </View>

                {/* Address Row */}
                <View style={styles.addressBlock}>
                  <Text style={styles.addressLabel}>ACTIVE ACCOUNT</Text>
                  <Text style={styles.fullAddress}>{address}</Text>

                  <View style={styles.actionBtnRow}>
                    <TouchableOpacity
                      onPress={handleCopy}
                      style={styles.actionBtn}
                      activeOpacity={0.7}
                    >
                      {copied ? (
                        <Check size={12} color={Colors.mint} />
                      ) : (
                        <Copy size={12} color={Colors.paperDim} />
                      )}
                      <Text style={styles.actionBtnText}>{copied ? 'Copied' : 'Copy'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleOpenExplorer}
                      style={styles.actionBtn}
                      activeOpacity={0.7}
                    >
                      <ExternalLink size={12} color={Colors.mint} />
                      <Text style={[styles.actionBtnText, { color: Colors.mint }]}>
                        Monad Explorer
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Balances Card */}
                <View style={styles.balanceGrid}>
                  <View style={styles.balanceBox}>
                    <Text style={styles.balanceLabel}>Agora AUSD</Text>
                    <Text style={styles.balanceVal}>{ausdBalance.toFixed(2)}</Text>
                    <Text style={styles.balanceSub}>
                      ≈ ₹{(ausdBalance * fxRate).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={styles.balanceBox}>
                    <Text style={styles.balanceLabel}>Monad Gas (MON)</Text>
                    <Text style={styles.balanceVal}>{monBalance}</Text>
                    <Text style={[styles.balanceSub, { color: Colors.mintBright }]}>
                      Gas Sponsored
                    </Text>
                  </View>
                </View>

                {/* Relayer Sponsorship Info */}
                <View style={styles.relayerBox}>
                  <Zap size={13} color={Colors.mint} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.relayerTitle}>Zero-Gas User Experience</Text>
                    <Text style={styles.relayerDesc}>
                      Relayer ({RELAYER_ADDRESS.slice(0, 6)}...{RELAYER_ADDRESS.slice(-4)}) sponsors all escrow and transfer transactions on Monad Testnet.
                    </Text>
                  </View>
                </View>

                {/* Receive & Deposit AUSD Card */}
                <View style={styles.receiveCard}>
                  <View style={styles.receiveHeader}>
                    <QrCode size={14} color={Colors.mint} />
                    <Text style={styles.receiveTitle}>RECEIVE AGORA AUSD ON MONAD</Text>
                  </View>

                  <View style={styles.qrRow}>
                    <View style={styles.qrGraphic}>
                      <QrCode size={48} color={Colors.mintBright} />
                      <Text style={styles.qrBadge}>MONAD</Text>
                    </View>

                    <View style={styles.qrDetails}>
                      <Text style={styles.qrTitle}>Testnet Deposit Address</Text>
                      <Text style={styles.qrDesc}>
                        Fund via Monad Testnet EOA. All balances are tracked live.
                      </Text>

                      <TouchableOpacity
                        style={styles.qrCopyBtn}
                        onPress={handleCopy}
                        activeOpacity={0.7}
                      >
                        {copied ? (
                          <Check size={11} color={Colors.night} />
                        ) : (
                          <Copy size={11} color={Colors.night} />
                        )}
                        <Text style={styles.qrCopyBtnText}>
                          {copied ? 'Copied to Clipboard' : 'Copy Full Address'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Faucet and Contract Tools */}
                  <View style={styles.helperRow}>
                    <TouchableOpacity
                      style={styles.helperBtn}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        Linking.openURL('https://testnet.monad.xyz').catch(() => {});
                      }}
                      activeOpacity={0.7}
                    >
                      <ExternalLink size={10} color={Colors.mint} />
                      <Text style={styles.helperBtnText}>Monad Faucet</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.helperBtn}
                      onPress={async () => {
                        await Clipboard.setStringAsync(AUSD_CONTRACT_ADDRESS);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }}
                      activeOpacity={0.7}
                    >
                      {copiedToken ? (
                        <Check size={10} color={Colors.mint} />
                      ) : (
                        <Copy size={10} color={Colors.paperDim} />
                      )}
                      <Text style={styles.helperBtnText}>
                        {copiedToken ? 'Token Copied' : 'Copy AUSD Contract'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Sign Out Button */}
                <TouchableOpacity
                  onPress={handleSignOut}
                  style={styles.signOutBtn}
                  activeOpacity={0.8}
                >
                  <LogOut size={14} color="#f87171" />
                  <Text style={styles.signOutBtnText}>Disconnect Account</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Disconnected State / Auth Options
              <View style={styles.connectCard}>
                <Text style={styles.connectHeading}>Connect to Monad Testnet</Text>
                <Text style={styles.connectSubheading}>
                  Create or import your high-speed passkey account to send AUSD, fund escrows, and cash out to Indian banks.
                </Text>

                {/* Biometric Passkey Option */}
                <TouchableOpacity
                  onPress={connectBiometricPasskey}
                  disabled={isConnecting}
                  style={styles.connectPrimaryBtn}
                  activeOpacity={0.8}
                >
                  <ShieldCheck size={16} color={Colors.night} />
                  <Text style={styles.connectPrimaryText}>
                    {isConnecting ? 'Authenticating...' : 'Sign In with Biometric Passkey'}
                  </Text>
                </TouchableOpacity>

                {/* Testnet Passkey Option */}
                <TouchableOpacity
                  onPress={connectTestnetPasskey}
                  disabled={isConnecting}
                  style={styles.connectSecondaryBtn}
                  activeOpacity={0.8}
                >
                  <Zap size={14} color={Colors.mint} />
                  <Text style={styles.connectSecondaryText}>
                    Use Hackathon Testnet Passkey
                  </Text>
                </TouchableOpacity>

                {/* Import Custom Address */}
                {showImport ? (
                  <View style={styles.importForm}>
                    <Text style={styles.importLabel}>IMPORT MONAD TESTNET ADDRESS</Text>
                    <TextInput
                      style={styles.importInput}
                      value={customAddressInput}
                      onChangeText={setCustomAddressInput}
                      placeholder="0x..."
                      placeholderTextColor={Colors.paperDim}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {importError && (
                      <Text style={styles.importErrorText}>{importError}</Text>
                    )}
                    <View style={styles.importActions}>
                      <TouchableOpacity
                        onPress={() => setShowImport(false)}
                        style={styles.importCancelBtn}
                      >
                        <Text style={styles.importCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleImportSubmit}
                        style={styles.importSubmitBtn}
                      >
                        <Text style={styles.importSubmitText}>Connect Address</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setShowImport(true)}
                    style={styles.importToggleBtn}
                    activeOpacity={0.7}
                  >
                    <KeyRound size={13} color={Colors.paperDim} />
                    <Text style={styles.importToggleText}>
                      Import Custom Monad Address
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
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
    maxHeight: '88%',
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
  networkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    gap: 8,
    marginBottom: 16,
  },
  networkIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.mint,
  },
  networkName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.paper,
  },
  networkChainId: {
    fontSize: 11,
    color: Colors.paperDim,
    fontFamily: 'monospace',
  },
  connectedCard: {
    gap: 14,
  },
  authBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 217, 169, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.3)',
  },
  authBadgeText: {
    color: Colors.mint,
    fontSize: 11,
    fontWeight: '700',
  },
  statusActive: {
    color: Colors.mintBright,
    fontSize: 11,
    fontWeight: '600',
  },
  addressBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.paperDim,
    letterSpacing: 0.8,
  },
  fullAddress: {
    color: Colors.paper,
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    color: Colors.paper,
    fontSize: 11,
    fontWeight: '600',
  },
  balanceGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  balanceBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.paperDim,
    letterSpacing: 0.5,
  },
  balanceVal: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.paper,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  balanceSub: {
    fontSize: 11,
    color: Colors.paperMuted,
  },
  relayerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(56, 217, 169, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.18)',
    borderRadius: 12,
    padding: 12,
  },
  relayerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.mint,
    marginBottom: 2,
  },
  relayerDesc: {
    fontSize: 11,
    color: Colors.paperDim,
    lineHeight: 16,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    marginTop: 6,
  },
  signOutBtnText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '700',
  },
  connectCard: {
    gap: 14,
    paddingVertical: 10,
  },
  connectHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.paper,
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  connectSubheading: {
    fontSize: 13,
    color: Colors.paperMuted,
    lineHeight: 18,
  },
  connectPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.paper,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 6,
  },
  connectPrimaryText: {
    color: Colors.night,
    fontSize: 13,
    fontWeight: '700',
  },
  connectSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 217, 169, 0.12)',
    borderWidth: 1,
    borderColor: Colors.mint,
    paddingVertical: 14,
    borderRadius: 24,
  },
  connectSecondaryText: {
    color: Colors.mint,
    fontSize: 13,
    fontWeight: '700',
  },
  importToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  importToggleText: {
    color: Colors.paperDim,
    fontSize: 12,
    fontWeight: '600',
  },
  importForm: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  importLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.paperDim,
    letterSpacing: 0.8,
  },
  importInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.paper,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  importErrorText: {
    color: '#f87171',
    fontSize: 11,
  },
  importActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  importCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  importCancelText: {
    color: Colors.paperDim,
    fontSize: 12,
  },
  importSubmitBtn: {
    backgroundColor: Colors.mint,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  importSubmitText: {
    color: Colors.night,
    fontSize: 12,
    fontWeight: '700',
  },
  receiveCard: {
    backgroundColor: 'rgba(56, 217, 169, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.18)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  receiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  receiveTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.mintBright,
    letterSpacing: 0.8,
  },
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qrGraphic: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBadge: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.mintBright,
    letterSpacing: 0.6,
    marginTop: 2,
  },
  qrDetails: {
    flex: 1,
    gap: 4,
  },
  qrTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.paper,
  },
  qrDesc: {
    fontSize: 10,
    color: Colors.mutedForeground,
    lineHeight: 14,
  },
  qrCopyBtn: {
    marginTop: 6,
    backgroundColor: Colors.mint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  qrCopyBtnText: {
    color: Colors.night,
    fontSize: 11,
    fontWeight: '700',
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 8,
  },
  helperBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 6,
    borderRadius: 8,
  },
  helperBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.paperDim,
  },
});
