import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { C } from '../../constants/colors';
import { Header } from '../../components/Header';
import { HeroCard } from '../../components/HeroCard';
import { SidebarPanel } from '../../components/SidebarPanel';
import { StatsGrid } from './components/StatsGrid';
import { useHomeData } from '../../hooks/useHomeData';

import type {
  Baby,
  Feeding,
  DiaperChange,
  SleepSession,
  TimelineEvent,
  Activity,
  NotificationEntry,
} from '../../types';

interface Props {
  baby: Baby | null;
  allBabies: Baby[];
  onSelectBaby: (baby: Baby) => void;
  onSignOut: () => void;
  onAddBaby: () => void;
  events: TimelineEvent[];
  feedings: Feeding[];
  diapers: DiaperChange[];
  sleep: SleepSession[];
  onQuickLog: (kind: Activity) => void;
  activeSleepStart: string | null;
  elapsedSeconds: number;
  formatElapsed: (secs: number) => string;
  notifications: NotificationEntry[];
  onPressNotifications: () => void;
  onRefreshData: () => Promise<void>;
  onSavedActivity: (kind: 'feed' | 'sleep' | 'diaper', id: number) => void;
}

export function HomeScreen({
  baby,
  allBabies,
  onSelectBaby,
  onSignOut,
  onAddBaby,
  events,
  feedings,
  diapers,
  sleep,
  notifications,
  onPressNotifications,
  onQuickLog,
}: Props) {
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const {
    DAY_LABELS,
    feedChartData,
    feedMax,
    todaySleepSessions,
    sleepChartData,
    sleepMax,
    diaperTodayData,
    timeToPercent,
    formatDuration,
    formatTime12,
  } = useHomeData({ feedings, sleepSessions: sleep, diapers, events });

  const unreadCount = notifications.length;

  // Today's feed totals
  const startOfDay = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const todayFeedings = useMemo(
    () => feedings.filter((f) => new Date(f.start_time).getTime() >= startOfDay),
    [feedings, startOfDay],
  );

  const todayFeedMl = useMemo(
    () =>
      todayFeedings.reduce((acc, f) => {
        if (f.type === 'bottle') return acc + (f.quantity_ml ?? 0);
        // breast: estimate ~4ml/min
        return acc + (f.duration_minutes ?? 0) * 4;
      }, 0),
    [todayFeedings],
  );

  const todaySleepMins = useMemo(
    () => todaySleepSessions.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0),
    [todaySleepSessions],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header
        title="HungerCues"
        onPress={onPressNotifications}
        action={
          <View style={styles.bellContainer}>
            <Bell size={22} color={C.purpleDark} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        }
      />

      {/* Hero Card — baby profile + contextual status + quick actions */}
      <HeroCard
        baby={baby}
        feedings={feedings}
        sleep={sleep}
        onOpenSidebar={() => setSidebarVisible(true)}
        onQuickLog={onQuickLog}
      />

      {/* Analytics grid: 2-col stat tiles + chart panel + diaper */}
      <StatsGrid
        feedChartData={feedChartData}
        feedMax={feedMax}
        DAY_LABELS={DAY_LABELS}
        todayFeedCount={todayFeedings.length}
        todayFeedMl={todayFeedMl}
        todaySleepSessions={todaySleepSessions}
        sleepChartData={sleepChartData}
        sleepMax={sleepMax}
        todaySleepMins={todaySleepMins}
        timeToPercent={timeToPercent}
        formatDuration={formatDuration}
        formatTime12={formatTime12}
        diaperTodayData={diaperTodayData}
        onQuickFeed={() => onQuickLog('feed')}
        onQuickSleep={() => onQuickLog('sleep')}
        onQuickDiaper={() => onQuickLog('diaper')}
      />

      {/* Sidebar */}
      <SidebarPanel
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        baby={baby}
        allBabies={allBabies}
        onSelectBaby={onSelectBaby}
        onSignOut={onSignOut}
        onAddBaby={onAddBaby}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bellContainer: { position: 'relative' },
  badge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
