import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  PanResponder,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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
  Milestone,
  NotificationEntry,
  AIWeeklySummary,
} from './src/types';

import { C } from './src/constants/colors';
import { activityMeta } from './src/constants/activityMeta';
import { capitalize } from './src/utils/text';
import { formatEventTime, formatElapsed, getCustomDateTime } from './src/utils/date';
import { common } from './src/styles/common';
import { useActiveSleepTimer } from './src/hooks/useActiveSleepTimer';

type Tab = 'home' | 'log' | 'history' | 'insights' | 'milestones' | 'growth';
type Activity = 'feed' | 'sleep' | 'diaper' | 'growth';
type FeedType = 'Breast' | 'Bottle' | 'Solid';
type TimelineEvent = {
  id: string;
  kind: Activity;
  icon: string;
  title: string;
  occurredAt: string;
  note: string;
};

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

function SwipeableNotification({
  notification,
  onDismiss,
}: {
  notification: NotificationEntry;
  onDismiss: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const SWIPE_THRESHOLD = 80;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dy) < 20,
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > SWIPE_THRESHOLD) {
          // Swipe passed threshold — dismiss
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: gestureState.dx > 0 ? 500 : -500,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(onDismiss);
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 8,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <Animated.View style={[{ transform: [{ translateX }], opacity }]} {...panResponder.panHandlers}>
      <View
        style={[
          styles.eventCard,
          {
            borderLeftWidth: 4,
            borderLeftColor: notification.type === 'sleep_timer' ? '#48BB78' : '#ED8936',
          },
        ]}
      >
        <View style={styles.eventIcon}>
          <Text style={styles.purpleText}>
            {notification.type === 'sleep_timer'
              ? '☾'
              : notification.type === 'feed_gap'
                ? '♙'
                : '♢'}
          </Text>
        </View>
        <View style={styles.eventBody}>
          <Text style={styles.eventTitle}>{notification.title}</Text>
          <Text style={{ fontSize: 13, color: C.ink, marginTop: 2 }}>{notification.body}</Text>
          <Text style={styles.eventMeta}>
            {new Date(notification.sent_at).toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: '#BFBFBF', paddingLeft: 4 }}>⟵⟶</Text>
      </View>
    </Animated.View>
  );
}

