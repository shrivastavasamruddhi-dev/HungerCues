import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../constants/colors';
import type { Activity } from '../types';

interface SegmentedControlProps {
  active: 'all' | Activity;
  onChange: (value: 'all' | Activity) => void;
}

export function SegmentedControl({ active, onChange }: SegmentedControlProps) {
  return (
    <View style={styles.segmentRow}>
      {[
        { key: 'all', icon: '', label: 'All' },
        { key: 'feed', icon: '♙', label: 'Feed' },
        { key: 'sleep', icon: '☾', label: 'Sleep' },
        { key: 'diaper', icon: '♢', label: 'Diaper' },
        { key: 'growth', icon: '⚖', label: 'Growth' },
      ].map((item) => (
        <TouchableOpacity
          key={item.key}
          onPress={() => onChange(item.key as 'all' | Activity)}
          style={[styles.segment, active === item.key && styles.segmentActive]}
        >
          {!!item.icon && (
            <Text style={[styles.segmentIcon, active === item.key && styles.white]}>
              {item.icon}
            </Text>
          )}
          <Text style={[styles.segmentText, active === item.key && styles.white]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  segment: {
    minWidth: 82,
    height: 50,
    paddingHorizontal: 17,
    borderRadius: 26,
    backgroundColor: '#DEDEDE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  segmentActive: { backgroundColor: C.purple },
  segmentText: { color: C.muted, fontSize: 15 },
  segmentIcon: { color: C.muted },
  white: { color: '#FFF' },
});
