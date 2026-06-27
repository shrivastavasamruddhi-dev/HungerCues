import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../../constants/colors';
import { SectionTitle } from '../../components/SectionTitle';
import { useHistoryData } from '../../hooks/useHistoryData';
import { useDeleteActivities } from '../../hooks/useDeleteActivities';
import { FeedGraph } from './components/FeedGraph';
import { SleepGraph } from './components/SleepGraph';
import { DiaperSummary } from './components/DiaperSummary';
import { RecentActivityList } from './components/RecentActivityList';
import { HistoryModal } from './components/HistoryModal';
import type { TimelineEvent, Feeding, SleepSession, DiaperChange } from '../../types';

interface Props {
  events: TimelineEvent[];
  feedings: Feeding[];
  sleepSessions: SleepSession[];
  diapers: DiaperChange[];
  onRefreshData: () => Promise<void>;
  onBack: () => void;
}

export function HistoryScreen({
  events,
  feedings,
  sleepSessions,
  diapers,
  onRefreshData,
  onBack,
}: Props) {
  const [activeGraph, setActiveGraph] = useState<'feed' | 'sleep' | 'diaper'>('feed');
  const [historyModalVisible, setHistoryModalVisible] = useState<boolean>(false);

  const {
    recent,
    DAY_LABELS,
    feedChartData,
    feedMax,
    todaySleepSessions,
    sleepChartData,
    sleepMax,
    diaperTodayData,
    counts,
    timeToPercent,
    formatDuration,
    formatTime12,
  } = useHistoryData({ feedings, sleepSessions, diapers, events });

  const { selectedIds, setSelectedIds, handleLongPress, handlePress, handleDeleteSelected } =
    useDeleteActivities({ onRefreshData });

  useEffect(() => {
    void onRefreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View>
      {/* ── Header ── */}
      {selectedIds.length > 0 ? (
        <View style={[styles.header, { backgroundColor: C.purpleSoft, paddingRight: 10 }]}>
          <TouchableOpacity
            onPress={() => setSelectedIds([])}
            style={{ paddingVertical: 8, paddingHorizontal: 4 }}
          >
            <Text style={{ color: C.purpleDark, fontWeight: '700', fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.purpleDark, fontWeight: '800' }]}>
            {selectedIds.length} Selected
          </Text>
          <TouchableOpacity onPress={handleDeleteSelected} style={styles.deleteBtn}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.header, { paddingRight: 6 }]}>
          <Text style={styles.headerTitle}>History</Text>
          <TouchableOpacity
            accessibilityLabel="Go back"
            onPress={onBack}
            style={[styles.headerAction, { backgroundColor: '#EFEFEF' }]}
          >
            <Text style={{ fontSize: 18, color: C.ink, fontWeight: '700' }}>←</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Stat Chip Buttons ── */}
      <SectionTitle>Today's Summary</SectionTitle>
      <View style={styles.chips}>
        {(
          [
            {
              key: 'feed',
              label: `${counts.feed} feed${counts.feed !== 1 ? 's' : ''}`,
              icon: '🍼',
            },
            {
              key: 'sleep',
              label: `${counts.sleep} sleep session${counts.sleep !== 1 ? 's' : ''}`,
              icon: '😴',
            },
            {
              key: 'diaper',
              label: `${counts.diaper} diaper${counts.diaper !== 1 ? 's' : ''}`,
              icon: '🧷',
            },
          ] as { key: 'feed' | 'sleep' | 'diaper'; label: string; icon: string }[]
        ).map((chip) => (
          <TouchableOpacity
            key={chip.key}
            onPress={() => setActiveGraph(chip.key)}
            style={[
              styles.chip,
              activeGraph === chip.key && {
                backgroundColor: C.purple,
                shadowColor: C.purple,
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                activeGraph === chip.key && { color: '#FFF', fontWeight: '700' },
              ]}
            >
              {chip.icon} {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Graph / Summary Component ── */}
      {activeGraph === 'feed' && (
        <FeedGraph feedChartData={feedChartData} feedMax={feedMax} DAY_LABELS={DAY_LABELS} />
      )}

      {activeGraph === 'sleep' && (
        <SleepGraph
          todaySleepSessions={todaySleepSessions}
          sleepChartData={sleepChartData}
          sleepMax={sleepMax}
          DAY_LABELS={DAY_LABELS}
          timeToPercent={timeToPercent}
          formatDuration={formatDuration}
          formatTime12={formatTime12}
        />
      )}

      {activeGraph === 'diaper' && (
        <DiaperSummary diaperTodayData={diaperTodayData} formatTime12={formatTime12} />
      )}

      {/* ── Recent Activity ── */}
      <RecentActivityList recent={recent} onPress={() => setHistoryModalVisible(true)} />

      <HistoryModal
        visible={historyModalVisible}
        onClose={() => {
          setSelectedIds([]);
          setHistoryModalVisible(false);
        }}
        events={events}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        handleLongPress={handleLongPress}
        handlePress={handlePress}
        handleDeleteSelected={handleDeleteSelected}
        onRefreshData={onRefreshData}
      />
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
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 18,
  },
  chip: { backgroundColor: C.card, paddingVertical: 9, paddingHorizontal: 13, borderRadius: 18 },
  chipText: { fontSize: 11, color: C.ink },
});
