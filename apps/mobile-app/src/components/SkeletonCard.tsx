import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle, Platform } from 'react-native';

interface SkeletonCardProps {
  style?: ViewStyle;
}

export function SkeletonCard({ style }: SkeletonCardProps) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.7,
        duration: 800,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(pulseAnim, {
        toValue: 0.3,
        duration: 800,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);

    Animated.loop(pulse).start();
  }, [pulseAnim]);

  return (
    <View style={[styles.card, style]}>
      {/* Eyebrow placeholder */}
      <Animated.View style={[styles.eyebrow, { opacity: pulseAnim }]} />
      {/* Big title/metric placeholder */}
      <Animated.View style={[styles.largeMetric, { opacity: pulseAnim }]} />
      {/* Body text lines */}
      <Animated.View style={[styles.line, { width: '90%', opacity: pulseAnim }]} />
      <Animated.View style={[styles.line, { width: '75%', opacity: pulseAnim }]} />
      <Animated.View style={[styles.line, { width: '85%', opacity: pulseAnim }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ECECEC',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  eyebrow: {
    width: 90,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F3F0FF',
    marginBottom: 16,
  },
  largeMetric: {
    width: 140,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F3F0FF',
    marginBottom: 20,
  },
  line: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F3F0FF',
    marginBottom: 10,
  },
});
