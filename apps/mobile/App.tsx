import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors } from './src/theme/colors';
import { AccountProvider } from './src/context/AccountContext';
import { Header } from './src/components/Header';
import { TabType } from './src/components/BottomNav';
import { HomeScreen } from './src/screens/HomeScreen';
import { FreelancerScreen } from './src/screens/FreelancerScreen';
import { ClientScreen } from './src/screens/ClientScreen';
import { OfframpScreen } from './src/screens/OfframpScreen';
import { ProtocolScreen } from './src/screens/ProtocolScreen';

// Inject Google Font Manrope in Web/Browser environment for authentic web twin typography
if (typeof document !== 'undefined') {
  const fontId = 'nadrupee-manrope-font';
  if (!document.getElementById(fontId)) {
    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }
}

function MainApp() {
  const [activeTab, setActiveTab] = useState<TabType>('home');

  return (
    <View style={styles.appContainer}>
      <StatusBar style="light" />
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <View style={styles.screenContainer}>
        {activeTab === 'home' && <HomeScreen onNavigateTab={setActiveTab} />}
        {activeTab === 'freelancer' && <FreelancerScreen onNavigateTab={setActiveTab} />}
        {activeTab === 'client' && <ClientScreen onNavigateTab={setActiveTab} />}
        {activeTab === 'offramp' && <OfframpScreen onNavigateTab={setActiveTab} />}
        {activeTab === 'protocol' && <ProtocolScreen />}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AccountProvider>
        <MainApp />
      </AccountProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: Colors.night,
  },
  screenContainer: {
    flex: 1,
  },
});
