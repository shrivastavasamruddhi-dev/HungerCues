import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { C } from '../constants/colors';

interface Props {
  title: string;
  description: string;
  icon?: string;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ title, description, icon, style }: Props) {
  return (
    <View style={[styles.card, style]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    borderRadius: 22,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 32,
    marginBottom: 10,
  },
  title: {
    color: C.ink,
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
  },
  description: {
    color: C.muted,
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 16,
  },
});
