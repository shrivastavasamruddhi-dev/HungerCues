import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { api } from './src/api';
import {
  AIInsight,
  Baby,
  DiaperChange,
  Feeding,
  SleepSession,
  GrowthRecord,
  NotificationEntry,
  Tab,
  Activity,
  FeedType,
  TimelineEvent,
} from './src/types';

import { C } from './src/constants/colors';
import { activityMeta } from './src/constants/activityMeta';
import { capitalize } from './src/utils/text';
import { formatElapsed, getCustomDateTime, parseDurationHHMM } from './src/utils/date';
import { common } from './src/styles/common';
import { useActiveSleepTimer } from './src/hooks/useActiveSleepTimer';

import { Header } from './src/components/Header';
import { BottomNav } from './src/components/BottomNav';
import { SwipeableNotification } from './src/components/SwipeableNotification';
import { DeletedActivitiesModal } from './src/components/DeletedActivitiesModal';
import { HomeScreen } from './src/features/home/HomeScreen';
import { GrowthScreen } from './src/features/growth/GrowthScreen';
import { HistoryScreen } from './src/features/history/HistoryScreen';
import { InsightsScreen } from './src/features/insights/InsightsScreen';
import { MilestonesScreen } from './src/features/milestones/MilestonesScreen';
import { SectionTitle } from './src/components/SectionTitle';
import { EmptyState } from './src/components/EmptyState';
import { AddBabyModal } from './src/components/AddBabyModal';
import { NotificationsModal } from './src/components/NotificationsModal';
import { Toast } from './src/components/Toast';

