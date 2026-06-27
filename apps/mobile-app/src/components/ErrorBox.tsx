import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';

interface Props {
  message: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  retryText?: string;
}

export function ErrorBox({ message, style, textStyle, retryText }: Props) {
  return (
    <View style={[styles.box, style]}>
      <Text style={[styles.text, textStyle]}>{message}</Text>
      {retryText ? <Text style={styles.retryText}>{retryText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#FFF0F0',
    borderRadius: 14,
    padding: 12,
  },
  text: {
    color: '#A23B3B',
    fontSize: 12,
    fontWeight: '600',
  },
  retryText: {
    color: '#A23B3B',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
});
