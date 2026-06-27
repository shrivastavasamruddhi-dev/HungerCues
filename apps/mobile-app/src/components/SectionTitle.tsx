import React from 'react';
import { Text, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { C } from '../constants/colors';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export function SectionTitle({ children, style }: Props) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 21,
    lineHeight: 25,
    color: C.ink,
    fontWeight: '800',
    marginBottom: 18,
  },
});