export default function App() {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('home');
  const [previousTab, setPreviousTab] = useState<Tab>('home');
  const [filter, setFilter] = useState<'all' | Activity>('all');
  const [activity, setActivity] = useState<Activity>('feed');
  const [feedType, setFeedType] = useState<FeedType>('Breast');
  const [subtype, setSubtype] = useState('Breast');
  const [amount, setAmount] = useState('120');
  const [duration, setDuration] = useState('15');
  const [notes, setNotes] = useState('');
  const [breastSide, setBreastSide] = useState<'Left' | 'Right'>('Left');
  const [baby, setBaby] = useState<Baby | null>(null);
  const [allBabies, setAllBabies] = useState<Baby[]>([]);
  const [feedings, setFeedings] = useState<Feeding[]>([]);
  const [sleep, setSleep] = useState<SleepSession[]>([]);
  const [diapers, setDiapers] = useState<DiaperChange[]>([]);
  const [growth, setGrowth] = useState<GrowthRecord[]>([]);
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [weightInput, setWeightInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeSleepStart, setActiveSleepStart] = useState<string | null>(null);
  const [sleepTrackingMode, setSleepTrackingMode] = useState<'timer' | 'manual'>('timer');
  const elapsedSeconds = useActiveSleepTimer(activeSleepStart);
  const [customTimeEnabled, setCustomTimeEnabled] = useState(false);
  const [customTime, setCustomTime] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [showLogMenu, setShowLogMenu] = useState(false);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [addBabyModalVisible, setAddBabyModalVisible] = useState(false);
  const [lastLoggedEvent, setLastLoggedEvent] = useState<{ kind: 'feed' | 'sleep' | 'diaper'; id: number } | null>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const compact = width < 430;

  const loadData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const babies = await api.listBabies();
      const activeBaby = baby ? (babies.find(b => b.id === baby.id) || babies[0]) : babies[0];
      if (!activeBaby) throw new Error('No baby profile was found.');
      const [feedingData, sleepData, diaperData, growthData] = await Promise.all([
        api.listFeedings(activeBaby.id),
        api.listSleep(activeBaby.id),
        api.listDiapers(activeBaby.id),
        api.listGrowth(activeBaby.id),
      ]);
      setBaby(activeBaby);
      setAllBabies(babies);
      setFeedings(feedingData);
      setSleep(sleepData);
      setDiapers(diaperData);
      setGrowth(growthData);
    } catch {
      setError('Cannot reach the tracker service. Start the backend and pull to retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBaby = async (selectedBaby: Baby) => {
    setBaby(selectedBaby);
    setLoading(true);
    setError(null);
    try {
      const [feedingData, sleepData, diaperData, growthData] = await Promise.all([
        api.listFeedings(selectedBaby.id),
        api.listSleep(selectedBaby.id),
        api.listDiapers(selectedBaby.id),
        api.listGrowth(selectedBaby.id),
      ]);
      setFeedings(feedingData);
      setSleep(sleepData);
      setDiapers(diaperData);
      setGrowth(growthData);
    } catch {
      setError(`Cannot load data for ${selectedBaby.name}. Check connection and try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      window.location.reload();
    }
  };

  const handleUndo = async () => {
    if (!lastLoggedEvent) return;
    try {
      if (lastLoggedEvent.kind === 'feed') {
        await api.deleteFeeding(lastLoggedEvent.id);
      } else if (lastLoggedEvent.kind === 'sleep') {
        await api.deleteSleep(lastLoggedEvent.id);
      } else if (lastLoggedEvent.kind === 'diaper') {
        await api.deleteDiaper(lastLoggedEvent.id);
      }
      setLastLoggedEvent(null);
      setNotice('Last activity deleted and undone successfully.');
      void loadData(false);
    } catch {
      setError('Could not undo the last logged activity.');
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Poll notifications on interval
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await api.listRecentNotifications();
        setNotifications(data);
      } catch {}
    };
    void fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // 10s interval
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const defaults =
      activity === 'feed'
        ? { type: feedType, amount: '120', duration: '15' }
        : activity === 'sleep'
          ? { type: 'Nap', amount: '', duration: '01:00' }
          : activity === 'diaper'
            ? { type: 'Wet', amount: '', duration: '' }
            : { type: 'Growth', amount: '', duration: '' };
    setSubtype(defaults.type);
    setAmount(defaults.amount);
    setDuration(defaults.duration);
    setWeightInput('');
    setHeightInput('');
    setNotes('');
    setBreastSide('Left');
    setCustomTimeEnabled(false);
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setCustomTime(`${hh}:${mm}`);
  }, [activity, feedType]);

  const events = useMemo<TimelineEvent[]>(() => {
    const feedingEvents = feedings.map((item) => ({
      id: `feed-${item.id}`,
      kind: 'feed' as const,
      icon: activityMeta.feed.icon,
      title: `${capitalize(item.type)} Feed`,
      occurredAt: item.start_time,
      note: item.type.toLowerCase() === 'solid'
        ? `${item.quantity_ml ? `${item.quantity_ml} serving${item.quantity_ml !== 1 ? 's' : ''}` : ''}${item.notes ? ` · ${item.notes}` : ''}`
        : `${item.breast_side ? `Side: ${item.breast_side} · ` : ''}${item.quantity_ml ? `${item.quantity_ml} ml · ` : ''}${item.duration_minutes} min${item.notes ? ` · ${item.notes}` : ''}`,
    }));
    const sleepEvents = sleep.map((item) => ({
      id: `sleep-${item.id}`,
      kind: 'sleep' as const,
      icon: activityMeta.sleep.icon,
      title: item.tracking_method === 'night' ? 'Night Sleep' : 'Sleep Session',
      occurredAt: item.sleep_start,
      note: `${item.duration_minutes ?? 0} min${item.notes ? ` · ${item.notes}` : ''}`,
    }));
    const diaperEvents = diapers.map((item) => ({
      id: `diaper-${item.id}`,
      kind: 'diaper' as const,
      icon: activityMeta.diaper.icon,
      title: `${capitalize(item.type)} Diaper`,
      occurredAt: item.changed_at,
      note: item.notes || 'Changed and all clean',
    }));
    const growthEvents = growth.map((item) => {
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
        kind: 'growth' as const,
        icon: activityMeta.growth.icon,
        title: 'Growth Entry',
        occurredAt: item.recorded_at,
        note: detailStr || 'Logged growth',
      };
    });
    return [...feedingEvents, ...sleepEvents, ...diaperEvents, ...growthEvents].sort(
      (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
    );
  }, [feedings, sleep, diapers, growth, unitSystem]);

  const visibleEvents = filter === 'all' ? events : events.filter((event) => event.kind === filter);

  const loadInsights = async () => {
    if (!baby || insightLoading) return;
    setInsightLoading(true);
    setError(null);
    try {
      setInsight(await api.getInsights(baby.id));
    } catch {
      setError('Insights are temporarily unavailable. Your activity data is still safe.');
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <SafeAreaView style={common.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.canvas} />
      <KeyboardAvoidingView
        style={common.safeArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[common.shell, !compact && common.desktopShell]}>
          <ScrollView
            contentContainerStyle={common.scroll}
            contentInsetAdjustmentBehavior="automatic"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={() => void loadData()}
                tintColor={C.purple}
              />
            }
          >
            {error && (
              <TouchableOpacity style={common.errorBanner} onPress={() => void loadData()}>
                <Text style={common.errorText}>{error}</Text>
                <Text style={common.retryText}>Tap to retry</Text>
              </TouchableOpacity>
            )}
            {loading && !baby ? (
              <View style={common.loadingState}>
                <ActivityIndicator size="large" color={C.purple} />
                <Text style={common.loadingText}>Loading Charlie's day...</Text>
              </View>
            ) : (
              <>
                {tab === 'home' && (
                  <HomeScreen
                    baby={baby}
                    allBabies={allBabies}
                    onSelectBaby={handleSelectBaby}
                    onSignOut={handleSignOut}
                    onAddBaby={() => setAddBabyModalVisible(true)}
                    events={visibleEvents}
                    feedings={feedings}
                    diapers={diapers}
                    sleep={sleep}
                    onQuickLog={() => {}}
                    activeSleepStart={activeSleepStart}
                    elapsedSeconds={elapsedSeconds}
                    formatElapsed={formatElapsed}
                    notifications={notifications}
                    onPressNotifications={() => setShowNotifications(true)}
                    onRefreshData={() => loadData(false)}
                    onSavedActivity={(kind, id) => {
                      setLastLoggedEvent({ kind, id });
                      setNotice(`New ${kind} logged successfully.`);
                    }}
                  />
                )}
                {tab === 'growth' && (
                  <GrowthScreen
                    baby={baby}
                    growth={growth}
                    unitSystem={unitSystem}
                    setUnitSystem={setUnitSystem}
                    onRefreshData={() => void loadData(false)}
                  />
                )}
                {tab === 'history' && (
                  <HistoryScreen
                    events={events}
                    feedings={feedings}
                    sleepSessions={sleep}
                    diapers={diapers}
                    onRefreshData={loadData}
                    onPressViewDeleted={() => setShowDeletedModal(true)}
                  />
                )}
                {tab === 'insights' && (
                  <InsightsScreen
                    baby={baby}
                    insight={insight}
                    loading={insightLoading}
                    feedings={feedings}
                    sleep={sleep}
                    onGenerate={loadInsights}
                    aiQuestion={aiQuestion}
                    setAiQuestion={setAiQuestion}
                    aiAnswer={aiAnswer}
                    setAiAnswer={setAiAnswer}
                  />
                )}
                {tab === 'milestones' && <MilestonesScreen baby={baby} />}
              </>
            )}
          </ScrollView>
          <BottomNav
            active={tab}
            onChange={(newTab) => {
              if (newTab === 'history') setPreviousTab(tab);
              setTab(newTab);
            }}
            activeSleepStart={activeSleepStart}
          />
        </View>
      </KeyboardAvoidingView>

      <Toast
        visible={notice != null}
        message={notice}
        onUndo={lastLoggedEvent ? handleUndo : undefined}
        onDismiss={() => setNotice(null)}
      />

      <AddBabyModal
        visible={addBabyModalVisible}
        onClose={() => setAddBabyModalVisible(false)}
        onCreated={async (newBaby) => {
          setAddBabyModalVisible(false);
          await handleSelectBaby(newBaby);
          void loadData(false);
          setNotice(`Baby profile created for ${newBaby.name}!`);
        }}
      />

      <NotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onDismiss={async (id) => {
          try {
            await api.deleteNotification(id);
          } catch {}
          setNotifications((prev) => prev.filter((x) => x.id !== id));
        }}
        onClear={async () => {
          try {
            await api.clearNotifications();
            setNotifications([]);
            setNotice('All notifications cleared.');
          } catch {}
        }}
        onRefresh={async () => {
          try {
            const data = await api.listRecentNotifications();
            setNotifications(data);
            setNotice('Notifications refreshed.');
          } catch {}
        }}
      />

      <DeletedActivitiesModal
        visible={showDeletedModal}
        onClose={() => setShowDeletedModal(false)}
        baby={baby}
        unitSystem={unitSystem}
        onRestore={loadData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.canvas },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: C.canvas,
  },
  desktopShell: {
    marginVertical: 22,
    borderRadius: 38,
    overflow: 'hidden',
    maxHeight: 880,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 10,
  },
  scroll: { padding: 18, paddingTop: 16, paddingBottom: 118, minHeight: '100%' },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -14,
    marginBottom: 18,
    paddingLeft: 8,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#38B86A', marginRight: 7 },
  connectionText: { color: '#666', fontSize: 11, fontWeight: '600' },
  notice: { backgroundColor: '#E7F8EC', borderRadius: 14, padding: 12, marginBottom: 12 },
  noticeText: { color: '#19763B', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  errorBanner: { backgroundColor: '#FFF0F0', borderRadius: 16, padding: 13, marginBottom: 14 },
  errorText: { color: '#A23B3B', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  retryText: { color: '#A23B3B', fontSize: 10, textAlign: 'center', marginTop: 4 },
  loadingState: { minHeight: 240, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: C.muted, marginTop: 12, fontSize: 13 },
  logButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
});
