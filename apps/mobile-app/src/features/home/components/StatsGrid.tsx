/**
 * StatsGrid — Home screen analytics layout.
 *
 * Layout:
 *  ┌──────────────┬──────────────┐
 *  │  Feed Stat   │  Sleep Stat  │  ← 2-col compact tiles
 *  └──────────────┴──────────────┘
 *  ┌──────────────────────────────┐
 *  │   Chart Panel (Feed|Sleep)   │  ← toggle tabs
 *  └──────────────────────────────┘
 *  ┌──────────────────────────────┐
 *  │         Diaper Card          │  ← full-width
 *  └──────────────────────────────┘
 */
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScalePress } from '../../../components/ScalePress';
import { Milk, Moon, Baby as BabyIcon, TrendingUp } from 'lucide-react-native';
import { C } from '../../../constants/colors';
import { FeedGraph } from '../../history/components/FeedGraph';
import { SleepGraph } from '../../history/components/SleepGraph';
import { DiaperSummary } from '../../history/components/DiaperSummary';
import type { SleepSession } from '../../../types';

interface Props {
  // Feed
  feedChartData: { bottleMl: number; breastMl: number; total: number }[];
  feedMax: number;
  DAY_LABELS: string[];
  todayFeedCount: number;
  todayFeedMl: number;
  // Sleep
  todaySleepSessions: SleepSession[];
  sleepChartData: { nightMins: number; napMins: number; totalMins: number }[];
  sleepMax: number;
  todaySleepMins: number;
  timeToPercent: (iso: string) => number;
  formatDuration: (mins: number) => string;
  formatTime12: (iso: string) => string;
  // Diaper
  diaperTodayData: {
    count: number;
    wet: number;
    poopyMixed: number;
    lastChange: string | null;
  };
  // Actions
  onQuickFeed: () => void;
  onQuickSleep: () => void;
  onQuickDiaper: () => void;
}

type ChartTab = 'feed' | 'sleep';

