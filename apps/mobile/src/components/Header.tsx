import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandMark } from './BrandMark';
import { Colors } from '../theme/colors';
import { useAccount } from '../context/AccountContext';
import { isLocalOrTestEnvironment } from '../constants/config';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Check, Copy } from 'lucide-react-native';
import { TabType } from './BottomNav';

interface Props {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Header: React.FC<Props> = ({ activeTab, onTabChange }) => {
  const insets = useSafeAreaInsets();
  const {
    address,
    isConnected,
    isConnecting,
    connectTestnetPasskey,
    connectBiometricPasskey,
    signOut,
  } = useAccount();

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (address) {
      await Clipboard.setStringAsync(address);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navTabs: { key: TabType; label: string }[] = [
    { key: 'home', label: 'Overview' },
    { key: 'freelancer', label: 'Freelancer' },
    { key: 'client', label: 'Client' },
    { key: 'offramp', label: 'Offramp' },
    { key: 'protocol', label: 'Protocol Lab' },
  ];

  return (
    <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
      {/* 1. FLOATING NAV SHELL (Matching web .nav-shell) */}
      <View style={styles.navShell}>
        <TouchableOpacity
          onPress={() => onTabChange('home')}
          activeOpacity={0.8}
        >
          <BrandMark />
        </TouchableOpacity>

        <View style={styles.navActions}>
          {isConnected && address ? (
            <View style={styles.authStatus}>
              <View style={styles.authDot} />
              <TouchableOpacity
                onPress={handleCopy}
                style={styles.addressPill}
                activeOpacity={0.7}
              >
                <Text style={styles.addressText}>
                  {address.slice(0, 5)}...{address.slice(-4)}
                </Text>
                {copied ? (
                  <Check size={11} color={Colors.mint} />
                ) : (
                  <Copy size={11} color={Colors.paperDim} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={signOut}
                style={styles.signOutBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.signOutText}>Sign out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.authRow}>
              {isLocalOrTestEnvironment() && (
                <TouchableOpacity
                  onPress={connectTestnetPasskey}
                  disabled={isConnecting}
                  style={styles.testnetBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.testnetBtnText}>Testnet Passkey</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={connectBiometricPasskey}
                disabled={isConnecting}
                style={styles.signinBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.signinBtnText}>
                  {isConnecting ? '...' : 'Biometric'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* 2. SUB-NAV PORTAL PILL SWITCHER */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {navTabs.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onTabChange(t.key);
              }}
              style={[styles.tabPill, isActive && styles.tabPillActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: Colors.night,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  navShell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 32,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 46,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.mint,
  },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    color: Colors.paper,
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  signOutBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  signOutText: {
    color: Colors.paperDim,
    fontSize: 10,
    fontWeight: '500',
  },
  authRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testnetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
    backgroundColor: 'rgba(56, 217, 169, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.3)',
  },
  testnetBtnText: {
    color: Colors.mint,
    fontSize: 11,
    fontWeight: '600',
  },
  signinBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  signinBtnText: {
    color: Colors.paper,
    fontSize: 11,
    fontWeight: '600',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    paddingBottom: 2,
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  tabPillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabPillText: {
    color: Colors.paperDim,
    fontSize: 12,
    fontWeight: '500',
  },
  tabPillTextActive: {
    color: Colors.paper,
    fontWeight: '600',
  },
});