function DeletedActivitiesModal({
  visible,
  onClose,
  baby,
  unitSystem,
  onRestore,
}: {
  visible: boolean;
  onClose: () => void;
  baby: Baby | null;
  unitSystem: 'metric' | 'imperial';
  onRestore: () => Promise<void>;
}) {
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
  }, [visible, baby]);

  const deletedEvents = useMemo(() => {
    if (!deletedData) return [];
    const { feedings, sleep, diapers, growth } = deletedData;

    const feedingEvents = feedings.map((item) => ({
      id: `feed-${item.id}`,
      kind: 'feed' as const,
      icon: activityMeta.feed.icon,
      title: `${capitalize(item.type)} Feed`,
      occurredAt: item.start_time,
      note: `${item.breast_side ? `Side: ${item.breast_side} · ` : ''}${item.quantity_ml ? `${item.quantity_ml} ml · ` : ''}${item.duration_minutes} min${item.notes ? ` · ${item.notes}` : ''}`,
      deletedAt: item.deleted_at,
    }));

    const sleepEvents = sleep.map((item) => ({
      id: `sleep-${item.id}`,
      kind: 'sleep' as const,
      icon: activityMeta.sleep.icon,
      title: item.tracking_method === 'night' ? 'Night Sleep' : 'Sleep Session',
      occurredAt: item.sleep_start,
      note: `${item.duration_minutes ?? 0} min${item.notes ? ` · ${item.notes}` : ''}`,
      deletedAt: item.deleted_at,
    }));

    const diaperEvents = diapers.map((item) => ({
      id: `diaper-${item.id}`,
      kind: 'diaper' as const,
      icon: activityMeta.diaper.icon,
      title: `${capitalize(item.type)} Diaper`,
      occurredAt: item.changed_at,
      note: item.notes || 'Changed and all clean',
      deletedAt: item.deleted_at,
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
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.menuContainer,
            {
              maxWidth: 500,
              maxHeight: '80%',
              padding: 20,
            },
          ]}
        >
          <View style={styles.menuHeader}>
            <Text style={[styles.menuTitle, { fontSize: 18 }]}>Deleted Activities</Text>
            <TouchableOpacity onPress={onClose} style={styles.menuCloseBtn}>
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
                  style={[
                    styles.eventCard,
                    {
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
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
                    style={{
                      backgroundColor: C.purpleSoft,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                      marginLeft: 8,
                    }}
                  >
                    <Text style={{ color: C.purpleDark, fontWeight: '700', fontSize: 11 }}>
                      Restore
                    </Text>
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

function Header({
  title,
  action = '⋮',
  onPress,
}: {
  title: string;
  action?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity
        accessibilityLabel={title + ' Action'}
        onPress={onPress}
        style={styles.headerAction}
      >
        {typeof action === 'string' ? (
          <Text style={styles.headerActionText}>{action}</Text>
        ) : (
          action
        )}
      </TouchableOpacity>
    </View>
  );
}

function SegmentedControl({
  active,
  onChange,
}: {
  active: 'all' | Activity;
  onChange: (value: 'all' | Activity) => void;
}) {
  return (
    <View style={styles.segmentRow}>
      {[
        { key: 'all', icon: '', label: 'All' },
        { key: 'feed', icon: '♙', label: 'Feed' },
        { key: 'sleep', icon: '☾', label: 'Sleep' },
        { key: 'diaper', icon: '♢', label: 'Diaper' },
        { key: 'growth', icon: '⚖', label: 'Growth' },
      ].map((item) => (
        <TouchableOpacity
          key={item.key}
          onPress={() => onChange(item.key as 'all' | Activity)}
          style={[styles.segment, active === item.key && styles.segmentActive]}
        >
          {!!item.icon && (
            <Text style={[styles.segmentIcon, active === item.key && styles.white]}>
              {item.icon}
            </Text>
          )}
          <Text style={[styles.segmentText, active === item.key && styles.white]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function HomeScreen({
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
}: {
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
}) {
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
              <View
                style={{
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
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 9, fontWeight: 'bold' }}>
                  {unreadCount}
                </Text>
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

function LogScreen({
  activity,
  setActivity,
  feedType,
  setFeedType,
  subtype,
  setSubtype,
  amount,
  setAmount,
  duration,
  setDuration,
  notes,
  setNotes,
  saving,
  onLog,
  activeSleepStart,
  setActiveSleepStart,
  sleepTrackingMode,
  setSleepTrackingMode,
  elapsedSeconds,
  formatElapsed,
  customTimeEnabled,
  setCustomTimeEnabled,
  customTime,
  setCustomTime,
  unitSystem,
  setUnitSystem,
  weightInput,
  setWeightInput,
  heightInput,
  setHeightInput,
  breastSide,
  setBreastSide,
  onPressHeaderAction,
}: {
  activity: Activity;
  setActivity: (value: Activity) => void;
  feedType: FeedType;
  setFeedType: (value: FeedType) => void;
  subtype: string;
  setSubtype: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  duration: string;
  setDuration: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  saving: boolean;
  onLog: () => Promise<void>;
  activeSleepStart: string | null;
  setActiveSleepStart: (value: string | null) => void;
  sleepTrackingMode: 'timer' | 'manual';
  setSleepTrackingMode: (value: 'timer' | 'manual') => void;
  elapsedSeconds: number;
  formatElapsed: (secs: number) => string;
  customTimeEnabled: boolean;
  setCustomTimeEnabled: (value: boolean) => void;
  customTime: string;
  setCustomTime: (value: string) => void;
  unitSystem: 'metric' | 'imperial';
  setUnitSystem: (value: 'metric' | 'imperial') => void;
  weightInput: string;
  setWeightInput: (value: string) => void;
  heightInput: string;
  setHeightInput: (value: string) => void;
  breastSide: 'Left' | 'Right';
  setBreastSide: (value: 'Left' | 'Right') => void;
  onPressHeaderAction: () => void;
}) {
  const options =
    activity === 'feed'
      ? ['Breast', 'Bottle', 'Solid']
      : activity === 'sleep'
        ? ['Nap', 'Night', 'Rest']
        : ['Wet', 'Mixed', 'Dry'];
  return (
    <View>
      <Header title="Quick Log" onPress={onPressHeaderAction} />
      <View style={styles.activityTabs}>
        {(Object.keys(activityMeta) as Activity[])
          .filter((key) => key !== 'growth')
          .map((key) => (
            <TouchableOpacity
              key={key}
              onPress={() => setActivity(key)}
              style={[styles.activityTab, activity === key && styles.activityTabActive]}
            >
              <View
                style={[styles.smallIconCircle, activity === key && styles.smallIconCircleActive]}
              >
                <Text>{activityMeta[key].icon}</Text>
              </View>
              <Text style={[styles.activityText, activity === key && styles.activityTextActive]}>
                {activityMeta[key].label}
              </Text>
            </TouchableOpacity>
          ))}
      </View>

      {activity === 'sleep' && (
        <View style={styles.segmentRow}>
          {[
            { key: 'timer', label: 'Use Sleep Timer' },
            { key: 'manual', label: 'Enter Manually' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => setSleepTrackingMode(item.key as 'timer' | 'manual')}
              style={[
                styles.segment,
                sleepTrackingMode === item.key && styles.segmentActive,
                { flex: 1, height: 42, minWidth: 0, paddingHorizontal: 0, borderRadius: 21 },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  sleepTrackingMode === item.key && styles.white,
                  { fontSize: 13, fontWeight: '700' },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activity !== 'growth' && (
        <>
          <Text style={styles.sectionTitle}>
            {activity === 'feed'
              ? 'Feed Type'
              : activity === 'sleep'
                ? 'Sleep Type'
                : 'Diaper Type'}
          </Text>
          <View style={styles.typeRow}>
            {options.map((type, index) => (
              <TouchableOpacity
                key={type}
                onPress={() => {
                  setSubtype(type);
                  if (activity === 'feed') setFeedType(type as FeedType);
                }}
                style={[styles.typeCard, subtype === type && styles.typeCardActive]}
              >
                <View style={styles.typeIcon}>
                  <Text>{index === 0 ? activityMeta[activity].icon : index === 1 ? '♧' : '♢'}</Text>
                </View>
                <Text style={styles.typeLabel}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <View style={styles.trendCard}>
        <View style={styles.trendHeader}>
          <View style={styles.trendIcon}>
            <Text style={styles.white}>{activityMeta[activity].icon}</Text>
          </View>
          <Text style={styles.trendTitle}>
            {activity === 'growth'
              ? 'Growth Tracking'
              : `${activityMeta[activity].label}ing Trends`}
          </Text>
        </View>

        {activity === 'sleep' && sleepTrackingMode === 'timer' ? (
          activeSleepStart ? (
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ fontSize: 14, color: C.muted, fontWeight: '700', letterSpacing: 0.5 }}>
                ACTIVE TIMER
              </Text>
              <Text
                style={{ fontSize: 44, color: C.purple, fontWeight: '800', marginVertical: 16 }}
              >
                {formatElapsed(elapsedSeconds)}
              </Text>
              <View style={{ width: '100%' }}>
                <Text style={styles.inputLabel}>Notes (optional)</Text>
                <TextInput
                  accessibilityLabel="Notes"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="What is your baby doing?"
                  placeholderTextColor="#A9A9A9"
                  style={[styles.input, styles.notesInput]}
                />
              </View>
              <TouchableOpacity
                disabled={saving}
                style={[styles.logButton, { width: '100%' }, saving && styles.buttonDisabled]}
                onPress={() => void onLog()}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.logButtonText}>End Sleep & Save</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 20 }}>
                Press start to track your baby's sleep in real-time.
              </Text>
              <TouchableOpacity
                style={[styles.logButton, { width: '100%', backgroundColor: C.purple }]}
                onPress={() => setActiveSleepStart(new Date().toISOString())}
              >
                <Text style={styles.logButtonText}>Start Sleep Session</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          <View>
            {activity === 'growth' ? (
              <View style={{ marginBottom: 10 }}>
                {/* Unit system toggle */}
                <Text style={styles.inputLabel}>Unit System</Text>
                <View style={[styles.segmentRow, { marginBottom: 15 }]}>
                  {[
                    { key: 'metric', label: 'Metric (kg, cm)' },
                    { key: 'imperial', label: 'Imperial (lbs, in)' },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setUnitSystem(item.key as 'metric' | 'imperial')}
                      style={[
                        styles.segment,
                        unitSystem === item.key && styles.segmentActive,
                        {
                          flex: 1,
                          height: 38,
                          minWidth: 0,
                          paddingHorizontal: 0,
                          borderRadius: 19,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          unitSystem === item.key && styles.white,
                          { fontSize: 13, fontWeight: '700' },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Weight & Height Input Fields */}
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.inputLabel}>
                      Weight {unitSystem === 'metric' ? '(kg)' : '(lbs)'}
                    </Text>
                    <TextInput
                      accessibilityLabel="Weight"
                      value={weightInput}
                      onChangeText={setWeightInput}
                      keyboardType="numeric"
                      placeholder={unitSystem === 'metric' ? 'e.g. 5.4' : 'e.g. 12.0'}
                      placeholderTextColor="#A9A9A9"
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.inputLabel}>
                      Height {unitSystem === 'metric' ? '(cm)' : '(in)'}
                    </Text>
                    <TextInput
                      accessibilityLabel="Height"
                      value={heightInput}
                      onChangeText={setHeightInput}
                      keyboardType="numeric"
                      placeholder={unitSystem === 'metric' ? 'e.g. 58.2' : 'e.g. 23.0'}
                      placeholderTextColor="#A9A9A9"
                      style={styles.input}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.formRow}>
                {activity === 'feed' && subtype === 'Bottle' ? (
                  <View style={styles.formField}>
                    <Text style={styles.inputLabel}>Amount (ml)</Text>
                    <TextInput
                      accessibilityLabel="Amount in milliliters"
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                ) : null}
                {activity === 'feed' && subtype === 'Breast' ? (
                  <View style={styles.formField}>
                    <Text style={styles.inputLabel}>Breast Side</Text>
                    <View style={{ flexDirection: 'row', gap: 6, height: 42 }}>
                      {['Left', 'Right'].map((side) => (
                        <TouchableOpacity
                          key={side}
                          onPress={() => setBreastSide(side as 'Left' | 'Right')}
                          style={{
                            flex: 1,
                            backgroundColor: breastSide === side ? C.purple : '#EDEDEE',
                            borderRadius: 8,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text
                            style={{
                              color: breastSide === side ? '#FFF' : C.muted,
                              fontSize: 13,
                              fontWeight: '700',
                            }}
                          >
                            {side}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ) : null}
                {activity !== 'diaper' ? (
                  <View style={styles.formField}>
                    <Text style={styles.inputLabel}>Duration (min)</Text>
                    <TextInput
                      accessibilityLabel="Duration in minutes"
                      value={duration}
                      onChangeText={setDuration}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                ) : null}
              </View>
            )}

            {/* Custom Time Selector (Only for feed, sleep, and growth) */}
            {(activity === 'feed' || activity === 'sleep' || activity === 'growth') && (
              <View style={{ marginBottom: 15 }}>
                <TouchableOpacity
                  onPress={() => setCustomTimeEnabled(!customTimeEnabled)}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: C.purple,
                      backgroundColor: customTimeEnabled ? C.purple : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 8,
                    }}
                  >
                    {customTimeEnabled && (
                      <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>✓</Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 14, color: C.ink, fontWeight: '600' }}>
                    Set time of activity
                  </Text>
                </TouchableOpacity>

                {customTimeEnabled && (
                  <View
                    style={{
                      backgroundColor: '#F8F8F8',
                      borderRadius: 8,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: '#EEE',
                      marginBottom: 10,
                    }}
                  >
                    <Text
                      style={{ fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 4 }}
                    >
                      Start Time (HH:MM)
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TextInput
                        value={customTime}
                        onChangeText={setCustomTime}
                        placeholder="14:30"
                        placeholderTextColor="#A9A9A9"
                        style={[styles.input, { flex: 1, height: 40, marginBottom: 0 }]}
                      />

                      {/* Offset Helpers */}
                      <View style={{ flexDirection: 'row', marginLeft: 8 }}>
                        {[
                          { label: '-5m', val: 5 },
                          { label: '-15m', val: 15 },
                          { label: '-30m', val: 30 },
                          { label: '-1h', val: 60 },
                        ].map((offset) => (
                          <TouchableOpacity
                            key={offset.label}
                            onPress={() => {
                              const target = new Date(Date.now() - offset.val * 60 * 1000);
                              const hh = String(target.getHours()).padStart(2, '0');
                              const mm = String(target.getMinutes()).padStart(2, '0');
                              setCustomTime(`${hh}:${mm}`);
                            }}
                            style={{
                              backgroundColor: C.purpleSoft,
                              paddingHorizontal: 8,
                              paddingVertical: 8,
                              borderRadius: 4,
                              marginLeft: 4,
                            }}
                          >
                            <Text style={{ color: C.purpleDark, fontSize: 11, fontWeight: '700' }}>
                              {offset.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              accessibilityLabel="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a useful detail"
              placeholderTextColor="#A9A9A9"
              style={[styles.input, styles.notesInput]}
            />
            <TouchableOpacity
              disabled={saving}
              style={[styles.logButton, saving && styles.buttonDisabled]}
              onPress={() => void onLog()}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.logButtonText}>Save {activityMeta[activity].label}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function HistoryScreen({
  events,
  feedings,
  sleepSessions,
  diapers,
  onRefreshData,
  onBack,
}: {
  events: TimelineEvent[];
  feedings: Feeding[];
  sleepSessions: SleepSession[];
  diapers: DiaperChange[];
  onRefreshData: () => Promise<void>;
  onBack: () => void;
}) {
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
            await api.deleteFeeding(dbId);
          } else if (kind === 'sleep') {
            await api.deleteSleep(dbId);
          } else if (kind === 'diaper') {
            await api.deleteDiaper(dbId);
          } else if (kind === 'growth') {
            await api.deleteGrowth(dbId);
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

  // ── Render ──────────────────────────────────────────────────────────────────
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
          <TouchableOpacity
            onPress={handleDeleteSelected}
            style={{
              backgroundColor: '#EF4444',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
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
                  ← Swipe left for weekly view →
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
                  ← Swipe right for today's timeline
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
            <View
              style={{
                flex: 1,
                backgroundColor: '#DCFCE7',
                borderRadius: 16,
                padding: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 36, fontWeight: '900', color: '#16A34A' }}>
                {diaperTodayData.count}
              </Text>
              <Text style={{ fontSize: 12, color: '#166534', fontWeight: '700' }}>Total</Text>
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              {/* Wet */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#DBEAFE',
                  borderRadius: 12,
                  padding: 10,
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 18 }}>💧</Text>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#1D4ED8' }}>
                    {diaperTodayData.wet}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#1E40AF' }}>Wet</Text>
                </View>
              </View>
              {/* Dirty */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#FEF9C3',
                  borderRadius: 12,
                  padding: 10,
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
              >
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
          <View
            style={{
              backgroundColor: '#BBF7D0',
              borderRadius: 14,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
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

function InsightsScreen({
  baby,
  insight,
  loading,
  feedings,
  sleep,
  onGenerate,
}: {
  baby: Baby | null;
  insight: AIInsight | null;
  loading: boolean;
  feedings: Feeding[];
  sleep: SleepSession[];
  onGenerate: () => Promise<void>;
}) {
  const [insightsTab, setInsightsTab] = useState<'daily' | 'weekly'>('daily');
  const [weeklySummary, setWeeklySummary] = useState<AIWeeklySummary | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const averageBottle = feedings.filter((item) => item.quantity_ml).length
    ? Math.round(
        feedings.reduce((sum, item) => sum + (item.quantity_ml ?? 0), 0) /
          feedings.filter((item) => item.quantity_ml).length,
      )
    : 0;
  const averageSleep = sleep.length
    ? Math.round(sleep.reduce((sum, item) => sum + (item.duration_minutes ?? 0), 0) / sleep.length)
    : 0;

  const handleGenerateWeekly = async () => {
    if (!baby || weeklyLoading) return;
    setWeeklyLoading(true);
    setWeeklyError(null);
    try {
      const data = await api.getWeeklySummary(baby.id);
      setWeeklySummary(data);
    } catch {
      setWeeklyError('Could not generate weekly summary. Check backend connection.');
    } finally {
      setWeeklyLoading(false);
    }
  };

  const submitQuestion = async () => {
    if (!baby || !question.trim() || askLoading) return;
    setAskLoading(true);
    setAskError(null);
    setAnswer(null);
    try {
      const result = await api.askQuestion(baby.id, question.trim());
      setAnswer(result.answer);
    } catch {
      setAskError('Could not reach the AI assistant. Check the backend connection and try again.');
    } finally {
      setAskLoading(false);
    }
  };

  return (
    <View style={{ paddingBottom: 40 }}>
      <Header title="Insights" action="▥" />
      <Text style={styles.heroTitle}>Small patterns.{`\n`}Meaningful progress.</Text>

      {/* Daily/Weekly Segment Toggle */}
      <View style={styles.segmentRow}>
        <TouchableOpacity
          onPress={() => setInsightsTab('daily')}
          style={[
            styles.segment,
            insightsTab === 'daily' && styles.segmentActive,
            { flex: 1, height: 42, minWidth: 0, paddingHorizontal: 0, borderRadius: 21 },
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              insightsTab === 'daily' && styles.white,
              { fontSize: 13, fontWeight: '700' },
            ]}
          >
            Daily Insights
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setInsightsTab('weekly')}
          style={[
            styles.segment,
            insightsTab === 'weekly' && styles.segmentActive,
            { flex: 1, height: 42, minWidth: 0, paddingHorizontal: 0, borderRadius: 21 },
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              insightsTab === 'weekly' && styles.white,
              { fontSize: 13, fontWeight: '700' },
            ]}
          >
            Weekly Summary
          </Text>
        </TouchableOpacity>
      </View>

      {/* DAILY INSIGHTS VIEW */}
      {insightsTab === 'daily' && (
        <View>
          <View style={styles.insightCard}>
            <Text style={styles.insightEyebrow}>LIVE SUMMARY</Text>
            <Text style={styles.insightNumber}>{feedings.length}</Text>
            <Text style={styles.insightUnit}>feedings logged</Text>
            <Text style={styles.insightCopy}>
              {insight?.summary ??
                'Generate a personalized summary from the feeding and sleep entries stored in the database.'}
            </Text>
          </View>
          <View style={styles.insightRow}>
            <View style={styles.insightMini}>
              <Text style={styles.miniNumber}>{averageSleep}m</Text>
              <Text style={styles.miniLabel}>Average sleep</Text>
            </View>
            <View style={styles.insightMini}>
              <Text style={styles.miniNumber}>{averageBottle}ml</Text>
              <Text style={styles.miniLabel}>Average bottle</Text>
            </View>
          </View>
          {insight && (
            <View style={styles.recommendationCard}>
              <Text style={styles.recommendationTitle}>Recommended next steps</Text>
              {insight.recommendations.map((item, index) => (
                <React.Fragment key={item}>
                  <Text style={styles.recommendationText}>
                    {index + 1}. {item}
                  </Text>
                </React.Fragment>
              ))}
            </View>
          )}
          <TouchableOpacity
            disabled={loading}
            style={[styles.logButton, styles.insightButton, loading && styles.buttonDisabled]}
            onPress={() => void onGenerate()}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.logButtonText}>
                {insight ? 'Refresh AI insights' : 'Generate AI insights'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Ask AI Parenting Assistant */}
          <View style={styles.askSectionCard}>
            <Text style={styles.askTitle}>Ask the AI Assistant</Text>
            <Text style={styles.askSubtitle}>
              Ask any parenting question — Gemini will answer using {baby?.name ?? 'your baby'}'s
              logs.
            </Text>
            <View style={styles.askInputContainer}>
              <TextInput
                accessibilityLabel="Parenting question input"
                value={question}
                onChangeText={setQuestion}
                placeholder="e.g. Is Charlie sleeping enough?"
                placeholderTextColor="#A9A9A9"
                style={styles.askInput}
                editable={!askLoading}
              />
              <TouchableOpacity
                accessibilityLabel="Submit question"
                disabled={askLoading || !question.trim()}
                onPress={() => void submitQuestion()}
                style={[
                  styles.askSubmitButton,
                  { width: 46, opacity: askLoading || !question.trim() ? 0.5 : 1 },
                ]}
              >
                {askLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.askSubmitButtonText}>→</Text>
                )}
              </TouchableOpacity>
            </View>
            {askError && (
              <View style={styles.askErrorBox}>
                <Text style={styles.askErrorText}>{askError}</Text>
              </View>
            )}
            {answer && (
              <View style={styles.answerBox}>
                <View style={styles.answerHeaderRow}>
                  <Text style={styles.answerTitle}>AI Response</Text>
                  <TouchableOpacity
                    accessibilityLabel="Clear answer"
                    onPress={() => {
                      setAnswer(null);
                      setQuestion('');
                    }}
                  >
                    <Text style={styles.clearText}>Clear</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.answerContentText, { marginTop: 10 }]}>{answer}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* WEEKLY SUMMARY VIEW */}
      {insightsTab === 'weekly' && (
        <View>
          {weeklyError && (
            <View style={styles.askErrorBox}>
              <Text style={styles.askErrorText}>{weeklyError}</Text>
            </View>
          )}

          <View style={[styles.insightCard, { backgroundColor: C.purpleDark }]}>
            <Text style={styles.insightEyebrow}>WEEKLY SUMMARY</Text>
            <Text style={styles.insightCopy}>
              {weeklySummary?.summary ??
                'Generate a comprehensive weekly summary of all feeding, sleep, diaper, and growth logs.'}
            </Text>
          </View>

          {weeklySummary && (
            <View style={{ gap: 12, marginTop: 14 }}>
              <View style={styles.insightMini}>
                <Text
                  style={{ fontSize: 16, fontWeight: '800', color: C.purpleDark, marginBottom: 6 }}
                >
                  🍏 Feeding Analysis
                </Text>
                <Text style={{ fontSize: 13, color: '#333', lineHeight: 18 }}>
                  {weeklySummary.feeding_insights}
                </Text>
              </View>
              <View style={styles.insightMini}>
                <Text
                  style={{ fontSize: 16, fontWeight: '800', color: C.purpleDark, marginBottom: 6 }}
                >
                  ☾ Sleep Analysis
                </Text>
                <Text style={{ fontSize: 13, color: '#333', lineHeight: 18 }}>
                  {weeklySummary.sleep_insights}
                </Text>
              </View>
              <View style={styles.insightMini}>
                <Text
                  style={{ fontSize: 16, fontWeight: '800', color: C.purpleDark, marginBottom: 6 }}
                >
                  ⚖ Growth Analysis
                </Text>
                <Text style={{ fontSize: 13, color: '#333', lineHeight: 18 }}>
                  {weeklySummary.growth_insights}
                </Text>
              </View>
            </View>
          )}

          {weeklySummary && (
            <View style={styles.recommendationCard}>
              <Text style={styles.recommendationTitle}>Weekly Recommendations</Text>
              {weeklySummary.recommendations.map((item, index) => (
                <React.Fragment key={item}>
                  <Text style={styles.recommendationText}>
                    {index + 1}. {item}
                  </Text>
                </React.Fragment>
              ))}
            </View>
          )}

          <TouchableOpacity
            disabled={weeklyLoading}
            style={[styles.logButton, styles.insightButton, weeklyLoading && styles.buttonDisabled]}
            onPress={() => void handleGenerateWeekly()}
          >
            {weeklyLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.logButtonText}>
                {weeklySummary ? 'Refresh Weekly Summary' : 'Generate Weekly Summary'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function MilestonesScreen({ baby }: { baby: Baby | null }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom Milestone Form State
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  // Edit/Check modal state
  const [activeMilestoneName, setActiveMilestoneName] = useState<string | null>(null);
  const [activeMilestoneNotes, setActiveMilestoneNotes] = useState('');

  // Default CDC Milestones
  const defaultCDC = [
    { name: 'Social Smile', age: '2 months' },
    { name: 'Cooing/Vocalizing', age: '2 months' },
    { name: 'Rolling Over', age: '5 months' },
    { name: 'Sitting Up', age: '6 months' },
    { name: 'Crawling', age: '9 months' },
    { name: 'First Words', age: '12 months' },
    { name: 'First Steps', age: '12 months' },
  ];

  const loadMilestones = async () => {
    if (!baby) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.listMilestones(baby.id);
      setMilestones(data);
    } catch (err) {
      setError('Could not load milestones. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMilestones();
  }, [baby]);

  const handleToggleCDC = async (name: string) => {
    if (!baby) return;
    const existing = milestones.find((m) => m.name.toLowerCase() === name.toLowerCase());

    if (existing) {
      // Uncheck / delete
      try {
        await api.deleteMilestone(existing.id);
        setMilestones((prev) => prev.filter((m) => m.id !== existing.id));
      } catch {
        setError('Could not delete milestone.');
      }
    } else {
      // Check / Add (Open inline dialog to save)
      setActiveMilestoneName(name);
      setActiveMilestoneNotes('');
    }
  };

  const handleSaveMilestone = async () => {
    if (!baby || !activeMilestoneName) return;
    try {
      const created = await api.createMilestone({
        baby_id: baby.id,
        name: activeMilestoneName,
        achieved_at: new Date().toISOString().split('T')[0],
        notes: activeMilestoneNotes || null,
      });
      setMilestones((prev) => [...prev, created]);
      setActiveMilestoneName(null);
      setActiveMilestoneNotes('');
    } catch {
      setError('Could not save milestone.');
    }
  };

  const handleSaveCustom = async () => {
    if (!baby || !customName.trim()) return;
    try {
      const created = await api.createMilestone({
        baby_id: baby.id,
        name: customName.trim(),
        achieved_at: new Date().toISOString().split('T')[0],
        notes: customNotes || null,
      });
      setMilestones((prev) => [...prev, created]);
      setCustomName('');
      setCustomNotes('');
      setShowAddCustom(false);
    } catch {
      setError('Could not save custom milestone.');
    }
  };

  return (
    <View style={{ paddingBottom: 40 }}>
      <Header title="Milestones" action="⚐" />
      <Text style={styles.heroTitle}>Celebrate the{`\n`}small steps.</Text>

      {error && (
        <View style={styles.askErrorBox}>
          <Text style={styles.askErrorText}>{error}</Text>
        </View>
      )}

      {/* CDC Predefined Milestones */}
      <Text style={styles.sectionTitle}>Developmental Checklist</Text>
      <View style={{ backgroundColor: C.card, borderRadius: 24, padding: 18, marginBottom: 20 }}>
        {defaultCDC.map((item) => {
          const matched = milestones.find((m) => m.name.toLowerCase() === item.name.toLowerCase());
          return (
            <View
              key={item.name}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#F0F0F0',
              }}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>{item.name}</Text>
                <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  Typical age: {item.age}
                </Text>
                {matched?.notes && (
                  <Text
                    style={{ fontSize: 12, color: C.purpleDark, fontStyle: 'italic', marginTop: 4 }}
                  >
                    Note: {matched.notes}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => void handleToggleCDC(item.name)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  borderWidth: 2.5,
                  borderColor: C.purple,
                  backgroundColor: matched ? C.purple : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {matched && (
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Inline notes dialog for checklist milestones */}
      {activeMilestoneName && (
        <View
          style={{
            backgroundColor: C.purpleSoft,
            borderRadius: 20,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#DDB8EE',
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.purpleDark, marginBottom: 4 }}>
            Celebrate {activeMilestoneName}!
          </Text>
          <Text style={{ fontSize: 12, color: C.ink, marginBottom: 12 }}>
            Add any notes about this milestone (optional).
          </Text>
          <TextInput
            value={activeMilestoneNotes}
            onChangeText={setActiveMilestoneNotes}
            placeholder="e.g. He smiled at mommy for the first time!"
            placeholderTextColor="#A9A9A9"
            style={[styles.input, { backgroundColor: '#FFF', marginBottom: 12 }]}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => void handleSaveMilestone()}
              style={{
                backgroundColor: C.purple,
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 12,
                flex: 1,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>
                Mark as Achieved
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveMilestoneName(null)}
              style={{
                backgroundColor: '#FFF',
                borderWidth: 1,
                borderColor: '#CCC',
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 12,
                flex: 1,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: C.ink, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Custom Milestones list */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text style={styles.sectionTitle}>Custom Achievements</Text>
        <TouchableOpacity
          onPress={() => setShowAddCustom(!showAddCustom)}
          style={{
            backgroundColor: C.purpleSoft,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: C.purpleDark, fontWeight: '700', fontSize: 12 }}>+ Add New</Text>
        </TouchableOpacity>
      </View>

      {showAddCustom && (
        <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 20 }}>
          <Text style={styles.inputLabel}>Milestone Name</Text>
          <TextInput
            value={customName}
            onChangeText={setCustomName}
            placeholder="e.g. Rolled from back to tummy"
            placeholderTextColor="#A9A9A9"
            style={styles.input}
          />
          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput
            value={customNotes}
            onChangeText={setCustomNotes}
            placeholder="Add some details..."
            placeholderTextColor="#A9A9A9"
            style={styles.input}
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              disabled={!customName.trim()}
              onPress={() => void handleSaveCustom()}
              style={[
                styles.logButton,
                { flex: 1, marginTop: 0 },
                !customName.trim() && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.logButtonText}>Save Milestone</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowAddCustom(false)}
              style={{
                backgroundColor: '#ECECEC',
                borderRadius: 24,
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: C.ink, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Display other/custom milestones */}
      <View>
        {milestones
          .filter((m) => !defaultCDC.some((d) => d.name.toLowerCase() === m.name.toLowerCase()))
          .map((m) => (
            <View
              key={m.id}
              style={{
                backgroundColor: C.card,
                borderRadius: 16,
                padding: 14,
                marginBottom: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>{m.name}</Text>
                {m.achieved_at && (
                  <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    Achieved:{' '}
                    {new Date(m.achieved_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                )}
                {m.notes && (
                  <Text style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{m.notes}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await api.deleteMilestone(m.id);
                    setMilestones((prev) => prev.filter((item) => item.id !== m.id));
                  } catch {
                    setError('Could not delete milestone.');
                  }
                }}
                style={{ padding: 6 }}
              >
                <Text style={{ color: '#E53E3E', fontSize: 16 }}>🗑</Text>
              </TouchableOpacity>
            </View>
          ))}
        {milestones.filter(
          (m) => !defaultCDC.some((d) => d.name.toLowerCase() === m.name.toLowerCase()),
        ).length === 0 &&
          !showAddCustom && (
            <Text
              style={{ fontSize: 12, color: C.muted, textAlign: 'center', paddingVertical: 10 }}
            >
              No custom achievements logged yet.
            </Text>
          )}
      </View>
    </View>
  );
}

function GrowthScreen({
  baby,
  growth,
  unitSystem,
  setUnitSystem,
  onRefreshData,
}: {
  baby: Baby | null;
  growth: GrowthRecord[];
  unitSystem: 'metric' | 'imperial';
  setUnitSystem: (value: 'metric' | 'imperial') => void;
  onRefreshData: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [notes, setNotes] = useState('');
  const [customDateStr, setCustomDateStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const [chartMetric, setChartMetric] = useState<'weight' | 'height'>('weight');

  const sorted = useMemo(
    () => [...growth].sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at)),
    [growth],
  );

  const latest = sorted[sorted.length - 1] ?? null;
  const previous = sorted[sorted.length - 2] ?? null;

  useEffect(() => {
    if (showModal) {
      setWeight('');
      setHeight('');
      setNotes('');
      setLogError(null);
      const d = new Date();
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      setCustomDateStr(`${dd}/${mm}/${yyyy}`);
    }
  }, [showModal]);

  const displayWeight = (kg: number | null | undefined) => {
    if (kg == null) return '—';
    return unitSystem === 'metric' ? `${kg.toFixed(2)} kg` : `${(kg * 2.20462).toFixed(2)} lbs`;
  };
  const displayHeight = (cm: number | null | undefined) => {
    if (cm == null) return '—';
    return unitSystem === 'metric' ? `${cm.toFixed(1)} cm` : `${(cm / 2.54).toFixed(1)} in`;
  };

  const parseDateString = (str: string): Date | null => {
    const parts = str.trim().split('/');
    if (parts.length !== 3) return null;
    const day = Number(parts[0]);
    const month = Number(parts[1]) - 1; // 0-indexed month
    const year = Number(parts[2]);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31 || month < 0 || month > 11 || year < 2000 || year > 2100) {
      return null;
    }
    const d = new Date(year, month, day, 12, 0, 0, 0); // midday to avoid timezone shifts
    if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) {
      return null;
    }
    return d;
  };

  const handleSubmit = async () => {
    if (!baby || saving) return;
    setSaving(true);
    setLogError(null);
    let w_kg: number | null = null;
    let h_cm: number | null = null;
    if (weight.trim()) {
      const w_val = Number(weight);
      if (isNaN(w_val) || w_val <= 0) {
        setLogError('Weight must be a valid positive number');
        setSaving(false);
        return;
      }
      w_kg = unitSystem === 'metric' ? w_val : w_val / 2.20462;
    }
    if (height.trim()) {
      const h_val = Number(height);
      if (isNaN(h_val) || h_val <= 0) {
        setLogError('Height must be a valid positive number');
        setSaving(false);
        return;
      }
      h_cm = unitSystem === 'metric' ? h_val : h_val * 2.54;
    }
    if (w_kg === null && h_cm === null) {
      setLogError('Please enter at least one metric (weight or height).');
      setSaving(false);
      return;
    }
    const parsedDate = parseDateString(customDateStr);
    if (!parsedDate) {
      setLogError('Please enter a valid date in DD/MM/YYYY format');
      setSaving(false);
      return;
    }
    const growthTime = parsedDate;
    try {
      await api.createGrowth({
        baby_id: baby.id,
        recorded_at: growthTime.toISOString(),
        weight_kg: w_kg,
        height_cm: h_cm,
        notes: notes || null,
      });
      setShowModal(false);
      onRefreshData();
    } catch (err) {
      setLogError('Could not save growth entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Build chart data from sorted records
  const chartData = useMemo(() => {
    const relevant = sorted.filter((r) =>
      chartMetric === 'weight' ? r.weight_kg != null : r.height_cm != null,
    );
    return relevant.slice(-8); // show last 8 entries
  }, [sorted, chartMetric]);

  const chartValues = chartData.map((r) =>
    chartMetric === 'weight' ? (r.weight_kg ?? 0) : (r.height_cm ?? 0),
  );
  const maxVal = Math.max(...chartValues, 0.01);
  const minVal = Math.min(...chartValues, 0);
  const range = maxVal - minVal || 1;
  const BAR_HEIGHT = 120;

  const formatChartLabel = (r: GrowthRecord) => {
    const d = new Date(r.recorded_at);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const latestWeightDelta = () => {
    if (!latest?.weight_kg || !previous?.weight_kg) return null;
    const diff = latest.weight_kg - previous.weight_kg;
    const diffDisplay =
      unitSystem === 'metric'
        ? `${diff > 0 ? '+' : ''}${diff.toFixed(2)} kg`
        : `${diff > 0 ? '+' : ''}${(diff * 2.20462).toFixed(2)} lbs`;
    return diffDisplay;
  };

  const latestHeightDelta = () => {
    if (!latest?.height_cm || !previous?.height_cm) return null;
    const diff = latest.height_cm - previous.height_cm;
    const diffDisplay =
      unitSystem === 'metric'
        ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)} cm`
        : `${diff > 0 ? '+' : ''}${(diff / 2.54).toFixed(1)} in`;
    return diffDisplay;
  };

  return (
    <View style={{ paddingBottom: 40 }}>
      <Header title="Growth" action="⚖" />
      <Text style={styles.heroTitle}>
        {baby ? `${baby.name}'s` : 'Baby'}
        {'\n'}Growth Journey
      </Text>

      {/* Summary cards */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
        <View style={[styles.insightMini, { flex: 1 }]}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: C.muted,
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            WEIGHT
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>
            {displayWeight(latest?.weight_kg)}
          </Text>
          {latestWeightDelta() && (
            <Text style={{ fontSize: 11, color: '#38B86A', fontWeight: '700', marginTop: 4 }}>
              {latestWeightDelta()} since last
            </Text>
          )}
        </View>
        <View style={[styles.insightMini, { flex: 1 }]}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: C.muted,
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            HEIGHT
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>
            {displayHeight(latest?.height_cm)}
          </Text>
          {latestHeightDelta() && (
            <Text style={{ fontSize: 11, color: '#38B86A', fontWeight: '700', marginTop: 4 }}>
              {latestHeightDelta()} since last
            </Text>
          )}
        </View>
      </View>

      {/* Chart section */}
      <View style={{ backgroundColor: C.card, borderRadius: 26, padding: 18, marginBottom: 20 }}>
        {/* Toggle weight/height chart */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['weight', 'height'] as const).map((metric) => (
            <TouchableOpacity
              key={metric}
              onPress={() => setChartMetric(metric)}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 18,
                backgroundColor: chartMetric === metric ? C.purple : '#EDEDEE',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: chartMetric === metric ? '#FFF' : C.muted,
                  fontSize: 13,
                  fontWeight: '700',
                }}
              >
                {metric === 'weight' ? `⚖ Weight` : `↕ Height`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {chartData.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 30 }}>
            <Text style={{ fontSize: 32, marginBottom: 10 }}>📏</Text>
            <Text style={{ fontSize: 14, color: C.muted, textAlign: 'center' }}>
              No {chartMetric} data yet.{'\n'}Log your first entry below.
            </Text>
          </View>
        ) : (
          <View>
            {/* Y-axis max */}
            <Text style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>
              {chartMetric === 'weight' ? displayWeight(maxVal) : displayHeight(maxVal)}
            </Text>
            {/* Bars */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                height: BAR_HEIGHT,
                gap: 6,
                marginBottom: 6,
              }}
            >
              {chartData.map((r, i) => {
                const val = chartMetric === 'weight' ? (r.weight_kg ?? 0) : (r.height_cm ?? 0);
                const barH = Math.max(4, ((val - minVal) / range) * BAR_HEIGHT);
                const isLatest = i === chartData.length - 1;
                return (
                  <View key={r.id} style={{ flex: 1, alignItems: 'center' }}>
                    {isLatest && (
                      <Text
                        style={{
                          fontSize: 9,
                          fontWeight: '700',
                          color: C.purpleDark,
                          marginBottom: 2,
                        }}
                      >
                        {chartMetric === 'weight' ? displayWeight(val) : displayHeight(val)}
                      </Text>
                    )}
                    <View
                      style={{
                        width: '100%',
                        height: barH,
                        borderTopLeftRadius: 6,
                        borderTopRightRadius: 6,
                        backgroundColor: isLatest ? C.purple : '#DDB8EE',
                      }}
                    />
                  </View>
                );
              })}
            </View>
            {/* X-axis labels */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {chartData.map((r) => (
                <Text
                  key={r.id}
                  style={{ flex: 1, fontSize: 9, color: C.muted, textAlign: 'center' }}
                >
                  {formatChartLabel(r)}
                </Text>
              ))}
            </View>
            {/* Y-axis min */}
            <Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
              {chartMetric === 'weight' ? displayWeight(minVal) : displayHeight(minVal)}
            </Text>
          </View>
        )}
      </View>

      {/* Log button */}
      <TouchableOpacity style={styles.logButton} onPress={() => setShowModal(true)}>
        <Text style={styles.logButtonText}>+ Log Growth Entry</Text>
      </TouchableOpacity>

      {/* Entry history */}
      {sorted.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>All Entries</Text>
          {[...sorted].reverse().map((r) => (
            <View
              key={r.id}
              style={{
                backgroundColor: C.card,
                borderRadius: 18,
                padding: 14,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: C.purpleSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 20 }}>⚖</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>
                  {r.weight_kg != null ? displayWeight(r.weight_kg) : ''}
                  {r.weight_kg != null && r.height_cm != null ? ' · ' : ''}
                  {r.height_cm != null ? displayHeight(r.height_cm) : ''}
                </Text>
                <Text style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                  {new Date(r.recorded_at).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  {new Date(r.recorded_at).toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
                {r.notes && (
                  <Text style={{ fontSize: 11, color: '#666', marginTop: 2, fontStyle: 'italic' }}>
                    {r.notes}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {sorted.length === 0 && (
        <View style={[styles.emptyCard, { marginTop: 24 }]}>
          <Text style={styles.emptyTitle}>No growth entries yet</Text>
          <Text style={styles.emptyCopy}>Tap the button above to log weight or height.</Text>
        </View>
      )}

      {/* Floating Log Modal */}
      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFF',
              borderRadius: 24,
              width: '100%',
              maxWidth: 450,
              padding: 22,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            {/* Modal Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 18,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>
                Log Growth Entry
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: C.muted, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Error banner */}
            {logError && (
              <View
                style={{
                  backgroundColor: '#FEE2E2',
                  borderRadius: 12,
                  padding: 10,
                  marginBottom: 15,
                }}
              >
                <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600' }}>
                  {logError}
                </Text>
              </View>
            )}

            {/* Unit System Toggle */}
            <Text style={styles.inputLabel}>Unit System</Text>
            <View style={[styles.segmentRow, { marginBottom: 15 }]}>
              {[
                { key: 'metric', label: 'Metric (kg, cm)' },
                { key: 'imperial', label: 'Imperial (lbs, in)' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setUnitSystem(item.key as 'metric' | 'imperial')}
                  style={[
                    styles.segment,
                    unitSystem === item.key && styles.segmentActive,
                    { flex: 1, height: 38, minWidth: 0, paddingHorizontal: 0, borderRadius: 19 },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      unitSystem === item.key && styles.white,
                      { fontSize: 13, fontWeight: '700' },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Numeric Input Fields */}
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>
                  Weight {unitSystem === 'metric' ? '(kg)' : '(lbs)'}
                </Text>
                <TextInput
                  accessibilityLabel="Weight"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  placeholder={unitSystem === 'metric' ? 'e.g. 5.4' : 'e.g. 12.0'}
                  placeholderTextColor="#A9A9A9"
                  style={styles.input}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>
                  Height {unitSystem === 'metric' ? '(cm)' : '(in)'}
                </Text>
                <TextInput
                  accessibilityLabel="Height"
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                  placeholder={unitSystem === 'metric' ? 'e.g. 58.2' : 'e.g. 23.0'}
                  placeholderTextColor="#A9A9A9"
                  style={styles.input}
                />
              </View>
            </View>

            {/* Custom Date Selector */}
            <View style={{ marginBottom: 15, marginTop: 10 }}>
              <Text style={styles.inputLabel}>Date of Activity (DD/MM/YYYY)</Text>
              <TextInput
                value={customDateStr}
                onChangeText={setCustomDateStr}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#A9A9A9"
                style={styles.input}
              />

              {/* Quick Offset Helpers */}
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                {[
                  { label: 'Today', offsetDays: 0 },
                  { label: 'Yesterday', offsetDays: 1 },
                  { label: '3 days ago', offsetDays: 3 },
                ].map((helper) => (
                  <TouchableOpacity
                    key={helper.label}
                    onPress={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - helper.offsetDays);
                      const dd = String(d.getDate()).padStart(2, '0');
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      const yyyy = d.getFullYear();
                      setCustomDateStr(`${dd}/${mm}/${yyyy}`);
                    }}
                    style={{
                      backgroundColor: C.purpleSoft,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: C.purpleDark, fontSize: 11, fontWeight: '700' }}>
                      {helper.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              accessibilityLabel="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a useful detail"
              placeholderTextColor="#A9A9A9"
              style={[styles.input, styles.notesInput, { marginBottom: 20 }]}
            />

            {/* Submit Button */}
            <TouchableOpacity
              disabled={saving}
              style={[styles.logButton, saving && styles.buttonDisabled]}
              onPress={() => void handleSubmit()}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.logButtonText}>Save Growth</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const items: { key: Tab; icon: string; label: string }[] = [
    { key: 'home', icon: '⌂', label: 'Home' },
    { key: 'log', icon: '+', label: 'Log' },
    { key: 'growth', icon: '⚖', label: 'Growth' },
    { key: 'insights', icon: '▥', label: 'Insights' },
    { key: 'milestones', icon: '⚐', label: 'Goals' },
  ];
  return (
    <View style={styles.navWrap}>
      <View style={styles.nav}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={() => onChange(item.key)}
            style={styles.navItem}
          >
            <Text style={[styles.navIcon, active === item.key && styles.purpleText]}>
              {item.icon}
            </Text>
            <Text style={[styles.navLabel, active === item.key && styles.purpleText]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
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
