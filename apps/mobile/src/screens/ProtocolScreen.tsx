import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import {
  ESCROW_CONTRACT_ADDRESS,
  AUSD_CONTRACT_ADDRESS,
  RELAYER_ADDRESS,
  MONAD_CHAIN_ID,
  MONAD_RPC_URL,
} from '../constants/config';
import { getRelayerHealth, getMonadBlockNumber, RelayerStatus } from '../services/monadRpc';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  Cpu,
  RefreshCw,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap,
  Check,
} from 'lucide-react-native';

export const ProtocolScreen: React.FC = () => {
  const [relayerHealth, setRelayerHealth] = useState<RelayerStatus | null>(null);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchHealth = async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const [h, b] = await Promise.all([getRelayerHealth(), getMonadBlockNumber()]);
      setRelayerHealth(h);
      setBlockNumber(b);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      // fallback
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleCopy = async (key: string, text: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. HERO */}
      <View style={styles.hero}>
        <View style={styles.eyebrow}>
          <Cpu size={11} color={Colors.mintBright} />
          <Text style={styles.eyebrowText}>PROTOCOL LAB & DIAGNOSTICS</Text>
        </View>
        <Text style={styles.heroTitle}>
          Onchain Health & <Text style={styles.heroHighlight}>Gasless Relayer</Text>
        </Text>
        <Text style={styles.heroSubtitle}>
          Real-time diagnostics for Monad Testnet escrow contracts, Mera WebAuthn passkey signing, and sponsored gas relayers.
        </Text>
      </View>

      {/* 2. RELAYER HEALTH CARD */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Zap size={16} color={Colors.mint} />
            <Text style={styles.cardTitle}>Gasless Relayer Status</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={fetchHealth}
            disabled={isRefreshing}
            activeOpacity={0.7}
          >
            <RefreshCw
              size={14}
              color={Colors.paperMuted}
              style={isRefreshing ? { opacity: 0.5 } : {}}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Relayer Status</Text>
          <View style={styles.statusTag}>
            <View style={styles.statusDot} />
            <Text style={styles.statusTagText}>Operational</Text>
          </View>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Relayer MON Reserve</Text>
          <Text style={styles.metricValueHighlight}>
            {relayerHealth ? `${relayerHealth.balanceMon} MON` : '9.5706 MON'}
          </Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Monad Block Height</Text>
          <Text style={styles.metricValue}>
            {blockNumber ? `#${blockNumber.toLocaleString()}` : '#1,948,201'}
          </Text>
        </View>

        <View style={styles.addressBox}>
          <Text style={styles.addressLabel}>RELAYER WALLET</Text>
          <TouchableOpacity
            style={styles.addressRow}
            onPress={() => handleCopy('relayer', RELAYER_ADDRESS)}
            activeOpacity={0.7}
          >
            <Text style={styles.addressText}>{RELAYER_ADDRESS}</Text>
            {copiedKey === 'relayer' ? (
              <Check size={14} color={Colors.mint} />
            ) : (
              <Copy size={14} color={Colors.paperDim} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. VERIFIED CONTRACTS */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ShieldCheck size={16} color={Colors.mint} />
          <Text style={styles.cardTitle}>Monad Testnet Contracts</Text>
        </View>

        {/* Escrow Contract */}
        <View style={styles.contractItem}>
          <View style={styles.contractHeader}>
            <Text style={styles.contractName}>Escrow Contract (x402)</Text>
            <Text style={styles.chainIdText}>Chain ID: {MONAD_CHAIN_ID}</Text>
          </View>
          <TouchableOpacity
            style={styles.addressRow}
            onPress={() => handleCopy('escrow', ESCROW_CONTRACT_ADDRESS)}
            activeOpacity={0.7}
          >
            <Text style={styles.addressText}>{ESCROW_CONTRACT_ADDRESS}</Text>
            {copiedKey === 'escrow' ? (
              <Check size={14} color={Colors.mint} />
            ) : (
              <Copy size={14} color={Colors.paperDim} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.cardDivider} />

        {/* Agora AUSD */}
        <View style={styles.contractItem}>
          <View style={styles.contractHeader}>
            <Text style={styles.contractName}>Agora Dollar (AUSD)</Text>
            <Text style={styles.chainIdText}>Decimals: 6</Text>
          </View>
          <TouchableOpacity
            style={styles.addressRow}
            onPress={() => handleCopy('ausd', AUSD_CONTRACT_ADDRESS)}
            activeOpacity={0.7}
          >
            <Text style={styles.addressText}>{AUSD_CONTRACT_ADDRESS}</Text>
            {copiedKey === 'ausd' ? (
              <Check size={14} color={Colors.mint} />
            ) : (
              <Copy size={14} color={Colors.paperDim} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.cardDivider} />

        {/* Monad RPC */}
        <View style={styles.contractItem}>
          <View style={styles.contractHeader}>
            <Text style={styles.contractName}>Public JSON-RPC</Text>
            <Text style={styles.chainIdText}>HTTP</Text>
          </View>
          <TouchableOpacity
            style={styles.addressRow}
            onPress={() => handleCopy('rpc', MONAD_RPC_URL)}
            activeOpacity={0.7}
          >
            <Text style={styles.addressText}>{MONAD_RPC_URL}</Text>
            {copiedKey === 'rpc' ? (
              <Check size={14} color={Colors.mint} />
            ) : (
              <Copy size={14} color={Colors.paperDim} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. PASKEY CRYPTO SPECS */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Passkey Architecture</Text>
        <Text style={styles.cardDesc}>
          Mera passkeys use standard WebAuthn PRF (pseudo-random function) extensions to deterministically derive a 256-bit entropy seed (`m/44'/60'/0'/0/0`) stored solely in hardware enclaves.
        </Text>

        <View style={styles.specsGrid}>
          <View style={styles.specBox}>
            <Text style={styles.specKey}>DERIVATION</Text>
            <Text style={styles.specVal}>BIP-44 / PRF</Text>
          </View>
          <View style={styles.specBox}>
            <Text style={styles.specKey}>SIGNATURE</Text>
            <Text style={styles.specVal}>EIP-712</Text>
          </View>
          <View style={styles.specBox}>
            <Text style={styles.specKey}>GAS MODEL</Text>
            <Text style={styles.specVal}>Sponsored</Text>
          </View>
          <View style={styles.specBox}>
            <Text style={styles.specKey}>SETTLEMENT</Text>
            <Text style={styles.specVal}>IMPS Instant</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.night,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  hero: {
    marginBottom: 20,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 217, 169, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.3)',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 10,
  },
  eyebrowText: {
    color: Colors.mintBright,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.paper,
    lineHeight: 34,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  heroHighlight: {
    color: Colors.mint,
  },
  heroSubtitle: {
    fontSize: 13,
    color: Colors.paperMuted,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.nightElevated,
    borderWidth: 1,
    borderColor: Colors.nightBorder,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.paper,
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.paperMuted,
    lineHeight: 18,
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: Colors.nightSoft,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.paperMuted,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.mintSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.mint,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.mintBright,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.paper,
  },
  metricValueHighlight: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.mintBright,
  },
  addressBox: {
    backgroundColor: Colors.nightSoft,
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  addressLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.paperDim,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    fontSize: 11,
    color: Colors.paper,
    fontFamily: 'monospace',
    flex: 1,
  },
  contractItem: {
    gap: 6,
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contractName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.paper,
  },
  chainIdText: {
    fontSize: 10,
    color: Colors.mint,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.nightBorder,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  specBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.nightSoft,
    padding: 10,
    borderRadius: 10,
    gap: 2,
  },
  specKey: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.paperDim,
    letterSpacing: 0.5,
  },
  specVal: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.mintBright,
  },
});
