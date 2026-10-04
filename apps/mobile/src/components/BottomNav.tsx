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
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.navRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handlePress(tab.key)}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Icon
                  size={19}
                  color={isActive ? Colors.mint : Colors.paperDim}
                />
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
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
  container: {
    backgroundColor: Colors.night,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 8,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 58,
  },
  iconWrap: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(56, 217, 169, 0.12)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  tabLabelActive: {
    color: Colors.paper,
    fontWeight: '600',
  },
});
