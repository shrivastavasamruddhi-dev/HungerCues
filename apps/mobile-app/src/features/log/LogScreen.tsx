import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../../constants/colors';
import { activityMeta } from '../../constants/activityMeta';
import { Header } from '../../components/Header';
import { SectionTitle } from '../../components/SectionTitle';
import { ActivityTabBar } from './components/ActivityTabBar';
import { FeedForm } from './components/FeedForm';
import { SleepForm } from './components/SleepForm';
import { DiaperForm } from './components/DiaperForm';
import { GrowthForm } from './components/GrowthForm';
import type { Activity, FeedType } from '../../types';

interface Props {
  activity: Activity;
  setActivity: (value: Activity) => void;
  feedType: FeedType;
  setFeedType: (value: FeedType) => void;
  subtype: string;
  setSubtype: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  duration: string;
  setDuration: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  saving: boolean;
  onLog: () => Promise<void>;
  activeSleepStart: string | null;
  setActiveSleepStart: (value: string | null) => void;
  sleepTrackingMode: 'timer' | 'manual';
  setSleepTrackingMode: (value: 'timer' | 'manual') => void;
  elapsedSeconds: number;
  formatElapsed: (secs: number) => string;
  customTimeEnabled: boolean;
  setCustomTimeEnabled: (value: boolean) => void;
  customTime: string;
  setCustomTime: (value: string) => void;
  unitSystem: 'metric' | 'imperial';
  setUnitSystem: (value: 'metric' | 'imperial') => void;
  weightInput: string;
  setWeightInput: (value: string) => void;
  heightInput: string;
  setHeightInput: (value: string) => void;
  breastSide: 'Left' | 'Right';
  setBreastSide: (value: 'Left' | 'Right') => void;
  onPressHeaderAction: () => void;
}

export function LogScreen({
  activity,
  setActivity,
  feedType,
  setFeedType,
  subtype,
  setSubtype,
  amount,
  setAmount,
  duration,
  setDuration,
  notes,
  setNotes,
  saving,
  onLog,
  activeSleepStart,
  setActiveSleepStart,
  sleepTrackingMode,
  setSleepTrackingMode,
  elapsedSeconds,
  formatElapsed,
  customTimeEnabled,
  setCustomTimeEnabled,
  customTime,
  setCustomTime,
  unitSystem,
  setUnitSystem,
  weightInput,
  setWeightInput,
  heightInput,
  setHeightInput,
  breastSide,
  setBreastSide,
  onPressHeaderAction,
}: Props) {
  const options =
    activity === 'feed'
      ? ['Breast', 'Bottle', 'Solid']
      : activity === 'sleep'
        ? ['Nap', 'Night', 'Rest']
        : ['Wet', 'Poopy', 'Mixed'];

  return (
    <View>
      <Header title="Quick Log" onPress={onPressHeaderAction} />

      <ActivityTabBar activity={activity} setActivity={setActivity} />

      {activity !== 'growth' && (
        <>
          <SectionTitle>
            {activity === 'feed'
              ? 'Feed Type'
              : activity === 'sleep'
                ? 'Sleep Type'
                : 'Diaper Type'}
          </SectionTitle>
          <View style={styles.typeRow}>
            {options.map((type, index) => (
              <TouchableOpacity
                key={type}
                onPress={() => {
                  setSubtype(type);
                  if (activity === 'feed') setFeedType(type as FeedType);
                }}
                style={[styles.typeCard, subtype === type && styles.typeCardActive]}
              >
                <View style={styles.typeIcon}>
                  <Text>{index === 0 ? activityMeta[activity].icon : index === 1 ? '♧' : '♢'}</Text>
                </View>
                <Text style={styles.typeLabel}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <View style={styles.trendCard}>
        <View style={styles.trendHeader}>
          <View style={styles.trendIcon}>
            <Text style={styles.white}>{activityMeta[activity].icon}</Text>
          </View>
          <Text style={styles.trendTitle}>
            {activity === 'growth'
              ? 'Growth Tracking'
              : `${activityMeta[activity].label}ing Trends`}
          </Text>
        </View>

        {activity === 'feed' && (
          <FeedForm
            subtype={subtype}
            amount={amount}
            setAmount={setAmount}
            duration={duration}
            setDuration={setDuration}
            notes={notes}
            setNotes={setNotes}
            breastSide={breastSide}
            setBreastSide={setBreastSide}
            saving={saving}
            onLog={onLog}
            customTimeEnabled={customTimeEnabled}
            setCustomTimeEnabled={setCustomTimeEnabled}
            customTime={customTime}
            setCustomTime={setCustomTime}
          />
        )}

        {activity === 'sleep' && (
          <SleepForm
            sleepTrackingMode={sleepTrackingMode}
            setSleepTrackingMode={setSleepTrackingMode}
            activeSleepStart={activeSleepStart}
            setActiveSleepStart={setActiveSleepStart}
            elapsedSeconds={elapsedSeconds}
            formatElapsed={formatElapsed}
            customTimeEnabled={customTimeEnabled}
            setCustomTimeEnabled={setCustomTimeEnabled}
            customTime={customTime}
            setCustomTime={setCustomTime}
            duration={duration}
            setDuration={setDuration}
            notes={notes}
            setNotes={setNotes}
            saving={saving}
            onLog={onLog}
          />
        )}

        {activity === 'diaper' && (
          <DiaperForm
            notes={notes}
            setNotes={setNotes}
            saving={saving}
            onLog={onLog}
            customTimeEnabled={customTimeEnabled}
            setCustomTimeEnabled={setCustomTimeEnabled}
            customTime={customTime}
            setCustomTime={setCustomTime}
          />
        )}

        {activity === 'growth' && (
          <GrowthForm
            unitSystem={unitSystem}
            setUnitSystem={setUnitSystem}
            weightInput={weightInput}
            setWeightInput={setWeightInput}
            heightInput={heightInput}
            setHeightInput={setHeightInput}
            notes={notes}
            setNotes={setNotes}
            saving={saving}
            onLog={onLog}
            customTimeEnabled={customTimeEnabled}
            setCustomTimeEnabled={setCustomTimeEnabled}
            customTime={customTime}
            setCustomTime={setCustomTime}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  typeCard: {
    flex: 1,
    height: 100,
    borderRadius: 15,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  typeCardActive: { borderWidth: 1.5, borderColor: C.purple, backgroundColor: '#F4EDF7' },
  typeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: { fontSize: 12, fontWeight: '700', color: C.ink },
  trendCard: { backgroundColor: C.card, borderRadius: 28, padding: 20 },
  trendHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  trendIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendTitle: { color: C.ink, fontSize: 16, fontWeight: '800' },
  white: { color: '#FFF' },
});
