import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { C } from '../../constants/colors';
import { Header } from '../../components/Header';
import { api } from '../../api';
import type { Baby, Feeding, SleepSession, AIInsight, AIWeeklySummary } from '../../types';

interface Props {
  baby: Baby | null;
  insight: AIInsight | null;
  loading: boolean;
  feedings: Feeding[];
  sleep: SleepSession[];
  onGenerate: () => Promise<void>;
}

export function InsightsScreen({ baby, insight, loading, feedings, sleep, onGenerate }: Props) {
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
                placeholder="e.g. Charlie sleeping enough?"
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
    backgroundColor: '#DEDEDE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  segmentActive: { backgroundColor: C.purple },
  segmentText: { color: C.muted, fontSize: 15 },
  white: { color: '#FFF' },
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
  logButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  logButtonText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  buttonDisabled: { opacity: 0.55 },
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
});
