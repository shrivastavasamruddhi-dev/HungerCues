import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { C } from '../../../constants/colors';
import { ErrorBox } from '../../../components/ErrorBox';
import type { AIWeeklySummary } from '../../../types';

import { SkeletonCard } from '../../../components/SkeletonCard';

interface Props {
  weeklySummary: AIWeeklySummary | null;
  weeklyLoading: boolean;
  weeklyError: string | null;
  handleGenerateWeekly: () => void;
}

export function WeeklySummaryTab({
  weeklySummary,
  weeklyLoading,
  weeklyError,
  handleGenerateWeekly,
}: Props) {
  return (
    <View>
      {weeklyError && (
        <ErrorBox message={weeklyError} style={{ marginTop: 12, marginBottom: 12 }} />
      )}

      {weeklyLoading ? (
        <View style={{ gap: 12, marginBottom: 14 }}>
          <SkeletonCard />
          <SkeletonCard style={{ minHeight: 140 }} />
          <SkeletonCard style={{ minHeight: 100 }} />
        </View>
      ) : (
        <>
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
                <Text style={styles.weeklySectionTitle}>🍏 Feeding Analysis</Text>
                <Text style={styles.weeklySectionText}>{weeklySummary.feeding_insights}</Text>
              </View>
              <View style={styles.insightMini}>
                <Text style={styles.weeklySectionTitle}>☾ Sleep Analysis</Text>
                <Text style={styles.weeklySectionText}>{weeklySummary.sleep_insights}</Text>
              </View>
              <View style={styles.insightMini}>
                <Text style={styles.weeklySectionTitle}>⚖ Growth Analysis</Text>
                <Text style={styles.weeklySectionText}>{weeklySummary.growth_insights}</Text>
              </View>
            </View>
          )}

          {weeklySummary && (
            <View style={styles.recommendationCard}>
              <Text style={styles.weeklyRecommendationTitle}>Weekly Recommendations</Text>
              {weeklySummary.recommendations.map((item, index) => (
                <Text key={item} style={styles.weeklyRecommendationText}>
                  {index + 1}. {item}
                </Text>
              ))}
            </View>
          )}
        </>
      )}

      <TouchableOpacity
        disabled={weeklyLoading}
        style={[styles.logButton, styles.insightButton, weeklyLoading && styles.buttonDisabled]}
        onPress={handleGenerateWeekly}
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
  );
}

const styles = StyleSheet.create({
  insightCard: { borderRadius: 28, padding: 22, backgroundColor: C.purple, marginBottom: 14 },
  insightEyebrow: { color: '#F2D9FC', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  insightCopy: { color: '#F5E4FC', fontSize: 14, lineHeight: 20, marginTop: 28 },
  insightMini: { flex: 1, backgroundColor: C.card, borderRadius: 24, padding: 20 },
  weeklySectionTitle: { fontSize: 16, fontWeight: '800', color: C.purpleDark, marginBottom: 6 },
  weeklySectionText: { fontSize: 13, color: '#333', lineHeight: 18 },
  recommendationCard: { marginTop: 14, borderRadius: 24, backgroundColor: C.card, padding: 20 },
  weeklyRecommendationTitle: { color: C.ink, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  weeklyRecommendationText: { color: '#555', fontSize: 12, lineHeight: 18, marginBottom: 7 },
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
});
