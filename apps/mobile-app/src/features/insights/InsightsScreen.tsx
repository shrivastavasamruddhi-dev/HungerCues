import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../../constants/colors';
import { Header } from '../../components/Header';
import { aiService } from '../../services/aiService';
import { DailyInsightsTab } from './components/DailyInsightsTab';
import { WeeklySummaryTab } from './components/WeeklySummaryTab';
import type { Baby, Feeding, SleepSession, AIInsight, AIWeeklySummary } from '../../types';

interface Props {
  baby: Baby | null;
  insight: AIInsight | null;
  loading: boolean;
  feedings: Feeding[];
  sleep: SleepSession[];
  onGenerate: () => Promise<void>;
  // AI assistant states
  aiQuestion: string;
  setAiQuestion: (val: string) => void;
  aiAnswer: string | null;
  setAiAnswer: (val: string | null) => void;
}

export function InsightsScreen({
  baby,
  insight,
  loading,
  feedings,
  sleep,
  onGenerate,
  aiQuestion,
  setAiQuestion,
  aiAnswer,
  setAiAnswer,
}: Props) {
  const [insightsTab, setInsightsTab] = useState<'daily' | 'weekly'>('daily');
  const [weeklySummary, setWeeklySummary] = useState<AIWeeklySummary | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);

  // Auto-generate daily AI insights if none exist on screen visit
  useEffect(() => {
    if (!insight && !loading && (feedings.length > 0 || sleep.length > 0)) {
      void onGenerate();
    }
  }, [insight, loading, feedings, sleep, onGenerate]);

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
      const data = await aiService.getWeeklySummary(baby.id);
      setWeeklySummary(data);
    } catch {
      setWeeklyError('Could not generate weekly summary. Check backend connection.');
    } finally {
      setWeeklyLoading(false);
    }
  };

  return (
    <View style={{ paddingBottom: 40 }}>
      <Header title="Insights" action="▥" />
      <Text style={styles.heroTitle}>Small patterns.{'\n'}Meaningful progress.</Text>

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

      {insightsTab === 'daily' ? (
        <DailyInsightsTab
          baby={baby}
          insight={insight}
          loading={loading}
          feedings={feedings}
          averageSleep={averageSleep}
          averageBottle={averageBottle}
          onGenerate={onGenerate}
          aiQuestion={aiQuestion}
          setAiQuestion={setAiQuestion}
          aiAnswer={aiAnswer}
          setAiAnswer={setAiAnswer}
        />
      ) : (
        <WeeklySummaryTab
          weeklySummary={weeklySummary}
          weeklyLoading={weeklyLoading}
          weeklyError={weeklyError}
          handleGenerateWeekly={handleGenerateWeekly}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heroTitle: {
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.7,
    marginBottom: 20,
  },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  segment: {
    minWidth: 82,
    height: 50,
    paddingHorizontal: 17,
    borderRadius: 26,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  segmentActive: { backgroundColor: C.purple, borderColor: C.purple },
  segmentText: { color: '#7C3AED', fontSize: 15 },
  white: { color: '#FFF' },
});
