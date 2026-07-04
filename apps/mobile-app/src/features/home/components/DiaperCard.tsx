import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../../../constants/colors';
import { DiaperSummary } from '../../history/components/DiaperSummary';

interface Props {
  diaperTodayData: {
    count: number;
    wet: number;
    poopyMixed: number;
    lastChange: string | null;
  };
  formatTime12: (iso: string) => string;
  onQuickLog: () => void;
}

export function DiaperCard({
  diaperTodayData,
  formatTime12,
  onQuickLog,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.titleEmoji}>🧷</Text>
          <View>
            <Text style={styles.titleText}>Diaper</Text>
            <Text style={styles.subtitleText}>
              {diaperTodayData.count} change{diaperTodayData.count !== 1 ? 's' : ''} logged today
            </Text>
          </View>
        </View>
        <TouchableOpacity
          accessibilityLabel="Log new diaper entry"
          onPress={onQuickLog}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>+ Log</Text>
        </TouchableOpacity>
      </View>

      <DiaperSummary
        diaperTodayData={diaperTodayData}
        formatTime12={formatTime12}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 28,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleEmoji: {
    fontSize: 24,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.ink,
  },
  subtitleText: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '600',
    marginTop: 1,
  },
  addButton: {
    backgroundColor: C.purple,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
