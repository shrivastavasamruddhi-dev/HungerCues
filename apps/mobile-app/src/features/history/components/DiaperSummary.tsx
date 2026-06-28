import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  diaperTodayData: {
    count: number;
    wet: number;
    poopyMixed: number;
    lastChange: string | null;
  };
  formatTime12: (iso: string) => string;
}

export function DiaperSummary({ diaperTodayData, formatTime12 }: Props) {
  return (
    <View
      style={[
        styles.historyChart,
        { minHeight: 180, backgroundColor: '#F0FDF4', padding: 16, paddingBottom: 16 },
      ]}
    >
      <Text style={{ fontSize: 13, fontWeight: '800', color: '#14532D', marginBottom: 14 }}>
        🧷 Diapers — Today
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        {/* Total count */}
        <View style={styles.diaperTotalCard}>
          <Text style={{ fontSize: 36, fontWeight: '900', color: '#16A34A' }}>
            {diaperTodayData.count}
          </Text>
          <Text style={{ fontSize: 12, color: '#166534', fontWeight: '700' }}>Total</Text>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          {/* Wet */}
          <View style={styles.diaperSubCardWet}>
            <Text style={{ fontSize: 18 }}>💧</Text>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1D4ED8' }}>
                {diaperTodayData.wet}
              </Text>
              <Text style={{ fontSize: 10, color: '#1E40AF' }}>Wet</Text>
            </View>
          </View>
          {/* Poopy / Mixed */}
          <View style={styles.diaperSubCardDirty}>
            <Text style={{ fontSize: 18 }}>💛</Text>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#92400E' }}>
                {diaperTodayData.poopyMixed}
              </Text>
              <Text style={{ fontSize: 10, color: '#78350F' }}>Poopy/mixed</Text>
            </View>
          </View>
        </View>
      </View>
      {/* Last change */}
      <View style={styles.diaperLastChangeBanner}>
        <Text style={{ fontSize: 20 }}>🕐</Text>
        <View>
          <Text style={{ fontSize: 11, color: '#166534', fontWeight: '600' }}>Last Change</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#14532D' }}>
            {diaperTodayData.lastChange
              ? formatTime12(diaperTodayData.lastChange)
              : 'No changes today'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  historyChart: {
    borderRadius: 24,
    marginBottom: 25,
  },
  diaperTotalCard: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  diaperSubCardWet: {
    flex: 1,
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  diaperSubCardDirty: {
    flex: 1,
    backgroundColor: '#FEF9C3',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  diaperLastChangeBanner: {
    backgroundColor: '#BBF7D0',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