export function StatsGrid({
  feedChartData,
  feedMax,
  DAY_LABELS,
  todayFeedCount,
  todayFeedMl,
  todaySleepSessions,
  sleepChartData,
  sleepMax,
  todaySleepMins,
  timeToPercent,
  formatDuration,
  formatTime12,
  diaperTodayData,
  onQuickFeed,
  onQuickSleep,
  onQuickDiaper,
}: Props) {
  const [chart, setChart] = useState<ChartTab>('feed');

  return (
    <View>
      {/* ── Row 1: 2-col stat tiles ── */}
      <View style={styles.tileRow}>
        {/* Feed tile */}
        <ScalePress
          style={[styles.tile, styles.tileFeed]}
          onPress={onQuickFeed}
          accessibilityRole="button"
          accessibilityLabel="Log feeding — tap to add"
        >
          <View style={styles.tileIconWrap}>
            <Milk size={20} color="#F97316" />
          </View>
          <Text style={styles.tileLabel}>Feeding</Text>
          <Text style={[styles.tilePrimary, { color: '#C2410C' }]}>
            {todayFeedMl > 0 ? `${todayFeedMl} ml` : todayFeedCount > 0 ? `${todayFeedCount}×` : '—'}
          </Text>
          <Text style={styles.tileSub}>
            {todayFeedCount > 0
              ? `${todayFeedCount} feed${todayFeedCount !== 1 ? 's' : ''} today`
              : 'Tap to log'}
          </Text>
          <View style={[styles.tileChip, { backgroundColor: '#FFEDD5' }]}>
            <Text style={[styles.tileChipText, { color: '#C2410C' }]}>+ Log</Text>
          </View>
        </ScalePress>

        {/* Sleep tile */}
        <ScalePress
          style={[styles.tile, styles.tileSleep]}
          onPress={onQuickSleep}
          accessibilityRole="button"
          accessibilityLabel="Log sleep — tap to add"
        >
          <View style={styles.tileIconWrap}>
            <Moon size={20} color="#6366F1" />
          </View>
          <Text style={styles.tileLabel}>Sleep</Text>
          <Text style={[styles.tilePrimary, { color: '#4338CA' }]}>
            {todaySleepMins > 0 ? formatDuration(todaySleepMins) : '—'}
          </Text>
          <Text style={styles.tileSub}>
            {todaySleepSessions.length > 0
              ? `${todaySleepSessions.length} session${todaySleepSessions.length !== 1 ? 's' : ''}`
              : 'Tap to log'}
          </Text>
          <View style={[styles.tileChip, { backgroundColor: '#E0E7FF' }]}>
            <Text style={[styles.tileChipText, { color: '#4338CA' }]}>+ Log</Text>
          </View>
        </ScalePress>
      </View>

      {/* ── Row 2: Chart panel with tab toggle ── */}
      <View style={styles.chartCard}>
        {/* Toggle tabs */}
        <View style={styles.chartTabRow}>
          <View style={styles.chartTabPill}>
            <TouchableOpacity
              style={[styles.chartTab, chart === 'feed' && styles.chartTabActive]}
              onPress={() => setChart('feed')}
              accessibilityRole="tab"
              accessibilityState={{ selected: chart === 'feed' }}
            >
              <Milk size={14} color={chart === 'feed' ? '#F97316' : C.muted} />
              <Text style={[styles.chartTabText, chart === 'feed' && styles.chartTabTextActive]}>
                Feed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chartTab, chart === 'sleep' && styles.chartTabActive]}
              onPress={() => setChart('sleep')}
              accessibilityRole="tab"
              accessibilityState={{ selected: chart === 'sleep' }}
            >
              <Moon size={14} color={chart === 'sleep' ? '#6366F1' : C.muted} />
              <Text style={[styles.chartTabText, chart === 'sleep' && styles.chartTabTextActive]}>
                Sleep
              </Text>
            </TouchableOpacity>
          </View>
          <TrendingUp size={16} color={C.muted} />
        </View>

        {chart === 'feed' ? (
          <FeedGraph
            feedChartData={feedChartData}
            feedMax={feedMax}
            DAY_LABELS={DAY_LABELS}
          />
        ) : (
          <SleepGraph
            todaySleepSessions={todaySleepSessions}
            sleepChartData={sleepChartData}
            sleepMax={sleepMax}
            DAY_LABELS={DAY_LABELS}
            timeToPercent={timeToPercent}
            formatDuration={formatDuration}
            formatTime12={formatTime12}
          />
        )}
      </View>

      {/* ── Row 3: Diaper card ── */}
      <ScalePress
        style={styles.diaperCard}
        onPress={onQuickDiaper}
        accessibilityRole="button"
        accessibilityLabel="Diaper tracking"
      >
        <View style={styles.diaperHeader}>
          <View style={styles.diaperLeft}>
            <View style={[styles.tileIconWrap, { backgroundColor: '#CFFAFE' }]}>
              <BabyIcon size={20} color="#22D3EE" />
            </View>
            <View>
              <Text style={styles.diaperTitle}>Diaper</Text>
              <Text style={styles.diaperSub}>
                {diaperTodayData.count > 0
                  ? `${diaperTodayData.count} change${diaperTodayData.count !== 1 ? 's' : ''} today`
                  : 'No changes logged yet'}
              </Text>
            </View>
          </View>
          <View style={styles.diaperLogBtn}>
            <Text style={styles.diaperLogText}>+ Log</Text>
          </View>
        </View>
        <DiaperSummary
          diaperTodayData={diaperTodayData}
          formatTime12={formatTime12}
        />
      </ScalePress>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Tile row ──
  tileRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  tile: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    minHeight: 148,
  },
  tileFeed: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  tileSleep: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  tileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  tilePrimary: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  tileSub: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '600',
    marginBottom: 10,
    flexShrink: 1,
  },
  tileChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  tileChipText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // ── Chart panel ──
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ECECEC',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  chartTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  chartTabPill: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  chartTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  chartTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.muted,
  },
  chartTabTextActive: {
    color: C.ink,
    fontWeight: '800',
  },

  // ── Diaper card ──
  diaperCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#CFFAFE',
    shadowColor: '#22D3EE',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  diaperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  diaperLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  diaperTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.ink,
  },
  diaperSub: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '600',
    marginTop: 1,
  },
  diaperLogBtn: {
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#CFFAFE',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaperLogText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0E7490',
  },
});
