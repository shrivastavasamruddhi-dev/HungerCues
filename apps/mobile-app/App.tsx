import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

type Tab = 'home' | 'log' | 'history' | 'insights';
type Activity = 'feed' | 'sleep' | 'diaper';
type FeedType = 'Breast' | 'Bottle' | 'Solid';

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

const initialEvents = [
  { id: 1, icon: '♢', title: 'Diaper Change', time: '6:15 PM', note: 'Big mess, needed extra wipes' },
  { id: 2, icon: '☾', title: 'Night Sleep', time: '8:40 PM', note: '1 hr 20 min' },
  { id: 3, icon: '♙', title: 'Bottle Feed', time: '4:20 PM', note: '120 ml · 15 min' },
];

export default function App() {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('home');
  const [filter, setFilter] = useState<'all' | Activity>('all');
  const [activity, setActivity] = useState<Activity>('feed');
  const [feedType, setFeedType] = useState<FeedType>('Breast');
  const [events, setEvents] = useState(initialEvents);
  const compact = width < 430;

  const logActivity = () => {
    const meta = activityMeta[activity];
    const detail = activity === 'feed'
      ? `${feedType === 'Bottle' ? '120 ml · ' : ''}15 min`
      : activity === 'sleep' ? '1 hr 10 min' : 'Changed · all clean';
    setEvents((current) => [
      { id: Date.now(), icon: meta.icon, title: activity === 'feed' ? `${feedType} Feed` : meta.label, time: 'Just now', note: detail },
      ...current,
    ]);
    setTab('history');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.canvas} />
      <View style={[styles.shell, !compact && styles.desktopShell]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {tab === 'home' && <HomeScreen filter={filter} setFilter={setFilter} onQuickLog={() => setTab('log')} />}
          {tab === 'log' && (
            <LogScreen
              activity={activity}
              setActivity={setActivity}
              feedType={feedType}
              setFeedType={setFeedType}
              onLog={logActivity}
            />
          )}
          {tab === 'history' && <HistoryScreen events={events} />}
          {tab === 'insights' && <InsightsScreen />}
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

function HomeScreen({ filter, setFilter, onQuickLog }: { filter: 'all' | Activity; setFilter: (value: 'all' | Activity) => void; onQuickLog: () => void }) {
  return (
    <View>
      <Header title="BabyTracker" action="♧" />
      <SegmentedControl active={filter} onChange={setFilter} />
      <Text style={styles.heroTitle}>Your Every Step{`\n`}In Parenting{`\n`}Matters</Text>
      <View style={styles.heroVisual}>
        <View style={styles.motherHalo} />
        <Text style={styles.familyEmoji}>👩‍🍼</Text>
        <TouchableOpacity style={styles.feedTile} onPress={onQuickLog}>
          <View style={styles.tileTopRow}>
            <Text style={styles.tileValue}>120ml</Text>
            <View style={styles.roundWhite}><Text>♙</Text></View>
          </View>
          <Text style={styles.tileLabel}>Bottle Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.diaperTile} onPress={onQuickLog}>
          <Text style={styles.diaperValue}>1kg</Text>
          <Text style={styles.diaperLabel}>Diaper</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function LogScreen({ activity, setActivity, feedType, setFeedType, onLog }: {
  activity: Activity;
  setActivity: (value: Activity) => void;
  feedType: FeedType;
  setFeedType: (value: FeedType) => void;
  onLog: () => void;
}) {
  const values = activity === 'feed' ? { amount: '120', duration: '15' } : activity === 'sleep' ? { amount: '70', duration: '60' } : { amount: '1', duration: '5' };
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
        {(activity === 'feed' ? ['Breast', 'Bottle', 'Solid'] : activity === 'sleep' ? ['Nap', 'Night', 'Rest'] : ['Wet', 'Mixed', 'Dry']).map((type, index) => (
          <TouchableOpacity key={type} onPress={() => activity === 'feed' && setFeedType(type as FeedType)} style={[styles.typeCard, (activity !== 'feed' ? index === 0 : feedType === type) && styles.typeCardActive]}>
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
        <View style={styles.statRow}>
          <View style={styles.stat}><Text style={styles.statLabel}>Amount {activity === 'feed' ? '(ml)' : ''}</Text><Text style={styles.statValue}>{values.amount}</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statLabel}>Duration (min)</Text><Text style={styles.statValue}>{values.duration}</Text></View>
        </View>
        <MiniChart />
        <TouchableOpacity style={styles.logButton} onPress={onLog}><Text style={styles.logButtonText}>Log {activityMeta[activity].label}</Text></TouchableOpacity>
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

function HistoryScreen({ events }: { events: typeof initialEvents }) {
  const today = useMemo(() => events.slice(0, 3), [events]);
  return (
    <View>
      <Header title="History" action="▽" />
      <Text style={styles.sectionTitle}>Today Timeline</Text>
      <View style={styles.chips}>
        {['Bottle Feed   10%', 'Nap   70%', 'Diaper Change   50%', 'Breastfeed   85%'].map((chip) => <View key={chip} style={styles.chip}><Text style={styles.chipText}>{chip}</Text></View>)}
      </View>
      <View style={styles.historyChart}>
        <View style={styles.averageLine}><View style={styles.averageDot} /><Text style={styles.averageText}>1 Day Avg.</Text></View>
        <View style={styles.historyBars}>{[52, 86, 130, 60, 100, 72].map((h, i) => <View key={i} style={[styles.historyBar, { height: h }, i === 2 && styles.historyBarActive]} />)}</View>
      </View>
      <Text style={styles.sectionTitle}>Yesterday Timeline</Text>
      {today.map((event) => (
        <View key={event.id} style={styles.eventCard}>
          <View style={styles.eventIcon}><Text style={styles.purpleText}>{event.icon}</Text></View>
          <View style={styles.eventBody}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventMeta}>{event.time}      {event.note}</Text></View>
        </View>
      ))}
    </View>
  );
}

function InsightsScreen() {
  return (
    <View>
      <Header title="Insights" action="✦" />
      <Text style={styles.heroTitle}>Small patterns.{`\n`}Meaningful progress.</Text>
      <View style={styles.insightCard}><Text style={styles.insightEyebrow}>THIS WEEK</Text><Text style={styles.insightNumber}>7.4</Text><Text style={styles.insightUnit}>average feeds per day</Text><Text style={styles.insightCopy}>Feeding times are becoming more consistent, especially during the afternoon.</Text></View>
      <View style={styles.insightRow}><View style={styles.insightMini}><Text style={styles.miniNumber}>+12%</Text><Text style={styles.miniLabel}>Sleep duration</Text></View><View style={styles.insightMini}><Text style={styles.miniNumber}>120ml</Text><Text style={styles.miniLabel}>Average bottle</Text></View></View>
    </View>
  );
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
  chart: { height: 115, position: 'relative', marginTop: 3 }, chartMax: { position: 'absolute', top: 0, color: C.ink }, dashLine: { position: 'absolute', top: 45, left: 32, right: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#333' }, chartMid: { position: 'absolute', top: 38, left: 0, color: C.purple, fontSize: 10 }, bars: { position: 'absolute', left: 44, right: 10, bottom: 0, height: 65, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }, bar: { width: 22, borderRadius: 8, backgroundColor: C.purple }, logButton: { height: 48, borderRadius: 24, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center', marginTop: 16 }, logButtonText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 18 }, chip: { backgroundColor: C.card, paddingVertical: 9, paddingHorizontal: 13, borderRadius: 18 }, chipText: { fontSize: 11, color: C.ink }, historyChart: { height: 190, backgroundColor: '#EDDDF5', borderRadius: 24, overflow: 'hidden', marginBottom: 25, justifyContent: 'flex-end' }, historyBars: { height: 150, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, historyBar: { width: 34, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: '#DDB8EE' }, historyBarActive: { backgroundColor: C.purple }, averageLine: { position: 'absolute', top: 48, left: 0, right: 0, borderTopWidth: 1, borderColor: C.purple, zIndex: 2 }, averageDot: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFF', borderWidth: 6, borderColor: C.purple, left: '48%', top: -10 }, averageText: { position: 'absolute', right: 8, top: -17, fontSize: 10 },
  eventCard: { minHeight: 72, borderRadius: 20, backgroundColor: C.card, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }, eventIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.purpleSoft, alignItems: 'center', justifyContent: 'center' }, eventBody: { marginLeft: 12, flex: 1 }, eventTitle: { fontSize: 15, fontWeight: '700' }, eventMeta: { fontSize: 10, color: C.muted, marginTop: 4 }, purpleText: { color: C.purpleDark },
  insightCard: { borderRadius: 28, padding: 22, backgroundColor: C.purple, marginBottom: 14 }, insightEyebrow: { color: '#F2D9FC', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, insightNumber: { color: '#FFF', fontSize: 72, fontWeight: '800', lineHeight: 80 }, insightUnit: { color: '#FFF', fontWeight: '700', fontSize: 16 }, insightCopy: { color: '#F5E4FC', fontSize: 14, lineHeight: 20, marginTop: 28 }, insightRow: { flexDirection: 'row', gap: 12 }, insightMini: { flex: 1, backgroundColor: C.card, borderRadius: 24, padding: 20 }, miniNumber: { fontSize: 26, fontWeight: '800', color: C.ink }, miniLabel: { fontSize: 12, color: C.muted, marginTop: 7 },
  navWrap: { position: 'absolute', left: 22, right: 22, bottom: 20, padding: 5, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.65)' }, nav: { height: 67, borderRadius: 32, backgroundColor: C.card, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 16, elevation: 8 }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' }, navIcon: { color: C.ink, fontSize: 23, fontWeight: '600', lineHeight: 25 }, navLabel: { color: C.ink, fontSize: 10, marginTop: 3, fontWeight: '600' },
});
