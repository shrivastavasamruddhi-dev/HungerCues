import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import {
  api,
  AIInsight,
  Baby,
  DiaperChange,
  Feeding,
  SleepSession,
} from './src/api';

type Tab = 'home' | 'log' | 'history' | 'insights';
type Activity = 'feed' | 'sleep' | 'diaper';
type FeedType = 'Breast' | 'Bottle' | 'Solid';
type TimelineEvent = {
  id: string;
  kind: Activity;
  icon: string;
  title: string;
  occurredAt: string;
  note: string;
};

const C = {
  ink: '#111111',
  muted: '#8D8D8D',
  canvas: '#ECECEC',
  card: '#FFFFFF',
  purple: '#C45BF2',
  purpleDark: '#A83CDE',
  purpleSoft: '#F1DDFB',
  line: '#E7E7E7',
};

const activityMeta = {
  feed: { icon: '♙', label: 'Feed' },
  sleep: { icon: '☾', label: 'Sleep' },
  diaper: { icon: '♢', label: 'Diaper' },
};

export default function App() {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('home');
  const [filter, setFilter] = useState<'all' | Activity>('all');
  const [activity, setActivity] = useState<Activity>('feed');
  const [feedType, setFeedType] = useState<FeedType>('Breast');
  const [subtype, setSubtype] = useState('Breast');
  const [amount, setAmount] = useState('120');
  const [duration, setDuration] = useState('15');
  const [notes, setNotes] = useState('');
  const [baby, setBaby] = useState<Baby | null>(null);
  const [feedings, setFeedings] = useState<Feeding[]>([]);
  const [sleep, setSleep] = useState<SleepSession[]>([]);
  const [diapers, setDiapers] = useState<DiaperChange[]>([]);
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const compact = width < 430;

  const loadData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const babies = await api.listBabies();
      const activeBaby = babies[0];
      if (!activeBaby) throw new Error('No baby profile was found.');
      const [feedingData, sleepData, diaperData] = await Promise.all([
        api.listFeedings(activeBaby.id),
        api.listSleep(activeBaby.id),
        api.listDiapers(activeBaby.id),
      ]);
      setBaby(activeBaby);
      setFeedings(feedingData);
      setSleep(sleepData);
      setDiapers(diaperData);
    } catch {
      setError('Cannot reach the tracker service. Start the backend and pull to retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const defaults = activity === 'feed'
      ? { type: feedType, amount: '120', duration: '15' }
      : activity === 'sleep'
        ? { type: 'Nap', amount: '', duration: '60' }
        : { type: 'Wet', amount: '', duration: '' };
    setSubtype(defaults.type);
    setAmount(defaults.amount);
    setDuration(defaults.duration);
    setNotes('');
  }, [activity, feedType]);

  const events = useMemo<TimelineEvent[]>(() => {
    const feedingEvents = feedings.map((item) => ({
      id: `feed-${item.id}`,
      kind: 'feed' as const,
      icon: activityMeta.feed.icon,
      title: `${capitalize(item.type)} Feed`,
      occurredAt: item.start_time,
      note: `${item.quantity_ml ? `${item.quantity_ml} ml · ` : ''}${item.duration_minutes} min${item.notes ? ` · ${item.notes}` : ''}`,
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
    return [...feedingEvents, ...sleepEvents, ...diaperEvents]
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  }, [feedings, sleep, diapers]);

  const visibleEvents = filter === 'all' ? events : events.filter((event) => event.kind === filter);

  const logActivity = async () => {
    if (!baby || saving) return;
    setSaving(true);
    setError(null);
    const now = new Date();
    try {
      if (activity === 'feed') {
        await api.createFeeding({
          baby_id: baby.id,
          type: subtype.toLowerCase(),
          start_time: now.toISOString(),
          duration_minutes: Number(duration) || 15,
          quantity_ml: subtype === 'Bottle' ? Number(amount) || 120 : null,
          notes: notes || null,
        });
      } else if (activity === 'sleep') {
        const minutes = Number(duration) || 60;
        await api.createSleep({
          baby_id: baby.id,
          sleep_start: new Date(now.getTime() - minutes * 60_000).toISOString(),
          sleep_end: now.toISOString(),
          duration_minutes: minutes,
          tracking_method: subtype.toLowerCase(),
          notes: notes || null,
        });
      } else {
        await api.createDiaper({
          baby_id: baby.id,
          changed_at: now.toISOString(),
          type: subtype.toLowerCase(),
          notes: notes || null,
        });
      }
      await loadData(false);
      setNotice(`${activityMeta[activity].label} saved to the database`);
      setTimeout(() => setNotice(null), 2500);
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.canvas} />
      <View style={[styles.shell, !compact && styles.desktopShell]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void loadData()} tintColor={C.purple} />}
        >
          {notice && <View style={styles.notice}><Text style={styles.noticeText}>✓ {notice}</Text></View>}
          {error && <TouchableOpacity style={styles.errorBanner} onPress={() => void loadData()}><Text style={styles.errorText}>{error}</Text><Text style={styles.retryText}>Tap to retry</Text></TouchableOpacity>}
          {loading && !baby ? (
            <View style={styles.loadingState}><ActivityIndicator size="large" color={C.purple} /><Text style={styles.loadingText}>Loading Charlie's day...</Text></View>
          ) : null}
          {tab === 'home' && <HomeScreen baby={baby} events={visibleEvents} feedings={feedings} diapers={diapers} filter={filter} setFilter={setFilter} onQuickLog={(kind) => { setActivity(kind); setTab('log'); }} />}
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
            />
          )}
          {tab === 'history' && <HistoryScreen events={events} />}
          {tab === 'insights' && <InsightsScreen insight={insight} loading={insightLoading} feedings={feedings} sleep={sleep} onGenerate={loadInsights} />}
        </ScrollView>
        <BottomNav active={tab} onChange={setTab} />
      </View>
    </SafeAreaView>
  );
}

