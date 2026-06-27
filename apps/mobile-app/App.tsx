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
      note: `${item.breast_side ? `Side: ${item.breast_side} · ` : ''}${item.quantity_ml ? `${item.quantity_ml} ml · ` : ''}${item.duration_minutes} min${item.notes ? ` · ${item.notes}` : ''}`,
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
              <Text style={common.noticeText}>✓ {notice}</Text>
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
                <Text style={styles.sectionTitle}>Recent Alerts</Text>
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
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No notifications</Text>
                  <Text style={styles.emptyCopy}>
                    All caught up! Active alerts will appear here.
                  </Text>
                </View>
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
                <Text style={common.menuIcon}>◴</Text>
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
                <Text style={[common.menuIcon, { color: '#EF4444' }]}>🗑</Text>
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
  shell: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: C.canvas },
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
  headerActionText: { fontSize: 20, color: '#FFF', fontWeight: '600' },
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
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  segment: {
    minWidth: 82,
    height: 50,
    paddingHorizontal: 17,
    borderRadius: 26,
    backgroundColor: '#DEDEDE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  segmentActive: { backgroundColor: C.purple },
  segmentText: { color: C.muted, fontSize: 15 },
  segmentIcon: { color: C.muted },
  white: { color: '#FFF' },
  heroTitle: {
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.7,
    marginBottom: 20,
  },
  heroVisual: { height: 430, position: 'relative', overflow: 'hidden', borderRadius: 30 },
  motherHalo: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 140,
    backgroundColor: '#F5D8C7',
    right: -24,
    top: 20,
  },
  familyEmoji: {
    position: 'absolute',
    fontSize: 190,
    right: -23,
    top: 46,
    transform: [{ scaleX: -1 }],
  },
  feedTile: {
    position: 'absolute',
    left: 0,
    top: 95,
    width: 170,
    height: 130,
    borderRadius: 27,
    backgroundColor: C.purple,
    padding: 17,
    justifyContent: 'space-between',
  },
  tileTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tileValue: { color: '#FFF', fontSize: 21, fontWeight: '700' },
  roundWhite: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { color: '#E8BCF8', fontWeight: '600', fontSize: 15 },
  diaperTile: {
    position: 'absolute',
    left: 0,
    top: 240,
    width: 175,
    height: 125,
    borderRadius: 27,
    backgroundColor: C.card,
    padding: 17,
    justifyContent: 'space-between',
  },
  diaperValue: { color: C.ink, fontWeight: '800', fontSize: 21 },
  diaperLabel: { color: C.muted, fontWeight: '600' },
  activityTabs: { flexDirection: 'row', marginBottom: 30 },
  activityTab: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#DEDEDE',
  },
  activityTabActive: { backgroundColor: C.card, borderRadius: 25 },
  smallIconCircle: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: '#ECECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallIconCircleActive: { backgroundColor: C.purpleSoft },
  activityText: { color: C.muted, fontSize: 16 },
  activityTextActive: { color: C.ink, fontWeight: '600' },
  sectionTitle: { fontSize: 21, lineHeight: 25, color: C.ink, fontWeight: '800', marginBottom: 18 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  typeCard: {
    flex: 1,
    height: 100,
    borderRadius: 15,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  typeCardActive: { borderWidth: 1.5, borderColor: C.purple, backgroundColor: '#F4EDF7' },
  typeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: { color: C.ink, fontSize: 16 },
  trendCard: { backgroundColor: C.card, borderRadius: 26, padding: 18 },
  trendHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  trendIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendTitle: { fontSize: 18, fontWeight: '800' },
  statRow: {
    height: 72,
    borderRadius: 24,
    backgroundColor: '#F6F6F6',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { height: 36, width: 1, backgroundColor: C.line },
  statLabel: { fontSize: 12, color: C.ink },
  statValue: { color: C.muted, marginTop: 3 },
  formRow: { flexDirection: 'row', gap: 10 },
  formField: { flex: 1 },
  inputLabel: { color: '#555', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  input: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F4F4F4',
    paddingHorizontal: 14,
    color: C.ink,
    fontSize: 14,
    marginBottom: 12,
  },
  notesInput: { width: '100%' },
  buttonDisabled: { opacity: 0.55 },
  chart: { height: 115, position: 'relative', marginTop: 3 },
  chartMax: { position: 'absolute', top: 0, color: C.ink },
  dashLine: {
    position: 'absolute',
    top: 45,
    left: 32,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#333',
  },
  chartMid: { position: 'absolute', top: 38, left: 0, color: C.purple, fontSize: 10 },
  bars: {
    position: 'absolute',
    left: 44,
    right: 10,
    bottom: 0,
    height: 65,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  bar: { width: 22, borderRadius: 8, backgroundColor: C.purple },
  logButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  logButtonText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
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
    backgroundColor: '#EDDDF5',
    borderRadius: 24,
    marginBottom: 25,
  },
  historyBars: {
    height: 150,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  historyBar: {
    width: 34,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#DDB8EE',
  },
  historyBarActive: { backgroundColor: C.purple },
  averageLine: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderColor: C.purple,
    zIndex: 2,
  },
  averageDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFF',
    borderWidth: 6,
    borderColor: C.purple,
    left: '48%',
    top: -10,
  },
  averageText: { position: 'absolute', right: 8, top: -17, fontSize: 10 },
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
  emptyCard: { padding: 24, borderRadius: 22, backgroundColor: C.card, alignItems: 'center' },
  emptyTitle: { color: C.ink, fontWeight: '800', fontSize: 16 },
  emptyCopy: { color: C.muted, fontSize: 12, marginTop: 5 },
  insightCard: { borderRadius: 28, padding: 22, backgroundColor: C.purple, marginBottom: 14 },
  insightEyebrow: { color: '#F2D9FC', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  insightNumber: { color: '#FFF', fontSize: 72, fontWeight: '800', lineHeight: 80 },
  insightUnit: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  insightCopy: { color: '#F5E4FC', fontSize: 14, lineHeight: 20, marginTop: 28 },
  insightRow: { flexDirection: 'row', gap: 12 },
  insightMini: { flex: 1, backgroundColor: C.card, borderRadius: 24, padding: 20 },
  miniNumber: { fontSize: 26, fontWeight: '800', color: C.ink },
  miniLabel: { fontSize: 12, color: C.muted, marginTop: 7 },
  recommendationCard: { marginTop: 14, borderRadius: 24, backgroundColor: C.card, padding: 20 },
  recommendationTitle: { color: C.ink, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  recommendationText: { color: '#555', fontSize: 12, lineHeight: 18, marginBottom: 7 },
  insightButton: { marginTop: 14 },
  navWrap: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 20,
    padding: 5,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  nav: {
    height: 67,
    borderRadius: 32,
    backgroundColor: C.card,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 8,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIcon: { color: C.ink, fontSize: 23, fontWeight: '600', lineHeight: 25 },
  navLabel: { color: C.ink, fontSize: 10, marginTop: 3, fontWeight: '600' },
  // Active sleep timer banner
  activeTimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E8F8EF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  timerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#38B86A',
  },
  activeTimerText: {
    color: '#19763B',
    fontSize: 13,
    fontWeight: '700',
  },
  // Ask AI section
  askSectionCard: {
    marginTop: 20,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
  },
  askTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.ink,
    marginBottom: 6,
  },
  askSubtitle: {
    fontSize: 12,
    color: C.muted,
    marginBottom: 16,
  },
  askInputContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  askInput: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F4F4F4',
    paddingHorizontal: 14,
    color: C.ink,
    fontSize: 14,
  },
  askSubmitButton: {
    height: 46,
    borderRadius: 14,
    backgroundColor: C.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  askSubmitButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 18,
  },
  askErrorBox: {
    backgroundColor: '#FFF0F0',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  askErrorText: {
    color: '#A23B3B',
    fontSize: 12,
    fontWeight: '600',
  },
  answerBox: {
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  answerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  answerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.ink,
  },
  clearText: {
    fontSize: 12,
    color: C.muted,
  },
  answerContentText: {
    fontSize: 14,
    color: C.ink,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuContainer: {
    backgroundColor: C.card,
    borderRadius: 24,
    width: '100%',
    maxWidth: 320,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.ink,
  },
  menuCloseBtn: {
    padding: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 18,
    color: C.purpleDark,
    fontWeight: '600',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
  },
});
