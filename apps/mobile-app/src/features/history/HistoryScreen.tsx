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
  onPressViewDeleted: () => void;
}

export function HistoryScreen({
  events,
  feedings,
  sleepSessions,
  diapers,
  onRefreshData,
  onPressViewDeleted,
}: Props) {
  const [historyModalVisible, setHistoryModalVisible] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);

  const { recent } = useHistoryData({ feedings, sleepSessions, diapers, events });

  const { selectedIds, setSelectedIds, handleLongPress, handlePress, handleDeleteSelected } =
    useDeleteActivities({ onRefreshData });

  useEffect(() => {
    void onRefreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      {/* Absolute Backdrop to close dropdown menu */}
      {showMenu && (
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        />
      )}

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
          <View style={styles.headerActions}>
            <TouchableOpacity
              accessibilityLabel="Open options menu"
              onPress={() => setShowMenu(!showMenu)}
              style={[styles.headerAction, { backgroundColor: '#EFEFEF' }]}
            >
              <Text style={{ fontSize: 18, color: C.ink, fontWeight: '700' }}>⋮</Text>
            </TouchableOpacity>

            {/* Dropdown Menu */}
            {showMenu && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  accessibilityRole="menuitem"
                  onPress={() => {
                    setShowMenu(false);
                    onPressViewDeleted();
                  }}
                  style={styles.dropdownItem}
                >
                  <Text style={styles.dropdownItemEmoji}>🗑️</Text>
                  <Text style={styles.dropdownItemText}>Deleted Activities</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
    zIndex: 10,
  },
  headerTitle: { color: C.ink, fontSize: 16, fontWeight: '600' },
  headerActions: {
    position: 'relative',
    zIndex: 20,
  },
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
  menuBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 5,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 190,
    backgroundColor: C.card,
    borderRadius: 16,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    borderWidth: 1,
    borderColor: '#ECECEC',
    zIndex: 30,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  dropdownItemEmoji: {
    fontSize: 16,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.ink,
  },
});
