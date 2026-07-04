import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../../constants/colors';
import { useHistoryData } from '../../hooks/useHistoryData';
import { useDeleteActivities } from '../../hooks/useDeleteActivities';
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
  const [historyModalVisible, setHistoryModalVisible] = useState<boolean>(false);

  const {
    recent,
  } = useHistoryData({ feedings, sleepSessions, diapers, events });

  const { selectedIds, setSelectedIds, handleLongPress, handlePress, handleDeleteSelected } =
    useDeleteActivities({ onRefreshData });

  useEffect(() => {
    void onRefreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
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

      {/* Recent Activity Card */}
      <RecentActivityList
        recent={recent}
        onPress={() => setHistoryModalVisible(true)}
      />

      {/* Full History Filter Modal */}
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
  container: {
    flex: 1,
  },
  header: {
    height: 54,
    backgroundColor: C.card,
    borderRadius: 28,
    paddingLeft: 18,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
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
});
