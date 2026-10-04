import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors } from './src/theme/colors';
import { AccountProvider } from './src/context/AccountContext';
import { Header } from './src/components/Header';
import { BottomNav, TabType } from './src/components/BottomNav';
import { HomeScreen } from './src/screens/HomeScreen';
import { FreelancerScreen } from './src/screens/FreelancerScreen';
import { ClientScreen } from './src/screens/ClientScreen';
import { OfframpScreen } from './src/screens/OfframpScreen';
import { ProtocolScreen } from './src/screens/ProtocolScreen';

function MainApp() {
  const [activeTab, setActiveTab] = useState<TabType>('home');

  return (
    <View style={styles.appContainer}>
      <StatusBar style="light" />
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <View style={styles.screenContainer}>
        {activeTab === 'home' && <HomeScreen onNavigateTab={setActiveTab} />}
        {activeTab === 'freelancer' && <FreelancerScreen />}
        {activeTab === 'client' && <ClientScreen />}
        {activeTab === 'offramp' && <OfframpScreen />}
        {activeTab === 'protocol' && <ProtocolScreen />}
      </View>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
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
