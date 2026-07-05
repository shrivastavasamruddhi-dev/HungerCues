import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { C } from '../../constants/colors';
import { Header } from '../../components/Header';
import { BabyProfileCard } from '../../components/BabyProfileCard';
import { SidebarPanel } from '../../components/SidebarPanel';
import { FeedCard } from './components/FeedCard';
import { SleepCard } from './components/SleepCard';
import { DiaperCard } from './components/DiaperCard';
import { QuickLogModal } from '../../components/QuickLogModal';
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
  activeSleepStart,
  elapsedSeconds,
  formatElapsed,
  notifications,
  onPressNotifications,
  onRefreshData,
  onSavedActivity,
}: Props) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [quickLogVisible, setQuickLogVisible] = useState(false);
  const [quickLogActivity, setQuickLogActivity] = useState<Activity>('feed');

  // Compute stats for all graphs
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

  const handleOpenQuickLog = (activityType: Activity) => {
    setQuickLogActivity(activityType);
    setQuickLogVisible(true);
  };

  const handleSaved = (kind: 'feed' | 'sleep' | 'diaper', id: number) => {
    void onRefreshData();
    onSavedActivity(kind, id);
  };

  const unreadCount = notifications.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header
        title="HungerCues"
        onPress={onPressNotifications}
        action={
          <View style={styles.bellContainer}>
            <Text style={styles.bellEmoji}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        }
      />

      {/* Baby Profile Card */}
      <BabyProfileCard
        baby={baby}
        onOpenSidebar={() => setSidebarVisible(true)}
      />

      {/* Analytics Cards */}
      <FeedCard
        feedChartData={feedChartData}
        feedMax={feedMax}
        DAY_LABELS={DAY_LABELS}
        todayCount={feedings.filter((f) => {
          const t = new Date(f.start_time).getTime();
          const d = new Date();
          d.setHours(0,0,0,0);
          return t >= d.getTime();
        }).length}
        onQuickLog={() => handleOpenQuickLog('feed')}
      />

      <SleepCard
        todaySleepSessions={todaySleepSessions}
        sleepChartData={sleepChartData}
        sleepMax={sleepMax}
        DAY_LABELS={DAY_LABELS}
        timeToPercent={timeToPercent}
        formatDuration={formatDuration}
        formatTime12={formatTime12}
        onQuickLog={() => handleOpenQuickLog('sleep')}
      />

      <DiaperCard
        diaperTodayData={diaperTodayData}
        formatTime12={formatTime12}
        onQuickLog={() => handleOpenQuickLog('diaper')}
      />

      {/* Sidebar Navigation */}
      <SidebarPanel
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        baby={baby}
        allBabies={allBabies}
        onSelectBaby={onSelectBaby}
        onSignOut={onSignOut}
        onAddBaby={onAddBaby}
      />

      {/* Inline Quick Logging Bottom Sheet Modal */}
      <QuickLogModal
        visible={quickLogVisible}
        activity={quickLogActivity}
        baby={baby}
        onClose={() => setQuickLogVisible(false)}
        onSaved={handleSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bellContainer: {
    position: 'relative',
  },
  bellEmoji: {
    fontSize: 22,
  },
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
