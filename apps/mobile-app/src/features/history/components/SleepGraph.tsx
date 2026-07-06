import React, { useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { C } from '../../../constants/colors';
import type { SleepSession } from '../../../types';

interface Props {
  todaySleepSessions: SleepSession[];
  sleepChartData: { nightMins: number; napMins: number; totalMins: number }[];
  sleepMax: number;
  DAY_LABELS: string[];
  timeToPercent: (iso: string) => number;
  formatDuration: (mins: number) => string;
  formatTime12: (iso: string) => string;
}

export function SleepGraph({
  todaySleepSessions,
  sleepChartData,
  sleepMax,
  DAY_LABELS,
  timeToPercent,
  formatDuration,
  formatTime12,
}: Props) {
  const [sleepView, setSleepView] = useState<0 | 1>(0);
  const sleepSwipeX = useRef(new Animated.Value(0)).current;

  const sleepPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dy) < 20,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) {
          setSleepView(1);
        } else if (g.dx > 40) {
          setSleepView(0);
        }
        Animated.spring(sleepSwipeX, { toValue: 0, useNativeDriver: Platform.OS !== 'web', friction: 8 }).start();
      },
      onPanResponderMove: (_, g) => sleepSwipeX.setValue(g.dx),
    }),
  ).current;

  return (
    <View
      style={[
        styles.historyChart,
        { minHeight: 220, backgroundColor: '#EEF2FF', padding: 14, paddingBottom: 12 },
      ]}
    >
      {/* Swipe hint dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
        {[0, 1].map((idx) => (
          <TouchableOpacity key={idx} onPress={() => setSleepView(idx as 0 | 1)}>
            <View
              style={{
                width: sleepView === idx ? 18 : 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: sleepView === idx ? '#6366F1' : '#C7D2FE',
              }}
            />
          </TouchableOpacity>
        ))}
      </View>

      <Animated.View
        style={{ transform: [{ translateX: sleepSwipeX }] }}
        {...sleepPanResponder.panHandlers}
      >
        {sleepView === 0 ? (
          /* ── TODAY'S TIMELINE ── */
          <View>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#3730A3', marginBottom: 8 }}>
              😴 Today's Sleep Timeline
            </Text>
            {/* Time axis labels */}
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}
            >
              {['12 AM', '6 AM', '12 PM', '6 PM', '12 AM'].map((lbl, idx) => (
                <Text key={idx} style={{ fontSize: 9, color: '#9CA3AF' }}>
                  {lbl}
                </Text>
              ))}
            </View>
            {/* Timeline bar track */}
            <View
              style={{
                height: 8,
                backgroundColor: '#E0E7FF',
                borderRadius: 4,
                marginBottom: 10,
              }}
            >
              {todaySleepSessions.map((s, idx) => {
                const startPct = timeToPercent(s.sleep_start);
                const endPct = s.sleep_end
                  ? timeToPercent(s.sleep_end)
                  : Math.min(startPct + 0.03, 1);
                const width = Math.max(endPct - startPct, 0.02);
                const isNight = s.tracking_method === 'night';
                return (
                  <View
                    key={idx}
                    style={{
                      position: 'absolute',
                      left: `${startPct * 100}%` as unknown as number,
                      width: `${width * 100}%` as unknown as number,
                      top: 0,
                      bottom: 0,
                      backgroundColor: isNight ? '#4F46E5' : '#A5B4FC',
                      borderRadius: 4,
                    }}
                  />
                );
              })}
            </View>
            {/* Legend */}
            <View style={{ flexDirection: 'row', gap: 14, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View
                  style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#4F46E5' }}
                />
                <Text style={{ fontSize: 10, color: C.muted }}>Night</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View
                  style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#A5B4FC' }}
                />
                <Text style={{ fontSize: 10, color: C.muted }}>Nap</Text>
              </View>
            </View>
            {/* Session list */}
            {todaySleepSessions.length === 0 ? (
              <Text
                style={{
                  fontSize: 12,
                  color: C.muted,
                  textAlign: 'center',
                  paddingVertical: 8,
                }}
              >
                No sleep logged today yet.
              </Text>
            ) : (
              todaySleepSessions.map((s, idx) => {
                const isNight = s.tracking_method === 'night';
                return (
                  <View
                    key={idx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        backgroundColor: isNight ? '#4F46E5' : '#A5B4FC',
                      }}
                    />
                    <Text style={{ fontSize: 12, color: '#3730A3', fontWeight: '600', flex: 1 }}>
                      {isNight ? 'Night Sleep' : `Nap ${idx + 1}`}
                    </Text>
                    <Text style={{ fontSize: 11, color: C.muted }}>
                      {formatTime12(s.sleep_start)}
                      {s.sleep_end ? ` → ${formatTime12(s.sleep_end)}` : ''}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#6366F1', fontWeight: '700' }}>
                      {s.duration_minutes ? formatDuration(s.duration_minutes) : '—'}
                    </Text>
                  </View>
                );
              })
            )}
            <Text style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>
              {`← Swipe left for weekly view →`}
            </Text>
          </View>
        ) : (
          /* ── WEEKLY SLEEP BAR CHART ── */
          <View>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#3730A3', marginBottom: 6 }}>
              😴 Total Sleep — last 7 days
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View
                  style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#4F46E5' }}
                />
                <Text style={{ fontSize: 10, color: C.muted }}>Night</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View
                  style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#A5B4FC' }}
                />
                <Text style={{ fontSize: 10, color: C.muted }}>Nap</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 110 }}>
              {sleepChartData.map((d, i) => {
                const barMaxH = 90;
                const totalH = sleepMax > 0 ? (d.totalMins / sleepMax) * barMaxH : 0;
                const nightH = d.totalMins > 0 ? (d.nightMins / d.totalMins) * totalH : 0;
                const napH = totalH - nightH;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 8, color: C.muted, marginBottom: 2 }}>
                      {d.totalMins > 0 ? formatDuration(d.totalMins) : ''}
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
                      <View style={{ height: napH, backgroundColor: '#A5B4FC' }} />
                      <View style={{ height: nightH, backgroundColor: '#4F46E5' }} />
                    </View>
                    <Text style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>
                      {DAY_LABELS[i]}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>
              {`← Swipe right for today's timeline`}
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  historyChart: {
    borderRadius: 24,
    marginBottom: 25,
  },
});
