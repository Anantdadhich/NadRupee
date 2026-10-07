import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import * as Haptics from 'expo-haptics';
import {
  Home,
  Briefcase,
  Users,
  Banknote,
  Cpu,
} from 'lucide-react-native';

export type TabType = 'home' | 'freelancer' | 'client' | 'offramp' | 'protocol';

interface Props {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNav: React.FC<Props> = ({ activeTab, onTabChange }) => {
  const insets = useSafeAreaInsets();

  const tabs: { key: TabType; label: string; icon: React.FC<{ size: number; color: string }> }[] = [
    { key: 'home', label: 'Overview', icon: Home },
    { key: 'freelancer', label: 'Freelancer', icon: Briefcase },
    { key: 'client', label: 'Client', icon: Users },
    { key: 'offramp', label: 'Offramp', icon: Banknote },
    { key: 'protocol', label: 'Protocol', icon: Cpu },
  ];

  const handlePress = (tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabChange(tab);
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.floatingWrap,
        { bottom: Math.max(insets.bottom, 12) + 2 },
      ]}
    >
      <View style={styles.capsule}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handlePress(tab.key)}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <Icon
                size={17}
                color={isActive ? Colors.mintBright : 'rgba(248, 250, 252, 0.55)'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 99,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 440,
    backgroundColor: 'rgba(16, 22, 20, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 36,
    paddingHorizontal: 6,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderRadius: 24,
    gap: 3,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(56, 217, 169, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.28)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(248, 250, 252, 0.55)',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: Colors.mintBright,
    fontWeight: '700',
  },
});

