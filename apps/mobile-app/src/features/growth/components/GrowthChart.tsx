import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { C } from '../../../constants/colors';
import { EmptyState } from '../../../components/EmptyState';
import type { GrowthRecord } from '../../../types';

interface Props {
  sorted: GrowthRecord[];
  unitSystem: 'metric' | 'imperial';
  displayWeight: (kg: number | null | undefined) => string;
  displayHeight: (cm: number | null | undefined) => string;
}

export function GrowthChart({ sorted, unitSystem, displayWeight, displayHeight }: Props) {
  const [chartMetric, setChartMetric] = useState<'weight' | 'height'>('weight');

  const chartData = (() => {
    const relevant = sorted.filter((r) =>
      chartMetric === 'weight' ? r.weight_kg != null : r.height_cm != null,
    );
    return relevant.slice(-8);
  })();

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

  return (
    <View style={styles.chartContainer}>
      {/* Toggle weight/height chart */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {(['weight', 'height'] as const).map((metric) => (
          <TouchableOpacity
            key={metric}
            onPress={() => setChartMetric(metric)}
            style={[styles.chartToggleBtn, chartMetric === metric && styles.chartToggleBtnActive]}
          >
            <Text
              style={[
                styles.chartToggleText,
                chartMetric === metric && styles.chartToggleTextActive,
              ]}
            >
              {metric === 'weight' ? `⚖ Weight` : `↕ Height`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {chartData.length === 0 ? (
        <EmptyState
          icon="📏"
          title=""
          description={`No ${chartMetric} data yet.\nLog your first entry below.`}
          style={{ borderRadius: 0, backgroundColor: 'transparent', paddingVertical: 30 }}
        />
      ) : (
        <View>
          {/* Y-axis max */}
          <Text style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>
            {chartMetric === 'weight' ? displayWeight(maxVal) : displayHeight(maxVal)}
          </Text>
          {/* Bars */}
          <View style={styles.barsContainer}>
            {chartData.map((r, i) => {
              const val = chartMetric === 'weight' ? (r.weight_kg ?? 0) : (r.height_cm ?? 0);
              const barH = Math.max(4, ((val - minVal) / range) * BAR_HEIGHT);
              const isLatest = i === chartData.length - 1;
              return (
                <View key={r.id} style={{ flex: 1, alignItems: 'center' }}>
                  {isLatest && (
                    <Text style={styles.latestBarVal}>
                      {chartMetric === 'weight' ? displayWeight(val) : displayHeight(val)}
                    </Text>
                  )}
                  <View style={[styles.bar, { height: barH }, isLatest && styles.barLatest]} />
                </View>
              );
            })}
          </View>
          {/* X-axis labels */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {chartData.map((r) => (
              <Text key={r.id} style={styles.chartLabel}>
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
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: C.card,
    borderRadius: 26,
    padding: 18,
    marginBottom: 20,
  },
  chartToggleBtn: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDEDEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartToggleBtnActive: { backgroundColor: C.purple },
  chartToggleText: { color: C.muted, fontSize: 13, fontWeight: '700' },
  chartToggleTextActive: { color: '#FFF' },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 6,
    marginBottom: 6,
  },
  latestBarVal: {
    fontSize: 9,
    fontWeight: '700',
    color: C.purpleDark,
    marginBottom: 2,
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: '#DDB8EE',
  },
  barLatest: { backgroundColor: C.purple },
  chartLabel: {
    flex: 1,
    fontSize: 9,
    color: C.muted,
    textAlign: 'center',
  },
});
