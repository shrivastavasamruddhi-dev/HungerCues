import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '../../../constants/colors';

interface Props {
  feedChartData: { bottleMl: number; breastMl: number; total: number }[];
  feedMax: number;
  DAY_LABELS: string[];
}

export function FeedGraph({ feedChartData, feedMax, DAY_LABELS }: Props) {
  return (
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
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#C45BF2' }} />
          <Text style={{ fontSize: 10, color: C.muted }}>Bottle</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#F9A8D4' }} />
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
  );
}

const styles = StyleSheet.create({
  historyChart: {
    borderRadius: 24,
    marginBottom: 25,
  },
});
