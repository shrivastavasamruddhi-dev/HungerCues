import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { C } from '../constants/colors';
import { activityMeta } from '../constants/activityMeta';
import { capitalize } from '../utils/text';
import { formatEventTime } from '../utils/date';
import { api } from '../api';
import { common } from '../styles/common';
import type { Baby, Feeding, SleepSession, DiaperChange, GrowthRecord } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  baby: Baby | null;
  unitSystem: 'metric' | 'imperial';
  onRestore: () => Promise<void>;
}

type DeletedEvent = {
  id: string;
  kind: string;
  icon: string;
  title: string;
  occurredAt: string;
  note: string;
  deletedAt: string | null | undefined;
};

export function DeletedActivitiesModal({ visible, onClose, baby, unitSystem, onRestore }: Props) {
  const [deletedData, setDeletedData] = useState<{
    feedings: Feeding[];
    sleep: SleepSession[];
    diapers: DiaperChange[];
    growth: GrowthRecord[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeleted = async () => {
    if (!baby) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.listDeletedActivities(baby.id);
      setDeletedData(data);
    } catch {
      setError('Could not fetch deleted activities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      void fetchDeleted();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, baby]);

  const deletedEvents = useMemo<DeletedEvent[]>(() => {
    if (!deletedData) return [];
    const { feedings, sleep, diapers, growth } = deletedData;

    const feedingEvents: DeletedEvent[] = feedings.map((item) => ({
      id: `feed-${item.id}`,
      kind: 'feed',
      icon: activityMeta.feed.icon,
      title: `${capitalize(item.type)} Feed`,
      occurredAt: item.start_time,
      note: `${item.breast_side ? `Side: ${item.breast_side} · ` : ''}${item.quantity_ml ? `${item.quantity_ml} ml · ` : ''}${item.duration_minutes} min${item.notes ? ` · ${item.notes}` : ''}`,
      deletedAt: item.deleted_at,
    }));

    const sleepEvents: DeletedEvent[] = sleep.map((item) => ({
      id: `sleep-${item.id}`,
      kind: 'sleep',
      icon: activityMeta.sleep.icon,
      title: item.tracking_method === 'night' ? 'Night Sleep' : 'Sleep Session',
      occurredAt: item.sleep_start,
      note: `${item.duration_minutes ?? 0} min${item.notes ? ` · ${item.notes}` : ''}`,
      deletedAt: item.deleted_at,
    }));

    const diaperEvents: DeletedEvent[] = diapers.map((item) => ({
      id: `diaper-${item.id}`,
      kind: 'diaper',
      icon: activityMeta.diaper.icon,
      title: `${capitalize(item.type)} Diaper`,
      occurredAt: item.changed_at,
      note: item.notes || 'Changed and all clean',
      deletedAt: item.deleted_at,
    }));

    const growthEvents: DeletedEvent[] = growth.map((item) => {
      let detailStr = '';
      if (item.weight_kg) {
        if (unitSystem === 'metric') {
          detailStr += `Weight: ${item.weight_kg} kg`;
        } else {
          const lbs = (item.weight_kg * 2.20462).toFixed(2);
          detailStr += `Weight: ${lbs} lbs`;
        }
      }
      if (item.height_cm) {
        if (detailStr) detailStr += ' · ';
        if (unitSystem === 'metric') {
          detailStr += `Height: ${item.height_cm} cm`;
        } else {
          const inches = (item.height_cm / 2.54).toFixed(1);
          detailStr += `Height: ${inches} in`;
        }
      }
      if (item.notes) {
        if (detailStr) detailStr += ' · ';
        detailStr += item.notes;
      }
      return {
        id: `growth-${item.id}`,
        kind: 'growth',
        icon: activityMeta.growth.icon,
        title: 'Growth Entry',
        occurredAt: item.recorded_at,
        note: detailStr || 'Logged growth',
        deletedAt: item.deleted_at,
      };
    });

    return [...feedingEvents, ...sleepEvents, ...diaperEvents, ...growthEvents].sort(
      (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
    );
  }, [deletedData, unitSystem]);

  const handleRestore = async (eventId: string) => {
    const delimiterIdx = eventId.indexOf('-');
    if (delimiterIdx === -1) return;
    const kind = eventId.substring(0, delimiterIdx);
    const dbIdStr = eventId.substring(delimiterIdx + 1);
    const dbId = parseInt(dbIdStr, 10);
    if (isNaN(dbId)) return;
    try {
      await api.restoreActivity(kind, dbId);
      await fetchDeleted();
      await onRestore();
    } catch {
      Alert.alert('Error', 'Could not restore activity.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={common.modalOverlay}>
        <View style={[common.menuContainer, { maxWidth: 500, maxHeight: '80%', padding: 20 }]}>
          <View style={common.menuHeader}>
            <Text style={[common.menuTitle, { fontSize: 18 }]}>Deleted Activities</Text>
            <TouchableOpacity onPress={onClose} style={common.menuCloseBtn}>
              <Text style={{ fontSize: 16, color: C.muted, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 12, color: C.muted, marginBottom: 16, paddingHorizontal: 4 }}>
            Activities deleted within the last 24 hours are stored here. Restored activities go back
            to history.
          </Text>

          {loading && (
            <ActivityIndicator size="small" color={C.purple} style={{ marginVertical: 20 }} />
          )}

          {error && (
            <Text style={{ color: '#EF4444', textAlign: 'center', marginVertical: 10 }}>
              {error}
            </Text>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {!loading && deletedEvents.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: C.muted }}>
                  No deleted activities
                </Text>
                <Text style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 8 }}>
                  Deleted logs from the past 24 hours will appear here.
                </Text>
              </View>
            ) : (
              deletedEvents.map((event) => (
                <View
                  key={event.id}
                  style={[styles.eventCard, { borderWidth: 1, borderColor: '#E2E8F0' }]}
                >
                  <View style={styles.eventIcon}>
                    <Text style={styles.purpleText}>{event.icon}</Text>
                  </View>
                  <View style={styles.eventBody}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventMeta}>
                      {formatEventTime(event.occurredAt)} · {event.note}
                    </Text>
                    {event.deletedAt && (
                      <Text style={{ fontSize: 9, color: '#EF4444', marginTop: 4 }}>
                        Deleted:{' '}
                        {new Date(event.deletedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => void handleRestore(event.id)}
                    style={styles.restoreBtn}
                  >
                    <Text style={styles.restoreBtnText}>Restore</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  eventCard: {
    minHeight: 72,
    borderRadius: 20,
    backgroundColor: C.card,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventBody: { marginLeft: 12, flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '700' },
  eventMeta: { fontSize: 10, color: C.muted, marginTop: 4 },
  purpleText: { color: C.purpleDark },
  restoreBtn: {
    backgroundColor: C.purpleSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  restoreBtnText: { color: C.purpleDark, fontWeight: '700', fontSize: 11 },
});
