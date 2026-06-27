import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { C } from '../../constants/colors';
import { activityMeta } from '../../constants/activityMeta';
import { Header } from '../../components/Header';
import { SectionTitle } from '../../components/SectionTitle';
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
        : ['Wet', 'Mixed', 'Dry'];

  return (
    <View>
      <Header title="Quick Log" onPress={onPressHeaderAction} />
      <View style={styles.activityTabs}>
        {(Object.keys(activityMeta) as Activity[])
          .filter((key) => key !== 'growth')
          .map((key) => (
            <TouchableOpacity
              key={key}
              onPress={() => setActivity(key)}
              style={[styles.activityTab, activity === key && styles.activityTabActive]}
            >
              <View
                style={[styles.smallIconCircle, activity === key && styles.smallIconCircleActive]}
              >
                <Text>{activityMeta[key].icon}</Text>
              </View>
              <Text style={[styles.activityText, activity === key && styles.activityTextActive]}>
                {activityMeta[key].label}
              </Text>
            </TouchableOpacity>
          ))}
      </View>

      {activity === 'sleep' && (
        <View style={styles.segmentRow}>
          {[
            { key: 'timer', label: 'Use Sleep Timer' },
            { key: 'manual', label: 'Enter Manually' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => setSleepTrackingMode(item.key as 'timer' | 'manual')}
              style={[
                styles.segment,
                sleepTrackingMode === item.key && styles.segmentActive,
                { flex: 1, height: 42, minWidth: 0, paddingHorizontal: 0, borderRadius: 21 },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  sleepTrackingMode === item.key && styles.white,
                  { fontSize: 13, fontWeight: '700' },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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

        {activity === 'sleep' && sleepTrackingMode === 'timer' ? (
          activeSleepStart ? (
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ fontSize: 14, color: C.muted, fontWeight: '700', letterSpacing: 0.5 }}>
                ACTIVE TIMER
              </Text>
              <Text
                style={{ fontSize: 44, color: C.purple, fontWeight: '800', marginVertical: 16 }}
              >
                {formatElapsed(elapsedSeconds)}
              </Text>
              <View style={{ width: '100%' }}>
                <Text style={styles.inputLabel}>Notes (optional)</Text>
                <TextInput
                  accessibilityLabel="Notes"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="What is your baby doing?"
                  placeholderTextColor="#A9A9A9"
                  style={[styles.input, styles.notesInput]}
                />
              </View>
              <TouchableOpacity
                disabled={saving}
                style={[styles.logButton, { width: '100%' }, saving && styles.buttonDisabled]}
                onPress={() => void onLog()}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.logButtonText}>End Sleep & Save</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 20 }}>
                Press start to track your baby's sleep in real-time.
              </Text>
              <TouchableOpacity
                style={[styles.logButton, { width: '100%', backgroundColor: C.purple }]}
                onPress={() => setActiveSleepStart(new Date().toISOString())}
              >
                <Text style={styles.logButtonText}>Start Sleep Session</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          <View>
            {activity === 'growth' ? (
              <View style={{ marginBottom: 10 }}>
                {/* Unit system toggle */}
                <Text style={styles.inputLabel}>Unit System</Text>
                <View style={[styles.segmentRow, { marginBottom: 15 }]}>
                  {[
                    { key: 'metric', label: 'Metric (kg, cm)' },
                    { key: 'imperial', label: 'Imperial (lbs, in)' },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setUnitSystem(item.key as 'metric' | 'imperial')}
                      style={[
                        styles.segment,
                        unitSystem === item.key && styles.segmentActive,
                        {
                          flex: 1,
                          height: 38,
                          minWidth: 0,
                          paddingHorizontal: 0,
                          borderRadius: 19,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          unitSystem === item.key && styles.white,
                          { fontSize: 13, fontWeight: '700' },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Weight & Height Input Fields */}
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.inputLabel}>
                      Weight {unitSystem === 'metric' ? '(kg)' : '(lbs)'}
                    </Text>
                    <TextInput
                      accessibilityLabel="Weight"
                      value={weightInput}
                      onChangeText={setWeightInput}
                      keyboardType="numeric"
                      placeholder={unitSystem === 'metric' ? 'e.g. 5.4' : 'e.g. 12.0'}
                      placeholderTextColor="#A9A9A9"
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.inputLabel}>
                      Height {unitSystem === 'metric' ? '(cm)' : '(in)'}
                    </Text>
                    <TextInput
                      accessibilityLabel="Height"
                      value={heightInput}
                      onChangeText={setHeightInput}
                      keyboardType="numeric"
                      placeholder={unitSystem === 'metric' ? 'e.g. 58.2' : 'e.g. 23.0'}
                      placeholderTextColor="#A9A9A9"
                      style={styles.input}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.formRow}>
                {activity === 'feed' && subtype === 'Bottle' ? (
                  <View style={styles.formField}>
                    <Text style={styles.inputLabel}>Amount (ml)</Text>
                    <TextInput
                      accessibilityLabel="Amount in milliliters"
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                ) : null}
                {activity === 'feed' && subtype === 'Breast' ? (
                  <View style={styles.formField}>
                    <Text style={styles.inputLabel}>Breast Side</Text>
                    <View style={{ flexDirection: 'row', gap: 6, height: 42 }}>
                      {['Left', 'Right'].map((side) => (
                        <TouchableOpacity
                          key={side}
                          onPress={() => setBreastSide(side as 'Left' | 'Right')}
                          style={{
                            flex: 1,
                            backgroundColor: breastSide === side ? C.purple : '#EDEDEE',
                            borderRadius: 8,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text
                            style={{
                              color: breastSide === side ? '#FFF' : C.muted,
                              fontSize: 13,
                              fontWeight: '700',
                            }}
                          >
                            {side}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ) : null}
                {activity !== 'diaper' ? (
                  <View style={styles.formField}>
                    <Text style={styles.inputLabel}>Duration (min)</Text>
                    <TextInput
                      accessibilityLabel="Duration in minutes"
                      value={duration}
                      onChangeText={setDuration}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                ) : null}
              </View>
            )}

            {/* Custom Time Selector (Only for feed, sleep, and growth) */}
            {(activity === 'feed' || activity === 'sleep' || activity === 'growth') && (
              <View style={{ marginBottom: 15 }}>
                <TouchableOpacity
                  onPress={() => setCustomTimeEnabled(!customTimeEnabled)}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: C.purple,
                      backgroundColor: customTimeEnabled ? C.purple : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 8,
                    }}
                  >
                    {customTimeEnabled && (
                      <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>✓</Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 14, color: C.ink, fontWeight: '600' }}>
                    Set time of activity
                  </Text>
                </TouchableOpacity>

                {customTimeEnabled && (
                  <View
                    style={{
                      backgroundColor: '#F8F8F8',
                      borderRadius: 8,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: '#EEE',
                      marginBottom: 10,
                    }}
                  >
                    <Text
                      style={{ fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 4 }}
                    >
                      Start Time (HH:MM)
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TextInput
                        value={customTime}
                        onChangeText={setCustomTime}
                        placeholder="14:30"
                        placeholderTextColor="#A9A9A9"
                        style={[styles.input, { flex: 1, height: 40, marginBottom: 0 }]}
                      />

                      {/* Offset Helpers */}
                      <View style={{ flexDirection: 'row', marginLeft: 8 }}>
                        {[
                          { label: '-5m', val: 5 },
                          { label: '-15m', val: 15 },
                          { label: '-30m', val: 30 },
                          { label: '-1h', val: 60 },
                        ].map((offset) => (
                          <TouchableOpacity
                            key={offset.label}
                            onPress={() => {
                              const target = new Date(Date.now() - offset.val * 60 * 1000);
                              const hh = String(target.getHours()).padStart(2, '0');
                              const mm = String(target.getMinutes()).padStart(2, '0');
                              setCustomTime(`${hh}:${mm}`);
                            }}
                            style={{
                              backgroundColor: C.purpleSoft,
                              paddingHorizontal: 8,
                              paddingVertical: 8,
                              borderRadius: 4,
                              marginLeft: 4,
                            }}
                          >
                            <Text style={{ color: C.purpleDark, fontSize: 11, fontWeight: '700' }}>
                              {offset.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              accessibilityLabel="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a useful detail"
              placeholderTextColor="#A9A9A9"
              style={[styles.input, styles.notesInput]}
            />
            <TouchableOpacity
              disabled={saving}
              style={[styles.logButton, saving && styles.buttonDisabled]}
              onPress={() => void onLog()}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.logButtonText}>Save {activityMeta[activity].label}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  activityTabs: { flexDirection: 'row', marginBottom: 30 },
  activityTab: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#DEDEDE',
  },
  activityTabActive: { backgroundColor: C.card, borderRadius: 25 },
  smallIconCircle: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: '#ECECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallIconCircleActive: { backgroundColor: C.purpleSoft },
  activityText: { color: C.muted, fontSize: 16 },
  activityTextActive: { color: C.ink, fontWeight: '600' },
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: { color: C.ink, fontSize: 16 },
  trendCard: { backgroundColor: C.card, borderRadius: 26, padding: 18 },
  trendHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  trendIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendTitle: { fontSize: 18, fontWeight: '800' },
  formRow: { flexDirection: 'row', gap: 10 },
  formField: { flex: 1 },
  inputLabel: { color: '#555', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  input: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F4F4F4',
    paddingHorizontal: 14,
    color: C.ink,
    fontSize: 14,
    marginBottom: 12,
  },
  notesInput: { width: '100%' },
  buttonDisabled: { opacity: 0.55 },
  logButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  logButtonText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
