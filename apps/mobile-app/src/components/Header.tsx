import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../constants/colors';

interface HeaderProps {
  title: string;
  action?: React.ReactNode;
  onPress?: () => void;
}

export function Header({ title, action = '⋮', onPress }: HeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity
        accessibilityLabel={title + ' Action'}
        onPress={onPress}
        style={styles.headerAction}
      >
        {typeof action === 'string' ? (
          <Text style={styles.headerActionText}>{action}</Text>
        ) : (
          action
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 54,
    backgroundColor: C.card,
    borderRadius: 28,
    paddingLeft: 18,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 26,
  },
  headerTitle: { color: C.ink, fontSize: 16, fontWeight: '600' },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionText: { fontSize: 20, color: '#FFF', fontWeight: '600' },
});
