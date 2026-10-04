import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Colors } from '../theme/colors';

interface Props {
  compact?: boolean;
}

export const BrandMark: React.FC<Props> = ({ compact = false }) => {
  return (
    <View style={styles.brandLockup}>
      <View style={styles.brandMark}>
        <View style={styles.col1}>
          <View style={styles.square} />
          <View style={styles.square} />
        </View>
        <View style={styles.tallBar} />
      </View>
      {!compact && <Text style={styles.brandName}>NadRupee</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandMark: {
    flexDirection: 'row',
    gap: 2,
    transform: [{ skewY: '-12deg' }],
  },
  col1: {
    flexDirection: 'column',
    gap: 2,
  },
  square: {
    width: 6,
    height: 9,
    backgroundColor: Colors.paper,
    borderRadius: 1,
  },
  tallBar: {
    width: 6,
    height: 20,
    backgroundColor: Colors.paper,
    borderRadius: 1,
  },
  brandName: {
    color: Colors.paper,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
