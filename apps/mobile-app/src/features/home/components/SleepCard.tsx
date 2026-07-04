import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../../../constants/colors';
import { SleepGraph } from '../../history/components/SleepGraph';
import type { SleepSession } from '../../../types';

interface Props {
  todaySleepSessions: SleepSession[];
  sleepChartData: { nightMins: number; napMins: number; totalMins: number }[];
  sleepMax: number;
  DAY_LABELS: string[];
  timeToPercent: (iso: string) => number;
  formatDuration: (mins: number) => string;
  formatTime12: (iso: string) => string;
  onQuickLog: () => void;
}

export function SleepCard({
  todaySleepSessions,
  sleepChartData,
  sleepMax,
  DAY_LABELS,
  timeToPercent,
  formatDuration,
  formatTime12,
  onQuickLog,
}: Props) {
  // Compute today's total sleep time in minutes
  const todayMins = todaySleepSessions.reduce(
    (sum, session) => sum + (session.duration_minutes ?? 0),
    0,
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.titleEmoji}>😴</Text>
          <View>
            <Text style={styles.titleText}>Sleep</Text>
            <Text style={styles.subtitleText}>
              {todaySleepSessions.length} session{todaySleepSessions.length !== 1 ? 's' : ''} logged today
            </Text>
          </View>
        </View>
        <TouchableOpacity
          accessibilityLabel="Log new sleep entry"
          onPress={onQuickLog}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>+ Log</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryStat}>
          <Text style={styles.statLabel}>TODAY'S TOTAL SLEEP</Text>
          <Text style={styles.statValue}>
            {todayMins > 0 ? formatDuration(todayMins) : '—'}
          </Text>
        </View>
      </View>

      <SleepGraph
        todaySleepSessions={todaySleepSessions}
        sleepChartData={sleepChartData}
        sleepMax={sleepMax}
        DAY_LABELS={DAY_LABELS}
        timeToPercent={timeToPercent}
        formatDuration={formatDuration}
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
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 14,
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 12,
  },
  summaryStat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    color: '#4F46E5',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: C.ink,
    marginTop: 3,
  },
});
