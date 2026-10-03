import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Colors } from '../theme/colors';

interface Props {
  compact?: boolean;
  size?: number;
}

export const BrandMark: React.FC<Props> = ({ compact = false, size = 18 }) => {
  return (
    <View style={styles.container}>
      <View style={[styles.markWrap, { height: size + 6 }]}>
        <View style={[styles.slash, styles.slash1, { width: size * 0.22, height: size }]} />
        <View style={[styles.slash, styles.slash2, { width: size * 0.22, height: size * 1.25 }]} />
        <View style={[styles.slash, styles.slash3, { width: size * 0.22, height: size * 0.85 }]} />
      </View>
      {!compact && <Text style={styles.brandText}>NadRupee</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
  },
  slash: {
    backgroundColor: Colors.mint,
    borderRadius: 3,
    transform: [{ skewX: '-18deg' }],
  },
  slash1: {
    opacity: 0.65,
    backgroundColor: Colors.mint,
  },
  slash2: {
    opacity: 1,
    backgroundColor: Colors.mintBright,
  },
  slash3: {
    opacity: 0.85,
    backgroundColor: Colors.mint,
  },
  brandText: {
    color: Colors.paper,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
});
