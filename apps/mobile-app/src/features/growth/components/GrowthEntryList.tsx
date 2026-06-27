import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C } from '../../../constants/colors';
import { SectionTitle } from '../../../components/SectionTitle';
import { EmptyState } from '../../../components/EmptyState';
import type { GrowthRecord } from '../../../types';

interface Props {
  sorted: GrowthRecord[];
  displayWeight: (kg: number | null | undefined) => string;
  displayHeight: (cm: number | null | undefined) => string;
}

export function GrowthEntryList({ sorted, displayWeight, displayHeight }: Props) {
  if (sorted.length === 0) {
    return (
      <EmptyState
        title="No growth entries yet"
        description="Tap the button above to log weight or height."
        style={{ marginTop: 24 }}
      />
    );
  }

  return (
    <View style={{ marginTop: 24 }}>
      <SectionTitle>All Entries</SectionTitle>
      {[...sorted].reverse().map((r) => (
        <View key={r.id} style={styles.historyCard}>
          <View style={styles.historyIconCircle}>
            <Text style={{ fontSize: 20 }}>⚖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>
              {r.weight_kg != null ? displayWeight(r.weight_kg) : ''}
              {r.weight_kg != null && r.height_cm != null ? ' · ' : ''}
              {r.height_cm != null ? displayHeight(r.height_cm) : ''}
            </Text>
            <Text style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
              {new Date(r.recorded_at).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}{' '}
              {new Date(r.recorded_at).toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
            {r.notes && (
              <Text style={{ fontSize: 11, color: '#666', marginTop: 2, fontStyle: 'italic' }}>
                {r.notes}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  historyCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
