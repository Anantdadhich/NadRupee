import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '../theme/colors';
import { Check, AlertCircle, Info } from 'lucide-react-native';

export interface ToastConfig {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface Props {
  toast: ToastConfig | null;
  onDismiss: () => void;
}

export const Toast: React.FC<Props> = ({ toast, onDismiss }) => {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (toast) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onDismiss();
        });
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss, opacity, translateY]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <Animated.View
      style={[
        styles.container,
        isSuccess && styles.successBg,
        isError && styles.errorBg,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.iconWrap}>
        {isSuccess && <Check size={14} color={Colors.mintBright} />}
        {isError && <AlertCircle size={14} color="#f87171" />}
        {!isSuccess && !isError && <Info size={14} color={Colors.paper} />}
      </View>
      <Text style={styles.message} numberOfLines={2}>
        {toast.message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(22, 34, 36, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  successBg: {
    borderColor: 'rgba(56, 217, 169, 0.35)',
    backgroundColor: 'rgba(15, 30, 28, 0.96)',
  },
  errorBg: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(35, 18, 20, 0.96)',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontSize: 13,
    color: Colors.paper,
    fontWeight: '600',
    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
  },
});
