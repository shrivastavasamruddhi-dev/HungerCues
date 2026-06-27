import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { C } from '../../constants/colors';
import { feedingService } from '../../services/feedingService';
import { sleepService } from '../../services/sleepService';
import { diaperService } from '../../services/diaperService';
import { growthService } from '../../services/growthService';
import { formatEventTime } from '../../utils/date';
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
  const recent = useMemo(() => events.filter((e) => e.kind !== 'growth').slice(0, 20), [events]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeGraph, setActiveGraph] = useState<'feed' | 'sleep' | 'diaper'>('feed');
  // For sleep swipeable (0 = timeline, 1 = weekly bar chart)
  const [sleepView, setSleepView] = useState<0 | 1>(0);
  const sleepSwipeX = useRef(new Animated.Value(0)).current;
  const sleepPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dy) < 20,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) {
          setSleepView(1);
        } else if (g.dx > 40) {
          setSleepView(0);
        }
        Animated.spring(sleepSwipeX, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
      },
      onPanResponderMove: (_, g) => sleepSwipeX.setValue(g.dx),
    }),
  ).current;

  useEffect(() => {
    void onRefreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const today = new Date();
  const dayStart = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offsetDays);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const dayEnd = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offsetDays);
    d.setHours(23, 59, 59, 999);
    return d;
  };
  const DAY_LABELS = Array.from({ length: 7 }, (_, i) => {
    const d = dayStart(6 - i);
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  });

  // ── Feed graph data (7 days, breast ml estimated 120ml/session) ─────────────
  const feedChartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const offset = 6 - i;
      const ds = dayStart(offset);
      const de = dayEnd(offset);
      const dayFeedings = feedings.filter((f) => {
        const t = new Date(f.start_time).getTime();
        return t >= ds.getTime() && t <= de.getTime();
      });
      const bottleMl = dayFeedings
        .filter((f) => f.type === 'bottle')
        .reduce((s, f) => s + (f.quantity_ml ?? 0), 0);
      const breastMl = dayFeedings
        .filter((f) => f.type === 'breast')
        .reduce((s, f) => s + (f.duration_minutes ?? 0) * 4, 0); // ~4ml/min estimate
      return { bottleMl, breastMl, total: bottleMl + breastMl };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedings]);
  const feedMax = Math.max(...feedChartData.map((d) => d.total), 1);

  // ── Sleep graph data ────────────────────────────────────────────────────────
  // Today's sessions for timeline
  const todaySleepSessions = useMemo(() => {
    const ds = dayStart(0);
    const de = dayEnd(0);
    return sleepSessions.filter((s) => {
      const t = new Date(s.sleep_start).getTime();
      return t >= ds.getTime() && t <= de.getTime();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepSessions]);

  // 7-day weekly sleep data
  const sleepChartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const offset = 6 - i;
      const ds = dayStart(offset);
      const de = dayEnd(offset);
      const daySessions = sleepSessions.filter((s) => {
        const t = new Date(s.sleep_start).getTime();
        return t >= ds.getTime() && t <= de.getTime();
      });
      const nightMins = daySessions
        .filter((s) => s.tracking_method === 'night')
        .reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);
      const napMins = daySessions
        .filter((s) => s.tracking_method !== 'night')
        .reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);
      return { nightMins, napMins, totalMins: nightMins + napMins };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepSessions]);
  const sleepMax = Math.max(...sleepChartData.map((d) => d.totalMins), 1);

  // ── Diaper data ─────────────────────────────────────────────────────────────
  const diaperTodayData = useMemo(() => {
    const ds = dayStart(0);
    const de = dayEnd(0);
    const todayDiapers = diapers.filter((d) => {
      const t = new Date(d.changed_at).getTime();
      return t >= ds.getTime() && t <= de.getTime();
    });
    const sorted = [...todayDiapers].sort(
      (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
    );
    return {
      count: todayDiapers.length,
      wet: todayDiapers.filter((d) => d.type === 'wet').length,
      dirty: todayDiapers.filter((d) => d.type === 'dirty' || d.type === 'both').length,
      lastChange: sorted[0]?.changed_at ?? null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diapers]);

  // ── Counts for today ────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const ds = dayStart(0);
    const de = dayEnd(0);
    return {
      feed: feedings.filter((f) => {
        const t = new Date(f.start_time).getTime();
        return t >= ds.getTime() && t <= de.getTime();
      }).length,
      sleep: sleepSessions.filter((s) => {
        const t = new Date(s.sleep_start).getTime();
        return t >= ds.getTime() && t <= de.getTime();
      }).length,
      diaper: diapers.filter((d) => {
        const t = new Date(d.changed_at).getTime();
        return t >= ds.getTime() && t <= de.getTime();
      }).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedings, sleepSessions, diapers]);

  // ── Event handlers ──────────────────────────────────────────────────────────
  const handleLongPress = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handlePress = (id: string) => {
    if (selectedIds.length > 0) {
      handleLongPress(id);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const confirmMsg = `Are you sure you want to delete the ${selectedIds.length} selected activities?`;
    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        void executeDelete();
      }
    } else {
      Alert.alert('Confirm Delete', confirmMsg, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void executeDelete(),
        },
      ]);
    }
  };

  const executeDelete = async () => {
    try {
      await Promise.all(
        selectedIds.map(async (selectedId) => {
          const delimiterIdx = selectedId.indexOf('-');
          if (delimiterIdx === -1) return;
          const kind = selectedId.substring(0, delimiterIdx);
          const dbIdStr = selectedId.substring(delimiterIdx + 1);
          const dbId = parseInt(dbIdStr, 10);
          if (isNaN(dbId)) return;

          if (kind === 'feed') {
            await feedingService.deleteFeeding(dbId);
          } else if (kind === 'sleep') {
            await sleepService.deleteSleep(dbId);
          } else if (kind === 'diaper') {
            await diaperService.deleteDiaper(dbId);
          } else if (kind === 'growth') {
            await growthService.deleteGrowth(dbId);
          }
        }),
      );
      setSelectedIds([]);
      await onRefreshData();
    } catch {
      if (Platform.OS === 'web') {
        alert('Failed to delete some activities. Please check connection and try again.');
      } else {
        Alert.alert(
          'Error',
          'Failed to delete some activities. Please check connection and try again.',
        );
      }
    }
  };

  // ── Sleep timeline helpers ─────────────────────────────────────────────────
  const timeToPercent = (iso: string) => {
    const d = new Date(iso);
    return (d.getHours() * 60 + d.getMinutes()) / (24 * 60);
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const formatTime12 = (iso: string) => {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

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
      <Text style={styles.sectionTitle}>Today's Summary</Text>
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

      {/* ── FEED GRAPH ── */}
      {activeGraph === 'feed' && (
        <View
          style={[
            styles.historyChart,
            { height: 240, backgroundColor: '#FFF7ED', padding: 16, paddingBottom: 10 },
          ]}
        >
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#9A3412', marginBottom: 4 }}>
            🍼 Feed — ml consumed per day
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View
                style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#C45BF2' }}
              />
              <Text style={{ fontSize: 10, color: C.muted }}>Bottle</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View
                style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#F9A8D4' }}
              />
              <Text style={{ fontSize: 10, color: C.muted }}>Breast (est.)</Text>
            </View>
          </View>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
            {feedChartData.map((d, i) => {
              const barMaxH = 110;
              const totalH = feedMax > 0 ? (d.total / feedMax) * barMaxH : 0;
              const bottleH = d.total > 0 ? (d.bottleMl / d.total) * totalH : 0;
              const breastH = totalH - bottleH;
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 8, color: C.muted, marginBottom: 2 }}>
                    {d.total > 0 ? `${d.total}` : ''}
                  </Text>
                  <View
                    style={{
                      width: '100%',
                      height: totalH,
                      borderRadius: 6,
                      overflow: 'hidden',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <View style={{ height: bottleH, backgroundColor: C.purple }} />
                    <View style={{ height: breastH, backgroundColor: '#F9A8D4' }} />
                  </View>
                  <Text style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>{DAY_LABELS[i]}</Text>
                </View>
              );
            })}
          </View>
          {feedMax === 1 && (
            <Text style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 6 }}>
              No bottle or breast data yet — log a feed to see trends.
            </Text>
          )}
        </View>
      )}

      {/* ── SLEEP GRAPH ── */}
      {activeGraph === 'sleep' && (
        <View
          style={[
            styles.historyChart,
            { minHeight: 220, backgroundColor: '#EEF2FF', padding: 14, paddingBottom: 12 },
          ]}
        >
          {/* Swipe hint dots */}
          <View
            style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 10 }}
          >
            {[0, 1].map((idx) => (
              <TouchableOpacity key={idx} onPress={() => setSleepView(idx as 0 | 1)}>
                <View
                  style={{
                    width: sleepView === idx ? 18 : 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: sleepView === idx ? '#6366F1' : '#C7D2FE',
                  }}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Animated.View
            style={{ transform: [{ translateX: sleepSwipeX }] }}
            {...sleepPanResponder.panHandlers}
          >
            {sleepView === 0 ? (
              /* ── TODAY'S TIMELINE ── */
              <View>
                <Text
                  style={{ fontSize: 13, fontWeight: '800', color: '#3730A3', marginBottom: 8 }}
                >
                  😴 Today's Sleep Timeline
                </Text>
                {/* Time axis labels */}
                <View
                  style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}
                >
                  {['12 AM', '6 AM', '12 PM', '6 PM', '12 AM'].map((lbl, idx) => (
                    <Text key={idx} style={{ fontSize: 9, color: '#9CA3AF' }}>
                      {lbl}
                    </Text>
                  ))}
                </View>
                {/* Timeline bar track */}
                <View
                  style={{
                    height: 8,
                    backgroundColor: '#E0E7FF',
                    borderRadius: 4,
                    marginBottom: 10,
                  }}
                >
                  {todaySleepSessions.map((s, idx) => {
                    const startPct = timeToPercent(s.sleep_start);
                    const endPct = s.sleep_end
                      ? timeToPercent(s.sleep_end)
                      : Math.min(startPct + 0.03, 1);
                    const width = Math.max(endPct - startPct, 0.02);
                    const isNight = s.tracking_method === 'night';
                    return (
                      <View
                        key={idx}
                        style={{
                          position: 'absolute',
                          left: `${startPct * 100}%` as unknown as number,
                          width: `${width * 100}%` as unknown as number,
                          top: 0,
                          bottom: 0,
                          backgroundColor: isNight ? '#4F46E5' : '#A5B4FC',
                          borderRadius: 4,
                        }}
                      />
                    );
                  })}
                </View>
                {/* Legend */}
                <View style={{ flexDirection: 'row', gap: 14, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View
                      style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#4F46E5' }}
                    />
                    <Text style={{ fontSize: 10, color: C.muted }}>Night</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View
                      style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#A5B4FC' }}
                    />
                    <Text style={{ fontSize: 10, color: C.muted }}>Nap</Text>
                  </View>
                </View>
                {/* Session list */}
                {todaySleepSessions.length === 0 ? (
                  <Text
                    style={{
                      fontSize: 12,
                      color: C.muted,
                      textAlign: 'center',
                      paddingVertical: 8,
                    }}
                  >
                    No sleep logged today yet.
                  </Text>
                ) : (
                  todaySleepSessions.map((s, idx) => {
                    const isNight = s.tracking_method === 'night';
                    return (
                      <View
                        key={idx}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          paddingVertical: 4,
                        }}
                      >
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            backgroundColor: isNight ? '#4F46E5' : '#A5B4FC',
                          }}
                        />
                        <Text
                          style={{ fontSize: 12, color: '#3730A3', fontWeight: '600', flex: 1 }}
                        >
                          {isNight ? 'Night Sleep' : `Nap ${idx + 1}`}
                        </Text>
                        <Text style={{ fontSize: 11, color: C.muted }}>
                          {formatTime12(s.sleep_start)}
                          {s.sleep_end ? ` → ${formatTime12(s.sleep_end)}` : ''}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#6366F1', fontWeight: '700' }}>
                          {s.duration_minutes ? formatDuration(s.duration_minutes) : '—'}
                        </Text>
                      </View>
                    );
                  })
                )}
                <Text style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>
                  {`← Swipe left for weekly view →`}
                </Text>
              </View>
            ) : (
              /* ── WEEKLY SLEEP BAR CHART ── */
              <View>
                <Text
                  style={{ fontSize: 13, fontWeight: '800', color: '#3730A3', marginBottom: 6 }}
                >
                  😴 Total Sleep — last 7 days
                </Text>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View
                      style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#4F46E5' }}
                    />
                    <Text style={{ fontSize: 10, color: C.muted }}>Night</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View
                      style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#A5B4FC' }}
                    />
                    <Text style={{ fontSize: 10, color: C.muted }}>Nap</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 110 }}>
                  {sleepChartData.map((d, i) => {
                    const barMaxH = 90;
                    const totalH = sleepMax > 0 ? (d.totalMins / sleepMax) * barMaxH : 0;
                    const nightH = d.totalMins > 0 ? (d.nightMins / d.totalMins) * totalH : 0;
                    const napH = totalH - nightH;
                    return (
                      <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 8, color: C.muted, marginBottom: 2 }}>
                          {d.totalMins > 0 ? formatDuration(d.totalMins) : ''}
                        </Text>
                        <View
                          style={{
                            width: '100%',
                            height: totalH,
                            borderRadius: 6,
                            overflow: 'hidden',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <View style={{ height: napH, backgroundColor: '#A5B4FC' }} />
                          <View style={{ height: nightH, backgroundColor: '#4F46E5' }} />
                        </View>
                        <Text style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>
                          {DAY_LABELS[i]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>
                  {`← Swipe right for today's timeline`}
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
      )}

      {/* ── DIAPER GRAPH ── */}
      {activeGraph === 'diaper' && (
        <View
          style={[
            styles.historyChart,
            { minHeight: 180, backgroundColor: '#F0FDF4', padding: 16, paddingBottom: 16 },
          ]}
        >
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#14532D', marginBottom: 14 }}>
            🧷 Diapers — Today
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            {/* Total count */}
            <View style={styles.diaperTotalCard}>
              <Text style={{ fontSize: 36, fontWeight: '900', color: '#16A34A' }}>
                {diaperTodayData.count}
              </Text>
              <Text style={{ fontSize: 12, color: '#166534', fontWeight: '700' }}>Total</Text>
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              {/* Wet */}
              <View style={styles.diaperSubCardWet}>
                <Text style={{ fontSize: 18 }}>💧</Text>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#1D4ED8' }}>
                    {diaperTodayData.wet}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#1E40AF' }}>Wet</Text>
                </View>
              </View>
              {/* Dirty */}
              <View style={styles.diaperSubCardDirty}>
                <Text style={{ fontSize: 18 }}>💛</Text>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#92400E' }}>
                    {diaperTodayData.dirty}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#78350F' }}>Dirty / Both</Text>
                </View>
              </View>
            </View>
          </View>
          {/* Last change */}
          <View style={styles.diaperLastChangeBanner}>
            <Text style={{ fontSize: 20 }}>🕐</Text>
            <View>
              <Text style={{ fontSize: 11, color: '#166534', fontWeight: '600' }}>Last Change</Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#14532D' }}>
                {diaperTodayData.lastChange
                  ? formatTime12(diaperTodayData.lastChange)
                  : 'No changes today'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Recent Activity ── */}
      <Text style={styles.sectionTitle}>Recent activity</Text>
      {!recent.length && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptyCopy}>Use Quick Log to save the first moment.</Text>
        </View>
      )}
      {recent.map((event) => {
        const isSelected = selectedIds.includes(event.id);
        return (
          <React.Fragment key={event.id}>
            <TouchableOpacity
              onLongPress={() => handleLongPress(event.id)}
              onPress={() => handlePress(event.id)}
              delayLongPress={500}
              activeOpacity={0.8}
              style={[
                styles.eventCard,
                {
                  borderWidth: 2,
                  borderColor: isSelected ? C.purple : 'transparent',
                  backgroundColor: isSelected ? C.purpleSoft : C.card,
                },
              ]}
            >
              <View style={styles.eventIcon}>
                <Text style={styles.purpleText}>{event.icon}</Text>
              </View>
              <View style={styles.eventBody}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta}>
                  {formatEventTime(event.occurredAt)} · {event.note}
                </Text>
              </View>
              {isSelected && (
                <View style={{ marginLeft: 8, marginRight: 4 }}>
                  <Text style={{ fontSize: 16, color: C.purpleDark, fontWeight: '900' }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
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
  sectionTitle: { fontSize: 21, lineHeight: 25, color: C.ink, fontWeight: '800', marginBottom: 18 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 18,
  },
  chip: { backgroundColor: C.card, paddingVertical: 9, paddingHorizontal: 13, borderRadius: 18 },
  chipText: { fontSize: 11, color: C.ink },
  historyChart: {
    borderRadius: 24,
    marginBottom: 25,
  },
  diaperTotalCard: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  diaperSubCardWet: {
    flex: 1,
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  diaperSubCardDirty: {
    flex: 1,
    backgroundColor: '#FEF9C3',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  diaperLastChangeBanner: {
    backgroundColor: '#BBF7D0',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyCard: { padding: 24, borderRadius: 22, backgroundColor: C.card, alignItems: 'center' },
  emptyTitle: { color: C.ink, fontWeight: '800', fontSize: 16 },
  emptyCopy: { color: C.muted, fontSize: 12, marginTop: 5, textAlign: 'center' },
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
});
