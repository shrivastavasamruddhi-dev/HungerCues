import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../../constants/colors';
import { Header } from '../../components/Header';
import { SegmentedControl } from '../../components/SegmentedControl';
import type {
  Baby,
  Feeding,
  DiaperChange,
  TimelineEvent,
  Activity,
  NotificationEntry,
} from '../../types';

interface Props {
  baby: Baby | null;
  events: TimelineEvent[];
  feedings: Feeding[];
  diapers: DiaperChange[];
  filter: 'all' | Activity;
  setFilter: (value: 'all' | Activity) => void;
  onQuickLog: (kind: Activity) => void;
  activeSleepStart: string | null;
  elapsedSeconds: number;
  formatElapsed: (secs: number) => string;
  notifications: NotificationEntry[];
  onPressNotifications: () => void;
}

export function HomeScreen({
  baby,
  events,
  feedings,
  diapers,
  filter,
  setFilter,
  onQuickLog,
  activeSleepStart,
  elapsedSeconds,
  formatElapsed,
  notifications,
  onPressNotifications,
}: Props) {
  const latestBottle = feedings.find((item) => item.quantity_ml);
  const today = new Date().toDateString();
  const todayDiapers = diapers.filter(
    (item) => new Date(item.changed_at).toDateString() === today,
  ).length;

  const unreadCount = notifications.length;

  return (
    <View>
      <Header
        title={baby ? `${baby.name}'s day` : 'BabyTracker'}
        onPress={onPressNotifications}
        action={
          <View style={{ position: 'relative' }}>
            <Text style={styles.headerActionText}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        }
      />
      <View style={styles.connectionRow}>
        <View style={styles.onlineDot} />
        <Text style={styles.connectionText}>Live data · SQLite connected</Text>
      </View>
      {activeSleepStart && (
        <TouchableOpacity style={styles.activeTimerBanner} onPress={() => onQuickLog('sleep')}>
          <View style={styles.timerDot} />
          <Text style={styles.activeTimerText}>
            Baby is sleeping: {formatElapsed(elapsedSeconds)}
          </Text>
        </TouchableOpacity>
      )}
      <SegmentedControl active={filter} onChange={setFilter} />
      <Text style={styles.heroTitle}>
        {events.length
          ? `${events.length} moments logged.\nEvery one matters.`
          : 'Your Every Step\nIn Parenting\nMatters'}
      </Text>
      <View style={styles.heroVisual}>
        <View style={styles.motherHalo} />
        <Text style={styles.familyEmoji}>👩‍🍼</Text>
        <TouchableOpacity style={styles.feedTile} onPress={() => onQuickLog('feed')}>
          <View style={styles.tileTopRow}>
            <Text style={styles.tileValue}>{latestBottle?.quantity_ml ?? 120}ml</Text>
            <View style={styles.roundWhite}>
              <Text>♙</Text>
            </View>
          </View>
          <Text style={styles.tileLabel}>
            {latestBottle ? 'Latest bottle' : 'Log first bottle'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.diaperTile} onPress={() => onQuickLog('diaper')}>
          <Text style={styles.diaperValue}>{todayDiapers}</Text>
          <Text style={styles.diaperLabel}>Diapers today</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerActionText: { fontSize: 22 },
  notificationBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: '#E53E3E',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.purple,
  },
  notificationBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', marginRight: 6 },
  connectionText: { fontSize: 11, color: C.muted },
  activeTimerBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: C.purpleSoft,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.purple,
    marginRight: 8,
  },
  activeTimerText: { color: C.purpleDark, fontWeight: '700', fontSize: 13 },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: C.ink,
    paddingHorizontal: 20,
    marginBottom: 20,
    lineHeight: 34,
  },
  heroVisual: {
    marginHorizontal: 20,
    height: 220,
    borderRadius: 28,
    backgroundColor: C.purple,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  motherHalo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  familyEmoji: { fontSize: 70 },
  feedTile: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 16,
    padding: 12,
    width: 140,
  },
  tileTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tileValue: { color: '#FFF', fontWeight: '800', fontSize: 20 },
  roundWhite: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 4 },
  diaperTile: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  diaperValue: { color: '#FFF', fontWeight: '800', fontSize: 28 },
  diaperLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },
});
