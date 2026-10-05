import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandMark } from './BrandMark';
import { Colors } from '../theme/colors';
import { useAccount } from '../context/AccountContext';
import { isLocalOrTestEnvironment } from '../constants/config';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Check, Copy, Menu, X, ArrowRight, ShieldCheck } from 'lucide-react-native';
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

  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (address) {
      await Clipboard.setStringAsync(address);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navLinks: { key: TabType; label: string }[] = [
    { key: 'home', label: 'Overview' },
    { key: 'freelancer', label: 'Freelancer Portal' },
    { key: 'client', label: 'Client Portal' },
    { key: 'offramp', label: 'Instant INR Payout' },
    { key: 'protocol', label: 'Protocol Lab' },
  ];

  const handleSelectTab = (tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabChange(tab);
    setMenuOpen(false);
  };

  return (
    <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
      {/* 1. FLOATING NAV SHELL (Exact 1:1 replica of web .nav-shell at mobile size) */}
      <View style={styles.navShell}>
        <TouchableOpacity
          onPress={() => onTabChange('home')}
          activeOpacity={0.8}
          style={styles.brandWrapper}
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
            </View>
          ) : (
            isLocalOrTestEnvironment() && (
              <TouchableOpacity
                onPress={connectTestnetPasskey}
                disabled={isConnecting}
                style={styles.testnetBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.testnetBtnText}>⚡ Testnet Passkey</Text>
              </TouchableOpacity>
            )
          )}

          {/* Round 40x40 Hamburger Menu Button (Matching web .menu-button) */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMenuOpen(!menuOpen);
            }}
            style={styles.menuButton}
            activeOpacity={0.8}
            accessibilityLabel="Toggle navigation"
          >
            {menuOpen ? (
              <X size={19} color={Colors.paper} />
            ) : (
              <Menu size={19} color={Colors.paper} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. FLOATING MOBILE MENU DROPDOWN (Exact 1:1 replica of web .mobile-menu) */}
      {menuOpen && (
        <View style={styles.mobileMenu}>
          {navLinks.map((link, idx) => {
            const isActive = activeTab === link.key;
            const isLast = idx === navLinks.length - 1;
            return (
              <TouchableOpacity
                key={link.key}
                onPress={() => handleSelectTab(link.key)}
                style={[
                  styles.menuItem,
                  !isLast && styles.menuItemBorder,
                  isActive && styles.menuItemActive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.menuItemText,
                    isActive && styles.menuItemTextActive,
                    isLast && styles.menuItemTextLast,
                  ]}
                >
                  {link.label}
                </Text>
                {isActive && (
                  <View style={styles.activeDot} />
                )}
              </TouchableOpacity>
            );
          })}

          {/* Additional Auth Action inside Menu */}
          <View style={styles.menuFooter}>
            {isConnected ? (
              <TouchableOpacity
                onPress={() => {
                  signOut();
                  setMenuOpen(false);
                }}
                style={styles.signOutMenuItem}
                activeOpacity={0.7}
              >
                <Text style={styles.signOutMenuText}>Sign out of Passkey</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  connectBiometricPasskey();
                  setMenuOpen(false);
                }}
                style={styles.biometricMenuItem}
                activeOpacity={0.7}
              >
                <ShieldCheck size={14} color={Colors.night} />
                <Text style={styles.biometricMenuText}>Sign in with Biometric Passkey</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: Colors.night,
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 100,
    position: 'relative',
  },
  navShell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 32,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  brandWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    gap: 5,
  },
  addressText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: Colors.paper,
    fontWeight: '600',
  },
  testnetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 217, 169, 0.15)',
    borderWidth: 1,
    borderColor: Colors.mint,
  },
  testnetBtnText: {
    color: Colors.mint,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Floating Mobile Menu Overlay (Matching web .mobile-menu)
  mobileMenu: {
    position: 'absolute',
    top: 74,
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: 'rgba(22, 34, 36, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  menuItemActive: {
    backgroundColor: 'rgba(56, 217, 169, 0.08)',
    borderRadius: 10,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(248, 250, 252, 0.85)',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  menuItemTextActive: {
    color: Colors.paper,
    fontWeight: '700',
  },
  menuItemTextLast: {
    color: Colors.mintBright,
    fontWeight: '700',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.mint,
  },
  menuFooter: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  signOutMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  signOutMenuText: {
    color: 'rgba(248, 250, 252, 0.5)',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
  biometricMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.paper,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 10,
    marginVertical: 4,
  },
  biometricMenuText: {
    color: Colors.night,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
});
