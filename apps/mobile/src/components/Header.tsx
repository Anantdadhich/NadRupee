import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandMark } from './BrandMark';
import { Colors } from '../theme/colors';
import { useAccount } from '../context/AccountContext';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Zap, Fingerprint, LogOut, Check, Copy } from 'lucide-react-native';

export const Header: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    address,
    isConnected,
    isConnecting,
    connectTestnetPasskey,
    connectBiometricPasskey,
    signOut,
  } = useAccount();

  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (address) {
      await Clipboard.setStringAsync(address);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTestnetLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    connectTestnetPasskey();
  };

  const handleBiometricLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    connectBiometricPasskey();
  };

  return (
    <View style={[styles.wrapper, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
      <View style={styles.topRow}>
        <View style={styles.left}>
          <BrandMark size={16} />
          <View style={styles.testnetBadge}>
            <View style={styles.testnetDot} />
            <Text style={styles.testnetText}>MONAD TESTNET</Text>
          </View>
        </View>

        <View style={styles.right}>
          {isConnected && address ? (
            <View style={styles.connectedRow}>
              <TouchableOpacity
                onPress={handleCopy}
                style={styles.addressPill}
                activeOpacity={0.7}
              >
                <View style={styles.onlineDot} />
                <Text style={styles.addressText}>
                  {address.slice(0, 5)}...{address.slice(-4)}
                </Text>
                {copied ? (
                  <Check size={12} color={Colors.mint} />
                ) : (
                  <Copy size={12} color={Colors.paperDim} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={signOut}
                style={styles.iconButton}
                activeOpacity={0.6}
              >
                <LogOut size={13} color={Colors.paperDim} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.authButtons}>
              <TouchableOpacity
                onPress={handleTestnetLogin}
                disabled={isConnecting}
                style={styles.testnetPasskeyBtn}
                activeOpacity={0.7}
              >
                <Zap size={11} color={Colors.mint} />
                <Text style={styles.testnetPasskeyBtnText}>Testnet Passkey</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleBiometricLogin}
                disabled={isConnecting}
                style={styles.biometricBtn}
                activeOpacity={0.7}
              >
                <Fingerprint size={12} color={Colors.paper} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.night,
    borderBottomWidth: 1,
    borderBottomColor: Colors.nightBorder,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 50,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  testnetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 217, 169, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.25)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  testnetDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.mint,
  },
  testnetText: {
    color: Colors.mint,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.nightElevated,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.mint,
  },
  addressText: {
    color: Colors.paper,
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  iconButton: {
    padding: 6,
    backgroundColor: Colors.nightElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
  },
  authButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testnetPasskeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.mintSoft,
    borderWidth: 1,
    borderColor: Colors.mintBorder,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
  },
  testnetPasskeyBtnText: {
    color: Colors.mintBright,
    fontSize: 11,
    fontWeight: '700',
  },
  biometricBtn: {
    backgroundColor: Colors.nightElevated,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    padding: 6,
    borderRadius: 10,
  },
});
