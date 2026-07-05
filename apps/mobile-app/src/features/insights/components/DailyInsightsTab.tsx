import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { C } from '../../../constants/colors';
import { StatCard } from '../../../components/StatCard';
import { ErrorBox } from '../../../components/ErrorBox';
import { aiService } from '../../../services/aiService';
import type { Baby, Feeding, AIInsight } from '../../../types';

interface Props {
  baby: Baby | null;
  insight: AIInsight | null;
  loading: boolean;
  feedings: Feeding[];
  averageSleep: number;
  averageBottle: number;
  onGenerate: () => Promise<void>;
  // Persisted state props
  aiQuestion: string;
  setAiQuestion: (val: string) => void;
  aiAnswer: string | null;
  setAiAnswer: (val: string | null) => void;
}

export function DailyInsightsTab({
  baby,
  insight,
  loading,
  feedings,
  averageSleep,
  averageBottle,
  onGenerate,
  aiQuestion,
  setAiQuestion,
  aiAnswer,
  setAiAnswer,
}: Props) {
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const submitQuestion = async () => {
    if (!baby || !aiQuestion.trim() || askLoading) return;
    setAskLoading(true);
    setAskError(null);
    setAiAnswer(null);
    try {
      const result = await aiService.askQuestion(baby.id, aiQuestion.trim());
      setAiAnswer(result.answer);
    } catch {
      setAskError('Could not reach the AI assistant. Check the backend connection and try again.');
    } finally {
      setAskLoading(false);
    }
  };

  return (
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
        <StatCard label="Average sleep" value={averageSleep > 0 ? `${averageSleep}m` : '—'} reverseLayout />
        <StatCard label="Average bottle" value={averageBottle > 0 ? `${averageBottle}ml` : '—'} reverseLayout />
      </View>
      {insight && (
        <View style={styles.recommendationCard}>
          <Text style={styles.recommendationTitle}>Recommended next steps</Text>
          {insight.recommendations.map((item, index) => (
            <Text key={item} style={styles.recommendationText}>
              {index + 1}. {item}
            </Text>
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
          Ask any parenting question — Gemini will answer using {baby?.name ?? 'your baby'}'s logs.
        </Text>
        <View style={styles.askInputContainer}>
          <TextInput
            accessibilityLabel="Parenting question input"
            value={aiQuestion}
            onChangeText={setAiQuestion}
            placeholder="e.g. Charlie sleeping enough?"
            placeholderTextColor="#A9A9A9"
            style={styles.askInput}
            editable={!askLoading}
          />
          <TouchableOpacity
            accessibilityLabel="Submit question"
            disabled={askLoading || !aiQuestion.trim()}
            onPress={() => void submitQuestion()}
            style={[
              styles.askSubmitButton,
              { width: 46, opacity: askLoading || !aiQuestion.trim() ? 0.5 : 1 },
            ]}
          >
            {askLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.askSubmitButtonText}>→</Text>
            )}
          </TouchableOpacity>
        </View>
        {askError && <ErrorBox message={askError} style={{ marginTop: 12 }} />}
        {aiAnswer && (
          <View style={styles.answerBox}>
            <View style={styles.answerHeaderRow}>
              <Text style={styles.answerTitle}>AI Response</Text>
              <TouchableOpacity
                accessibilityLabel="Clear answer"
                onPress={() => {
                  setAiAnswer(null);
                  setAiQuestion('');
                }}
              >
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.answerContentText, { marginTop: 10 }]}>{aiAnswer}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  insightCard: { borderRadius: 28, padding: 22, backgroundColor: C.purple, marginBottom: 14 },
  insightEyebrow: { color: '#F2D9FC', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  insightNumber: { color: '#FFF', fontSize: 72, fontWeight: '800', lineHeight: 80 },
  insightUnit: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  insightCopy: { color: '#F5E4FC', fontSize: 14, lineHeight: 20, marginTop: 28 },
  insightRow: { flexDirection: 'row', gap: 12 },
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
  askSectionCard: {
    marginTop: 20,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  askTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.ink,
    marginBottom: 6,
  },
  askSubtitle: {
    fontSize: 11,
    color: C.muted,
    lineHeight: 16,
    marginBottom: 16,
    fontWeight: '600',
  },
  askInputContainer: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F4F4F4',
    paddingLeft: 14,
    alignItems: 'center',
    overflow: 'hidden',
  },
  askInput: {
    flex: 1,
    fontSize: 14,
    color: C.ink,
    height: '100%',
  },
  askSubmitButton: {
    height: 48,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askSubmitButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  answerBox: {
    backgroundColor: '#F7EEFC',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E6C6F5',
  },
  answerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  answerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: C.purpleDark,
    letterSpacing: 0.8,
  },
  clearText: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '700',
  },
  answerContentText: {
    fontSize: 13,
    color: C.ink,
    lineHeight: 18,
  },
});
