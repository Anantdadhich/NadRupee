import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
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
      style={styles.pageContainer}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={fetchHealth}
          tintColor={Colors.mint}
          colors={[Colors.mint]}
        />
      }
    >
      {/* 1. PORTAL HERO */}
      <View style={styles.portalHero}>
        <View style={styles.darkEyebrow}>
          <Sparkles size={11} color={Colors.mint} />
          <Text style={styles.darkEyebrowText}>
            NADRUPEE · PROTOCOL LAB & DIAGNOSTICS <Text style={styles.eyebrowSub}>MONAD TESTNET</Text>
          </Text>
        </View>

        <Text style={styles.portalH1Em}>Protocol Diagnostics</Text>
        <Text style={styles.portalH1White}>& Gasless Execution</Text>

        <Text style={styles.portalDesc}>
          Verify WebAuthn PRF passkey derivation, Agora AUSD testnet metrics, and gasless EIP-712 relayer execution.
        </Text>
      </View>

      {/* 2. RELAYER HEALTH CARD */}
      <View style={styles.portalCard}>
        <View style={styles.portalCardHeader}>
          <Text style={styles.portalLabel}>GASLESS RELAYER HEALTH</Text>
          <TouchableOpacity
            onPress={fetchHealth}
            disabled={isRefreshing}
            style={styles.refreshRow}
            activeOpacity={0.7}
          >
            <RefreshCw size={11} color={Colors.mutedForeground} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Status:</Text>
          <View style={[styles.badgeMint, relayerHealth?.status === 'error' && { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Check size={10} color={relayerHealth?.status === 'error' ? '#f87171' : Colors.mintBright} />
            <Text style={[styles.badgeMintText, relayerHealth?.status === 'error' && { color: '#f87171' }]}>
              {relayerHealth ? relayerHealth.status : 'checking...'}
            </Text>
          </View>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Relayer Address:</Text>
          <TouchableOpacity
            onPress={() => handleCopy('relayer', RELAYER_ADDRESS)}
            style={styles.codeRow}
            activeOpacity={0.7}
          >
            <Text style={styles.codeText}>
              {RELAYER_ADDRESS.slice(0, 8)}...{RELAYER_ADDRESS.slice(-6)}
            </Text>
            {copiedKey === 'relayer' ? (
              <Check size={11} color={Colors.mint} />
            ) : (
              <Copy size={11} color={Colors.paperDim} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>MON Balance:</Text>
          {relayerHealth ? (
            <Text style={styles.metricValMint}>{relayerHealth.balanceMon} MON</Text>
          ) : (
            <ActivityIndicator size="small" color={Colors.mint} />
          )}
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Monad Block:</Text>
          {blockNumber && blockNumber > 0 ? (
            <Text style={styles.metricVal}>#{blockNumber.toLocaleString()}</Text>
          ) : (
            <ActivityIndicator size="small" color={Colors.paperDim} />
          )}
        </View>

        <View style={styles.cardNoteRow}>
          <Text style={styles.cardNoteText}>
            {relayerHealth?.message || 'Querying Monad Testnet validator RPC...'}
          </Text>
        </View>
      </View>


      {/* 3. VERIFIED CONTRACTS */}
      <View style={[styles.portalCard, { marginTop: 24 }]}>
        <View style={styles.portalCardHeader}>
          <Text style={styles.portalLabel}>MONAD TESTNET CONTRACTS</Text>
        </View>

        <View style={styles.contractsList}>
          {/* Escrow */}
          <View style={styles.contractItem}>
            <View style={styles.contractHeader}>
              <Text style={styles.contractTitle}>Escrow Contract (x402)</Text>
              <Text style={styles.contractChain}>Chain ID: {MONAD_CHAIN_ID}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleCopy('escrow', ESCROW_CONTRACT_ADDRESS)}
              style={styles.codeFullRow}
              activeOpacity={0.7}
            >
              <Text style={styles.codeFullText}>{ESCROW_CONTRACT_ADDRESS}</Text>
              {copiedKey === 'escrow' ? (
                <Check size={12} color={Colors.mint} />
              ) : (
                <Copy size={12} color={Colors.paperDim} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Agora AUSD */}
          <View style={styles.contractItem}>
            <View style={styles.contractHeader}>
              <Text style={styles.contractTitle}>Agora Dollar (AUSD)</Text>
              <Text style={styles.contractChain}>Decimals: 6</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleCopy('ausd', AUSD_CONTRACT_ADDRESS)}
              style={styles.codeFullRow}
              activeOpacity={0.7}
            >
              <Text style={styles.codeFullText}>{AUSD_CONTRACT_ADDRESS}</Text>
              {copiedKey === 'ausd' ? (
                <Check size={12} color={Colors.mint} />
              ) : (
                <Copy size={12} color={Colors.paperDim} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* RPC */}
          <View style={styles.contractItem}>
            <View style={styles.contractHeader}>
              <Text style={styles.contractTitle}>Public JSON-RPC</Text>
              <Text style={styles.contractChain}>HTTP</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleCopy('rpc', MONAD_RPC_URL)}
              style={styles.codeFullRow}
              activeOpacity={0.7}
            >
              <Text style={styles.codeFullText}>{MONAD_RPC_URL}</Text>
              {copiedKey === 'rpc' ? (
                <Check size={12} color={Colors.mint} />
              ) : (
                <Copy size={12} color={Colors.paperDim} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 4. PASSKEY PRF ARCHITECTURE */}
      <View style={[styles.portalCard, { marginTop: 24 }]}>
        <View style={styles.portalCardHeader}>
          <Text style={styles.portalLabel}>PASSKEY CRYPTOGRAPHIC ARCHITECTURE</Text>
        </View>

        <Text style={styles.archDesc}>
          Mera passkeys use standard WebAuthn PRF (pseudo-random function) extensions to deterministically derive a 256-bit entropy seed (m/44'/60'/0'/0/0) directly inside hardware enclaves.
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
  pageContainer: {
    flex: 1,
    backgroundColor: Colors.night,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  portalHero: {
    marginBottom: 24,
  },
  darkEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.25)',
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  darkEyebrowText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(248, 250, 252, 0.75)',
    letterSpacing: 0.5,
  },
  eyebrowSub: {
    color: Colors.mutedForeground,
    marginLeft: 4,
  },
  portalH1Em: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '500',
    color: 'rgba(248, 250, 252, 0.5)',
  },
  portalH1White: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '500',
    color: Colors.paper,
    marginBottom: 10,
  },
  portalDesc: {
    fontSize: 13,
    color: 'rgba(248, 250, 252, 0.65)',
    lineHeight: 18,
  },
  portalCard: {
    backgroundColor: Colors.nightCard,
    borderWidth: 1,
    borderColor: Colors.nightCardBorder,
    borderRadius: 16,
    padding: 20,
  },
  portalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 14,
    marginBottom: 14,
  },
  portalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.mutedForeground,
    letterSpacing: 0.5,
  },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refreshText: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  metricKey: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  badgeMint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 217, 169, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 217, 169, 0.25)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeMintText: {
    color: Colors.mintBright,
    fontSize: 10,
    fontWeight: '600',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeText: {
    color: Colors.paper,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  metricVal: {
    color: Colors.paper,
    fontSize: 12,
    fontWeight: '600',
  },
  metricValMint: {
    color: Colors.mintBright,
    fontSize: 13,
    fontWeight: '600',
  },
  cardNoteRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
    marginTop: 6,
  },
  cardNoteText: {
    fontSize: 11,
    color: Colors.mutedForeground,
    lineHeight: 16,
  },
  contractsList: {
    gap: 12,
  },
  contractItem: {
    gap: 6,
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contractTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.paper,
  },
  contractChain: {
    fontSize: 10,
    color: Colors.mutedForeground,
  },
  codeFullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  codeFullText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: Colors.paper,
    flex: 1,
    marginRight: 6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  archDesc: {
    fontSize: 12,
    color: Colors.mutedForeground,
    lineHeight: 18,
    marginBottom: 14,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specBox: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 10,
  },
  specKey: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.mutedForeground,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  specVal: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mintBright,
  },
});
