import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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
import { formatElapsed, getCustomDateTime } from './src/utils/date';
import { common } from './src/styles/common';
import { useActiveSleepTimer } from './src/hooks/useActiveSleepTimer';

import { Header } from './src/components/Header';
import { BottomNav } from './src/components/BottomNav';
import { SwipeableNotification } from './src/components/SwipeableNotification';
import { DeletedActivitiesModal } from './src/components/DeletedActivitiesModal';
import { HomeScreen } from './src/features/home/HomeScreen';
import { LogScreen } from './src/features/log/LogScreen';
import { GrowthScreen } from './src/features/growth/GrowthScreen';
import { HistoryScreen } from './src/features/history/HistoryScreen';
import { InsightsScreen } from './src/features/insights/InsightsScreen';
import { MilestonesScreen } from './src/features/milestones/MilestonesScreen';
import { SectionTitle } from './src/components/SectionTitle';
import { EmptyState } from './src/components/EmptyState';

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
  const compact = width < 430;

  const loadData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const babies = await api.listBabies();
      const activeBaby = babies[0];
      if (!activeBaby) throw new Error('No baby profile was found.');
      const [feedingData, sleepData, diaperData, growthData] = await Promise.all([
        api.listFeedings(activeBaby.id),
        api.listSleep(activeBaby.id),
        api.listDiapers(activeBaby.id),
        api.listGrowth(activeBaby.id),
      ]);
      setBaby(activeBaby);
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
          ? { type: 'Nap', amount: '', duration: '60' }
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
      note: `${item.breast_side ? `Side: ${item.breast_side} Â· ` : ''}${item.quantity_ml ? `${item.quantity_ml} ml Â· ` : ''}${item.duration_minutes} min${item.notes ? ` Â· ${item.notes}` : ''}`,
    }));
    const sleepEvents = sleep.map((item) => ({
      id: `sleep-${item.id}`,
      kind: 'sleep' as const,
      icon: activityMeta.sleep.icon,
      title: item.tracking_method === 'night' ? 'Night Sleep' : 'Sleep Session',
      occurredAt: item.sleep_start,
      note: `${item.duration_minutes ?? 0} min${item.notes ? ` Â· ${item.notes}` : ''}`,
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
        if (detailStr) detailStr += ' Â· ';
        if (unitSystem === 'metric') {
          detailStr += `Height: ${item.height_cm} cm`;
        } else {
          const inches = (item.height_cm / 2.54).toFixed(1);
          detailStr += `Height: ${inches} in`;
        }
      }
      if (item.notes) {
        if (detailStr) detailStr += ' Â· ';
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

  const logActivity = async () => {
    if (!baby || saving) return;
    setSaving(true);
    setError(null);
    const now = new Date();
    try {
      if (activity === 'feed') {
        let startTime = now;
        if (customTimeEnabled) {
          const customDate = getCustomDateTime(customTime);
          if (!customDate) {
            setError('Please enter a valid time in HH:MM format (e.g. 14:30)');
            setSaving(false);
            return;
          }
          startTime = customDate;
        }
        await api.createFeeding({
          baby_id: baby.id,
          type: subtype.toLowerCase(),
          start_time: startTime.toISOString(),
          duration_minutes: Number(duration) || 15,
          quantity_ml: subtype === 'Bottle' ? Number(amount) || 120 : null,
          breast_side: subtype === 'Breast' ? breastSide : null,
          notes: notes || null,
        });
      } else if (activity === 'sleep') {
        // Determine tracking_method: 'night' if user chose Night type, otherwise mode-based
        const isNightSleep = subtype === 'Night';
        if (sleepTrackingMode === 'timer') {
          if (!activeSleepStart) return;
          const start = new Date(activeSleepStart);
          const minutes = Math.max(1, Math.round((now.getTime() - start.getTime()) / 60_000));
          await api.createSleep({
            baby_id: baby.id,
            sleep_start: activeSleepStart,
            sleep_end: now.toISOString(),
            duration_minutes: minutes,
            tracking_method: isNightSleep ? 'night' : 'timer',
            notes: notes || null,
          });
          setActiveSleepStart(null);
        } else {
          const minutes = Number(duration) || 60;
          let startTime = new Date(now.getTime() - minutes * 60_000);
          if (customTimeEnabled) {
            const customDate = getCustomDateTime(customTime);
            if (!customDate) {
              setError('Please enter a valid time in HH:MM format (e.g. 14:30)');
              setSaving(false);
              return;
            }
            startTime = customDate;
          }
          const endTime = new Date(startTime.getTime() + minutes * 60_000);
          await api.createSleep({
            baby_id: baby.id,
            sleep_start: startTime.toISOString(),
            sleep_end: endTime.toISOString(),
            duration_minutes: minutes,
            tracking_method: isNightSleep ? 'night' : 'manual',
            notes: notes || null,
          });
        }
      } else if (activity === 'diaper') {
        await api.createDiaper({
          baby_id: baby.id,
          changed_at: now.toISOString(),
          type: subtype.toLowerCase(),
          notes: notes || null,
        });
      } else if (activity === 'growth') {
        let w_kg: number | null = null;
        let h_cm: number | null = null;
        if (weightInput.trim()) {
          const w_val = Number(weightInput);
          w_kg = unitSystem === 'metric' ? w_val : w_val / 2.20462;
        }
        if (heightInput.trim()) {
          const h_val = Number(heightInput);
          h_cm = unitSystem === 'metric' ? h_val : h_val * 2.54;
        }
        if (w_kg === null && h_cm === null) {
          setError('Please enter at least one metric (weight or height).');
          setSaving(false);
          return;
        }
        let growthTime = now;
        if (customTimeEnabled) {
          const customDate = getCustomDateTime(customTime);
          if (!customDate) {
            setError('Please enter a valid time in HH:MM format (e.g. 14:30)');
            setSaving(false);
            return;
          }
          growthTime = customDate;
        }
        await api.createGrowth({
          baby_id: baby.id,
          recorded_at: growthTime.toISOString(),
          weight_kg: w_kg,
          height_cm: h_cm,
          notes: notes || null,
        });
        setWeightInput('');
        setHeightInput('');
      }
      await loadData(false);
      setNotice(`${activityMeta[activity].label} saved to the database`);
      setTimeout(() => setNotice(null), 2500);
      setPreviousTab(tab);
      setTab('history');
    } catch {
      setError('This entry could not be saved. Check the backend connection and try again.');
    } finally {
      setSaving(false);
    }
  };

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
      <View style={[common.shell, !compact && common.desktopShell]}>
        <ScrollView
          contentContainerStyle={common.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void loadData()}
              tintColor={C.purple}
            />
          }
        >
          {notice && (
            <View style={common.notice}>
              <Text style={common.noticeText}>âœ“ {notice}</Text>
            </View>
          )}
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
          ) : null}
          {showNotifications ? (
            <View style={{ paddingBottom: 40 }}>
              <Header
                title="Notification Center"
                action="✕"
                onPress={() => setShowNotifications(false)}
              />
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                <SectionTitle>Recent Alerts</SectionTitle>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        const data = await api.listRecentNotifications();
                        setNotifications(data);
                      } catch {}
                    }}
                    style={{
                      backgroundColor: C.purpleSoft,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ color: C.purpleDark, fontWeight: '700', fontSize: 12 }}>
                      Refresh
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        await api.clearNotifications();
                        setNotifications([]);
                      } catch {}
                    }}
                    style={{
                      backgroundColor: '#FEE2E2',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 12 }}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {!notifications.length ? (
                <EmptyState
                  title="No notifications"
                  description="All caught up! Active alerts will appear here."
                />
              ) : (
                notifications.map((n) => (
                  <SwipeableNotification
                    key={n.id}
                    notification={n}
                    onDismiss={async () => {
                      try {
                        await api.deleteNotification(n.id);
                      } catch {}
                      setNotifications((prev) => prev.filter((x) => x.id !== n.id));
                    }}
                  />
                ))
              )}

              <TouchableOpacity
                onPress={() => setShowNotifications(false)}
                style={[styles.logButton, { marginTop: 20, backgroundColor: '#ECECEC' }]}
              >
                <Text style={{ color: C.ink, fontWeight: '700' }}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {tab === 'home' && (
                <HomeScreen
                  baby={baby}
                  events={visibleEvents}
                  feedings={feedings}
                  diapers={diapers}
                  filter={filter}
                  setFilter={setFilter}
                  onQuickLog={(kind) => {
                    setActivity(kind);
                    setTab('log');
                  }}
                  activeSleepStart={activeSleepStart}
                  elapsedSeconds={elapsedSeconds}
                  formatElapsed={formatElapsed}
                  notifications={notifications}
                  onPressNotifications={() => setShowNotifications(true)}
                />
              )}
              {tab === 'log' && (
                <LogScreen
                  activity={activity}
                  setActivity={setActivity}
                  feedType={feedType}
                  setFeedType={setFeedType}
                  subtype={subtype}
                  setSubtype={setSubtype}
                  amount={amount}
                  setAmount={setAmount}
                  duration={duration}
                  setDuration={setDuration}
                  notes={notes}
                  setNotes={setNotes}
                  saving={saving}
                  onLog={logActivity}
                  activeSleepStart={activeSleepStart}
                  setActiveSleepStart={setActiveSleepStart}
                  sleepTrackingMode={sleepTrackingMode}
                  setSleepTrackingMode={setSleepTrackingMode}
                  elapsedSeconds={elapsedSeconds}
                  formatElapsed={formatElapsed}
                  customTimeEnabled={customTimeEnabled}
                  setCustomTimeEnabled={setCustomTimeEnabled}
                  customTime={customTime}
                  setCustomTime={setCustomTime}
                  unitSystem={unitSystem}
                  setUnitSystem={setUnitSystem}
                  weightInput={weightInput}
                  setWeightInput={setWeightInput}
                  heightInput={heightInput}
                  setHeightInput={setHeightInput}
                  breastSide={breastSide}
                  setBreastSide={setBreastSide}
                  onPressHeaderAction={() => setShowLogMenu(true)}
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
                  onBack={() => setTab(previousTab)}
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
                />
              )}
              {tab === 'milestones' && <MilestonesScreen baby={baby} />}
            </>
          )}
        </ScrollView>
        {!showNotifications && (
          <BottomNav
            active={tab}
            onChange={(newTab) => {
              if (newTab === 'history') setPreviousTab(tab);
              setTab(newTab);
            }}
          />
        )}
      </View>

      {/* Log Options Menu Modal */}
      <Modal
        visible={showLogMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLogMenu(false)}
      >
        <TouchableOpacity
          style={common.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLogMenu(false)}
        >
          <View style={common.menuContainer}>
            <View style={common.menuHeader}>
              <Text style={common.menuTitle}>Log Options</Text>
              <TouchableOpacity onPress={() => setShowLogMenu(false)} style={common.menuCloseBtn}>
                <Text style={{ fontSize: 16, color: C.muted, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={common.menuItem}
              onPress={() => {
                setShowLogMenu(false);
                setPreviousTab(tab);
                setTab('history');
              }}
            >
              <View style={common.menuIconCircle}>
                <Text style={common.menuIcon}>📋</Text>
              </View>
              <Text style={common.menuItemText}>View History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[common.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setShowLogMenu(false);
                setShowDeletedModal(true);
              }}
            >
              <View style={[common.menuIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[common.menuIcon, { color: '#EF4444' }]}>🗑️</Text>
              </View>
              <Text style={common.menuItemText}>Deleted Activities</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
