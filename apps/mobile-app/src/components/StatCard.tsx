import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { C } from '../constants/colors';

interface Props {
  label: string;
  value: string;
  subtitle?: string | null;
  reverseLayout?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function StatCard({ label, value, subtitle, reverseLayout = false, style }: Props) {
  if (reverseLayout) {
    return (
      <View style={[styles.card, style]}>
        <Text style={styles.valueLarge}>{value}</Text>
        <Text style={styles.labelLarge}>{label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.labelSmall}>{label}</Text>
      <Text style={styles.valueSmall}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 20,
  },
  labelSmall: {
    fontSize: 10,
    fontWeight: '800',
    color: C.muted,
    marginBottom: 6,
    letterSpacing: 1,
  },
  valueSmall: {
    fontSize: 24,
    fontWeight: '800',
    color: C.ink,
  },
  labelLarge: {
    fontSize: 12,
    color: C.muted,
    marginTop: 7,
  },
  valueLarge: {
    fontSize: 26,
    fontWeight: '800',
    color: C.ink,
  },
  subtitle: {
    fontSize: 11,
    color: C.purpleDark,
    marginTop: 6,
    fontWeight: '600',
  },
});
