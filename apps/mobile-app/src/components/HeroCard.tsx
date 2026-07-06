import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Menu, Milk, Moon, Baby as BabyIcon, Clock } from 'lucide-react-native';
import { C } from '../constants/colors';
import { ScalePress } from './ScalePress';
import type { Baby, Feeding, SleepSession, Activity } from '../types';

interface Props {
  baby: Baby | null;
  feedings: Feeding[];
  sleep: SleepSession[];
  onOpenSidebar: () => void;
  onQuickLog: (kind: Activity) => void;
}

function getBabyAge(birthDateString: string): string {
  try {
    const diffDays = Math.ceil(
      Math.abs(Date.now() - new Date(birthDateString).getTime()) / 86_400_000
    );
    if (diffDays < 7) return `${diffDays}d old`;
    const weeks = Math.floor(diffDays / 7);
    if (weeks < 8) return `${weeks}w old`;
    const months = Math.floor(diffDays / 30.44);
    if (months < 12) return `${months}mo old`;
    const years = Math.floor(diffDays / 365);
    const remMonths = Math.floor((diffDays - years * 365) / 30.44);
    return remMonths > 0 ? `${years}y ${remMonths}mo` : `${years}y old`;
  } catch {
    return '—';
  }
}

function getAvatarEmoji(gender: string) {
  const g = gender.toLowerCase();
  if (g === 'boy' || g === 'male') return '👶';
  if (g === 'girl' || g === 'female') return '🎀';
  return '🧸';
}

function timeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function todaySleepMinutes(sessions: SleepSession[]): number {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return sessions
    .filter((s) => new Date(s.sleep_start) >= startOfDay)
    .reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0);
}

function formatSleepHours(mins: number): string {
  if (mins === 0) return 'No sleep logged';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m today` : `${m}m today`;
}

export function HeroCard({ baby, feedings, sleep, onOpenSidebar, onQuickLog }: Props) {
  // Last feeding — most recent first
  const lastFeed = feedings.length > 0
    ? feedings.reduce((a, b) =>
        new Date(a.start_time) > new Date(b.start_time) ? a : b
      )
    : null;

  const sleepMins = todaySleepMinutes(sleep);

  if (!baby) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>Loading baby profile…</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* ── Top row: avatar + info + menu ── */}
      <View style={styles.topRow}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarEmoji}>{getAvatarEmoji(baby.gender)}</Text>
        </View>

        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {baby.name}
          </Text>
          <Text style={styles.age}>{getBabyAge(baby.birth_date)}</Text>
        </View>

        <ScalePress
          style={styles.menuBtn}
          onPress={onOpenSidebar}
          accessibilityLabel="Open profile menu"
          accessibilityRole="button"
        >
          <Menu size={20} color={C.purpleDark} />
        </ScalePress>
      </View>

      {/* ── Status pills ── */}
      <View style={styles.pills}>
        <View style={[styles.pill, styles.pillFeed]}>
          <Clock size={13} color="#F97316" style={{ marginRight: 5 }} />
          <Text style={[styles.pillText, { color: '#C2410C' }]}>
            {lastFeed ? `Fed ${timeAgo(lastFeed.start_time)}` : 'No feeds yet'}
          </Text>
        </View>
        <View style={[styles.pill, styles.pillSleep]}>
          <Moon size={13} color="#6366F1" style={{ marginRight: 5 }} />
          <Text style={[styles.pillText, { color: '#4338CA' }]}>
            {formatSleepHours(sleepMins)}
          </Text>
        </View>
      </View>

      {/* ── Quick log row ── */}
      <View style={styles.quickRow}>
        <ScalePress
          style={[styles.chip, styles.chipFeed]}
          onPress={() => onQuickLog('feed')}
          accessibilityRole="button"
          accessibilityLabel="Log feeding"
        >
          <Milk size={16} color="#F97316" />
          <Text style={[styles.chipLabel, { color: '#C2410C' }]}>Feed</Text>
        </ScalePress>

        <ScalePress
          style={[styles.chip, styles.chipSleep]}
          onPress={() => onQuickLog('sleep')}
          accessibilityRole="button"
          accessibilityLabel="Log sleep"
        >
          <Moon size={16} color="#6366F1" />
          <Text style={[styles.chipLabel, { color: '#4338CA' }]}>Sleep</Text>
        </ScalePress>

        <ScalePress
          style={[styles.chip, styles.chipDiaper]}
          onPress={() => onQuickLog('diaper')}
          accessibilityRole="button"
          accessibilityLabel="Log diaper"
        >
          <BabyIcon size={16} color="#22D3EE" />
          <Text style={[styles.chipLabel, { color: '#0E7490' }]}>Diaper</Text>
        </ScalePress>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#6366F1',
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EDEAFF',
  },
  emptyText: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    paddingVertical: 10,
  },
  // top row
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarEmoji: { fontSize: 26 },
  nameBlock: { flex: 1 },
  name: {
    fontSize: 19,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.3,
  },
  age: { fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 2 },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // pills
  pills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  pillFeed: { backgroundColor: '#FFF7ED' },
  pillSleep: { backgroundColor: '#EEF2FF' },
  pillText: { fontSize: 12, fontWeight: '700' },
  // quick chips
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
  },
  chipFeed: { backgroundColor: '#FFF7ED' },
  chipSleep: { backgroundColor: '#EEF2FF' },
  chipDiaper: { backgroundColor: '#ECFEFF' },
  chipLabel: { fontSize: 13, fontWeight: '800' },
});