function Header({ title, action = '⋮' }: { title: string; action?: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity accessibilityLabel="More options" style={styles.headerAction}>
        <Text style={styles.headerActionText}>{action}</Text>
      </TouchableOpacity>
    </View>
  );
}

function SegmentedControl({ active, onChange }: { active: 'all' | Activity; onChange: (value: 'all' | Activity) => void }) {
  return (
    <View style={styles.segmentRow}>
      {[
        { key: 'all', icon: '', label: 'All' },
        { key: 'feed', icon: '♙', label: 'Feed' },
        { key: 'diaper', icon: '♢', label: 'Diaper' },
      ].map((item) => (
        <TouchableOpacity key={item.key} onPress={() => onChange(item.key as 'all' | Activity)} style={[styles.segment, active === item.key && styles.segmentActive]}>
          {!!item.icon && <Text style={[styles.segmentIcon, active === item.key && styles.white]}>{item.icon}</Text>}
          <Text style={[styles.segmentText, active === item.key && styles.white]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function HomeScreen({ baby, events, feedings, diapers, filter, setFilter, onQuickLog }: {
  baby: Baby | null;
  events: TimelineEvent[];
  feedings: Feeding[];
  diapers: DiaperChange[];
  filter: 'all' | Activity;
  setFilter: (value: 'all' | Activity) => void;
  onQuickLog: (kind: Activity) => void;
}) {
  const latestBottle = feedings.find((item) => item.quantity_ml);
  const today = new Date().toDateString();
  const todayDiapers = diapers.filter((item) => new Date(item.changed_at).toDateString() === today).length;
  return (
    <View>
      <Header title={baby ? `${baby.name}'s day` : 'BabyTracker'} action="✓" />
      <View style={styles.connectionRow}><View style={styles.onlineDot} /><Text style={styles.connectionText}>Live data · SQLite connected</Text></View>
      <SegmentedControl active={filter} onChange={setFilter} />
      <Text style={styles.heroTitle}>{events.length ? `${events.length} moments logged.\nEvery one matters.` : 'Your Every Step\nIn Parenting\nMatters'}</Text>
      <View style={styles.heroVisual}>
        <View style={styles.motherHalo} />
        <Text style={styles.familyEmoji}>👩‍🍼</Text>
        <TouchableOpacity style={styles.feedTile} onPress={() => onQuickLog('feed')}>
          <View style={styles.tileTopRow}>
            <Text style={styles.tileValue}>{latestBottle?.quantity_ml ?? 120}ml</Text>
            <View style={styles.roundWhite}><Text>♙</Text></View>
          </View>
          <Text style={styles.tileLabel}>{latestBottle ? 'Latest bottle' : 'Log first bottle'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.diaperTile} onPress={() => onQuickLog('diaper')}>
          <Text style={styles.diaperValue}>{todayDiapers}</Text>
          <Text style={styles.diaperLabel}>Diapers today</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function LogScreen({ activity, setActivity, feedType, setFeedType, subtype, setSubtype, amount, setAmount, duration, setDuration, notes, setNotes, saving, onLog }: {
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
}) {
  const options = activity === 'feed' ? ['Breast', 'Bottle', 'Solid'] : activity === 'sleep' ? ['Nap', 'Night', 'Rest'] : ['Wet', 'Mixed', 'Dry'];
  return (
    <View>
      <Header title="Quick Log" />
      <View style={styles.activityTabs}>
        {(Object.keys(activityMeta) as Activity[]).map((key) => (
          <TouchableOpacity key={key} onPress={() => setActivity(key)} style={[styles.activityTab, activity === key && styles.activityTabActive]}>
            <View style={[styles.smallIconCircle, activity === key && styles.smallIconCircleActive]}><Text>{activityMeta[key].icon}</Text></View>
            <Text style={[styles.activityText, activity === key && styles.activityTextActive]}>{activityMeta[key].label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{activity === 'feed' ? 'Feed Type' : activity === 'sleep' ? 'Sleep Type' : 'Diaper Type'}</Text>
      <View style={styles.typeRow}>
        {options.map((type, index) => (
          <TouchableOpacity key={type} onPress={() => { setSubtype(type); if (activity === 'feed') setFeedType(type as FeedType); }} style={[styles.typeCard, subtype === type && styles.typeCardActive]}>
            <View style={styles.typeIcon}><Text>{index === 0 ? activityMeta[activity].icon : index === 1 ? '♧' : '♢'}</Text></View>
            <Text style={styles.typeLabel}>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.trendCard}>
        <View style={styles.trendHeader}>
          <View style={styles.trendIcon}><Text style={styles.white}>{activityMeta[activity].icon}</Text></View>
          <Text style={styles.trendTitle}>{activityMeta[activity].label}ing Trends</Text>
        </View>
        <View style={styles.formRow}>
          {activity === 'feed' && subtype === 'Bottle' ? <View style={styles.formField}><Text style={styles.inputLabel}>Amount (ml)</Text><TextInput accessibilityLabel="Amount in milliliters" value={amount} onChangeText={setAmount} keyboardType="numeric" style={styles.input} /></View> : null}
          {activity !== 'diaper' ? <View style={styles.formField}><Text style={styles.inputLabel}>Duration (min)</Text><TextInput accessibilityLabel="Duration in minutes" value={duration} onChangeText={setDuration} keyboardType="numeric" style={styles.input} /></View> : null}
        </View>
        <Text style={styles.inputLabel}>Notes (optional)</Text>
        <TextInput accessibilityLabel="Notes" value={notes} onChangeText={setNotes} placeholder="Add a useful detail" placeholderTextColor="#A9A9A9" style={[styles.input, styles.notesInput]} />
        <MiniChart />
        <TouchableOpacity disabled={saving} style={[styles.logButton, saving && styles.buttonDisabled]} onPress={() => void onLog()}>{saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.logButtonText}>Save {activityMeta[activity].label}</Text>}</TouchableOpacity>
      </View>
    </View>
  );
}

function MiniChart() {
  return (
    <View style={styles.chart}>
      <Text style={styles.chartMax}>200</Text>
      <View style={styles.dashLine} />
      <Text style={styles.chartMid}>120ml</Text>
      <View style={styles.bars}>
        {[52, 20, 38, 46, 30, 36].map((height, i) => <View key={i} style={[styles.bar, { height, opacity: i === 0 ? 1 : 0.18 }]} />)}
      </View>
    </View>
  );
}

function HistoryScreen({ events }: { events: TimelineEvent[] }) {
  const recent = useMemo(() => events.slice(0, 12), [events]);
  const counts = {
    feed: events.filter((event) => event.kind === 'feed').length,
    sleep: events.filter((event) => event.kind === 'sleep').length,
    diaper: events.filter((event) => event.kind === 'diaper').length,
  };
  return (
    <View>
      <Header title="History" action="▽" />
      <Text style={styles.sectionTitle}>Today Timeline</Text>
      <View style={styles.chips}>
        {[`${counts.feed} feeds`, `${counts.sleep} sleep sessions`, `${counts.diaper} diapers`].map((chip) => <View key={chip} style={styles.chip}><Text style={styles.chipText}>{chip}</Text></View>)}
      </View>
      <View style={styles.historyChart}>
        <View style={styles.averageLine}><View style={styles.averageDot} /><Text style={styles.averageText}>1 Day Avg.</Text></View>
        <View style={styles.historyBars}>{[52, 86, 130, 60, 100, 72].map((h, i) => <View key={i} style={[styles.historyBar, { height: h }, i === 2 && styles.historyBarActive]} />)}</View>
      </View>
      <Text style={styles.sectionTitle}>Recent activity</Text>
      {!recent.length && <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No activity yet</Text><Text style={styles.emptyCopy}>Use Quick Log to save the first moment.</Text></View>}
      {recent.map((event) => (
        <View key={event.id} style={styles.eventCard}>
          <View style={styles.eventIcon}><Text style={styles.purpleText}>{event.icon}</Text></View>
          <View style={styles.eventBody}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventMeta}>{formatEventTime(event.occurredAt)} · {event.note}</Text></View>
        </View>
      ))}
    </View>
  );
}

function InsightsScreen({ insight, loading, feedings, sleep, onGenerate }: { insight: AIInsight | null; loading: boolean; feedings: Feeding[]; sleep: SleepSession[]; onGenerate: () => Promise<void> }) {
  const averageBottle = feedings.filter((item) => item.quantity_ml).length
    ? Math.round(feedings.reduce((sum, item) => sum + (item.quantity_ml ?? 0), 0) / feedings.filter((item) => item.quantity_ml).length)
    : 0;
  const averageSleep = sleep.length ? Math.round(sleep.reduce((sum, item) => sum + (item.duration_minutes ?? 0), 0) / sleep.length) : 0;
  return (
    <View>
      <Header title="Insights" action="✦" />
      <Text style={styles.heroTitle}>Small patterns.{`\n`}Meaningful progress.</Text>
      <View style={styles.insightCard}><Text style={styles.insightEyebrow}>LIVE SUMMARY</Text><Text style={styles.insightNumber}>{feedings.length}</Text><Text style={styles.insightUnit}>feedings logged</Text><Text style={styles.insightCopy}>{insight?.summary ?? 'Generate a personalized summary from the feeding and sleep entries stored in the database.'}</Text></View>
      <View style={styles.insightRow}><View style={styles.insightMini}><Text style={styles.miniNumber}>{averageSleep}m</Text><Text style={styles.miniLabel}>Average sleep</Text></View><View style={styles.insightMini}><Text style={styles.miniNumber}>{averageBottle}ml</Text><Text style={styles.miniLabel}>Average bottle</Text></View></View>
      {insight && <View style={styles.recommendationCard}><Text style={styles.recommendationTitle}>Recommended next steps</Text>{insight.recommendations.map((item, index) => <Text key={item} style={styles.recommendationText}>{index + 1}. {item}</Text>)}</View>}
      <TouchableOpacity disabled={loading} style={[styles.logButton, styles.insightButton, loading && styles.buttonDisabled]} onPress={() => void onGenerate()}>{loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.logButtonText}>{insight ? 'Refresh AI insights' : 'Generate AI insights'}</Text>}</TouchableOpacity>
    </View>
  );
}

function capitalize(value: string) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function formatEventTime(value: string) {
  const date = new Date(value);
  const today = date.toDateString() === new Date().toDateString();
  return `${today ? 'Today' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const items: { key: Tab; icon: string; label: string }[] = [
    { key: 'home', icon: '⌂', label: 'Home' }, { key: 'log', icon: '+', label: 'Log' }, { key: 'history', icon: '◴', label: 'History' }, { key: 'insights', icon: '▥', label: 'Insights' },
  ];
  return (
    <View style={styles.navWrap}><View style={styles.nav}>
      {items.map((item) => <TouchableOpacity key={item.key} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => onChange(item.key)} style={styles.navItem}><Text style={[styles.navIcon, active === item.key && styles.purpleText]}>{item.icon}</Text><Text style={[styles.navLabel, active === item.key && styles.purpleText]}>{item.label}</Text></TouchableOpacity>)}
    </View></View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.canvas },
  shell: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: C.canvas },
  desktopShell: { marginVertical: 22, borderRadius: 38, overflow: 'hidden', maxHeight: 880, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 30, elevation: 10 },
  scroll: { padding: 18, paddingTop: 16, paddingBottom: 118, minHeight: '100%' },
  header: { height: 54, backgroundColor: C.card, borderRadius: 28, paddingLeft: 18, paddingRight: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 },
  headerTitle: { color: C.ink, fontSize: 16, fontWeight: '600' },
  headerAction: { width: 42, height: 42, borderRadius: 22, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' },
  headerActionText: { fontSize: 20, color: '#FFF', fontWeight: '600' },
  connectionRow: { flexDirection: 'row', alignItems: 'center', marginTop: -14, marginBottom: 18, paddingLeft: 8 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#38B86A', marginRight: 7 },
  connectionText: { color: '#666', fontSize: 11, fontWeight: '600' },
  notice: { backgroundColor: '#E7F8EC', borderRadius: 14, padding: 12, marginBottom: 12 },
  noticeText: { color: '#19763B', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  errorBanner: { backgroundColor: '#FFF0F0', borderRadius: 16, padding: 13, marginBottom: 14 },
  errorText: { color: '#A23B3B', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  retryText: { color: '#A23B3B', fontSize: 10, textAlign: 'center', marginTop: 4 },
  loadingState: { minHeight: 240, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: C.muted, marginTop: 12, fontSize: 13 },
  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  segment: { minWidth: 82, height: 50, paddingHorizontal: 17, borderRadius: 26, backgroundColor: '#DEDEDE', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  segmentActive: { backgroundColor: C.purple }, segmentText: { color: C.muted, fontSize: 15 }, segmentIcon: { color: C.muted }, white: { color: '#FFF' },
  heroTitle: { fontSize: 29, lineHeight: 34, fontWeight: '800', color: C.ink, letterSpacing: -0.7, marginBottom: 20 },
  heroVisual: { height: 430, position: 'relative', overflow: 'hidden', borderRadius: 30 },
  motherHalo: { position: 'absolute', width: 270, height: 270, borderRadius: 140, backgroundColor: '#F5D8C7', right: -24, top: 20 },
  familyEmoji: { position: 'absolute', fontSize: 190, right: -23, top: 46, transform: [{ scaleX: -1 }] },
  feedTile: { position: 'absolute', left: 0, top: 95, width: 170, height: 130, borderRadius: 27, backgroundColor: C.purple, padding: 17, justifyContent: 'space-between' },
  tileTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, tileValue: { color: '#FFF', fontSize: 21, fontWeight: '700' }, roundWhite: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }, tileLabel: { color: '#E8BCF8', fontWeight: '600', fontSize: 15 },
  diaperTile: { position: 'absolute', left: 0, top: 240, width: 175, height: 125, borderRadius: 27, backgroundColor: C.card, padding: 17, justifyContent: 'space-between' }, diaperValue: { color: C.ink, fontWeight: '800', fontSize: 21 }, diaperLabel: { color: C.muted, fontWeight: '600' },
  activityTabs: { flexDirection: 'row', marginBottom: 30 }, activityTab: { flex: 1, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#DEDEDE' }, activityTabActive: { backgroundColor: C.card, borderRadius: 25 }, smallIconCircle: { width: 29, height: 29, borderRadius: 15, backgroundColor: '#ECECEC', alignItems: 'center', justifyContent: 'center' }, smallIconCircleActive: { backgroundColor: C.purpleSoft }, activityText: { color: C.muted, fontSize: 16 }, activityTextActive: { color: C.ink, fontWeight: '600' },
  sectionTitle: { fontSize: 21, lineHeight: 25, color: C.ink, fontWeight: '800', marginBottom: 18 }, typeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 }, typeCard: { flex: 1, height: 100, borderRadius: 15, backgroundColor: '#F4F4F4', alignItems: 'center', justifyContent: 'center', gap: 8 }, typeCardActive: { borderWidth: 1.5, borderColor: C.purple, backgroundColor: '#F4EDF7' }, typeIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }, typeLabel: { color: C.ink, fontSize: 16 },
  trendCard: { backgroundColor: C.card, borderRadius: 26, padding: 18 }, trendHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }, trendIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' }, trendTitle: { fontSize: 18, fontWeight: '800' }, statRow: { height: 72, borderRadius: 24, backgroundColor: '#F6F6F6', flexDirection: 'row', alignItems: 'center', marginBottom: 12 }, stat: { flex: 1, alignItems: 'center' }, statDivider: { height: 36, width: 1, backgroundColor: C.line }, statLabel: { fontSize: 12, color: C.ink }, statValue: { color: C.muted, marginTop: 3 },
  formRow: { flexDirection: 'row', gap: 10 },
  formField: { flex: 1 },
  inputLabel: { color: '#555', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  input: { height: 46, borderRadius: 14, backgroundColor: '#F4F4F4', paddingHorizontal: 14, color: C.ink, fontSize: 14, marginBottom: 12 },
  notesInput: { width: '100%' },
  buttonDisabled: { opacity: 0.55 },
  chart: { height: 115, position: 'relative', marginTop: 3 }, chartMax: { position: 'absolute', top: 0, color: C.ink }, dashLine: { position: 'absolute', top: 45, left: 32, right: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#333' }, chartMid: { position: 'absolute', top: 38, left: 0, color: C.purple, fontSize: 10 }, bars: { position: 'absolute', left: 44, right: 10, bottom: 0, height: 65, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }, bar: { width: 22, borderRadius: 8, backgroundColor: C.purple }, logButton: { height: 48, borderRadius: 24, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center', marginTop: 16 }, logButtonText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 18 }, chip: { backgroundColor: C.card, paddingVertical: 9, paddingHorizontal: 13, borderRadius: 18 }, chipText: { fontSize: 11, color: C.ink }, historyChart: { height: 190, backgroundColor: '#EDDDF5', borderRadius: 24, overflow: 'hidden', marginBottom: 25, justifyContent: 'flex-end' }, historyBars: { height: 150, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, historyBar: { width: 34, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: '#DDB8EE' }, historyBarActive: { backgroundColor: C.purple }, averageLine: { position: 'absolute', top: 48, left: 0, right: 0, borderTopWidth: 1, borderColor: C.purple, zIndex: 2 }, averageDot: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFF', borderWidth: 6, borderColor: C.purple, left: '48%', top: -10 }, averageText: { position: 'absolute', right: 8, top: -17, fontSize: 10 },
  eventCard: { minHeight: 72, borderRadius: 20, backgroundColor: C.card, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }, eventIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.purpleSoft, alignItems: 'center', justifyContent: 'center' }, eventBody: { marginLeft: 12, flex: 1 }, eventTitle: { fontSize: 15, fontWeight: '700' }, eventMeta: { fontSize: 10, color: C.muted, marginTop: 4 }, purpleText: { color: C.purpleDark },
  emptyCard: { padding: 24, borderRadius: 22, backgroundColor: C.card, alignItems: 'center' },
  emptyTitle: { color: C.ink, fontWeight: '800', fontSize: 16 },
  emptyCopy: { color: C.muted, fontSize: 12, marginTop: 5 },
  insightCard: { borderRadius: 28, padding: 22, backgroundColor: C.purple, marginBottom: 14 }, insightEyebrow: { color: '#F2D9FC', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, insightNumber: { color: '#FFF', fontSize: 72, fontWeight: '800', lineHeight: 80 }, insightUnit: { color: '#FFF', fontWeight: '700', fontSize: 16 }, insightCopy: { color: '#F5E4FC', fontSize: 14, lineHeight: 20, marginTop: 28 }, insightRow: { flexDirection: 'row', gap: 12 }, insightMini: { flex: 1, backgroundColor: C.card, borderRadius: 24, padding: 20 }, miniNumber: { fontSize: 26, fontWeight: '800', color: C.ink }, miniLabel: { fontSize: 12, color: C.muted, marginTop: 7 },
  recommendationCard: { marginTop: 14, borderRadius: 24, backgroundColor: C.card, padding: 20 },
  recommendationTitle: { color: C.ink, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  recommendationText: { color: '#555', fontSize: 12, lineHeight: 18, marginBottom: 7 },
  insightButton: { marginTop: 14 },
  navWrap: { position: 'absolute', left: 22, right: 22, bottom: 20, padding: 5, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.65)' }, nav: { height: 67, borderRadius: 32, backgroundColor: C.card, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 16, elevation: 8 }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' }, navIcon: { color: C.ink, fontSize: 23, fontWeight: '600', lineHeight: 25 }, navLabel: { color: C.ink, fontSize: 10, marginTop: 3, fontWeight: '600' },
});
