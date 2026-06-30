import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { C } from '../../../constants/colors';
import { CustomTimeSelector } from './CustomTimeSelector';

interface Props {
  sleepTrackingMode: 'timer' | 'manual';
  setSleepTrackingMode: (val: 'timer' | 'manual') => void;
  activeSleepStart: string | null;
  setActiveSleepStart: (val: string | null) => void;
  elapsedSeconds: number;
  formatElapsed: (secs: number) => string;
  customTimeEnabled: boolean;
  setCustomTimeEnabled: (val: boolean) => void;
  customTime: string;
  setCustomTime: (val: string) => void;
  duration: string;
  setDuration: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  saving: boolean;
  onLog: () => Promise<void>;
}

export function SleepForm({
  sleepTrackingMode,
  setSleepTrackingMode,
  activeSleepStart,
  setActiveSleepStart,
  elapsedSeconds,
  formatElapsed,
  customTimeEnabled,
  setCustomTimeEnabled,
  customTime,
  setCustomTime,
  duration,
  setDuration,
  notes,
  setNotes,
  saving,
  onLog,
}: Props) {
  return (
    <View>
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

      {sleepTrackingMode === 'timer' ? (
        activeSleepStart ? (
          <View style={{ alignItems: 'center', paddingVertical: 10 }}>
            <Text style={{ fontSize: 14, color: C.muted, fontWeight: '700', letterSpacing: 0.5 }}>
              ACTIVE TIMER
            </Text>
            <Text style={{ fontSize: 44, color: C.purple, fontWeight: '800', marginVertical: 16 }}>
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
          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.inputLabel}>Duration (HH:MM)</Text>
              <TextInput
                accessibilityLabel="Duration in hours and minutes"
                value={duration}
                onChangeText={setDuration}
                keyboardType="numbers-and-punctuation"
                placeholder="01:30"
                placeholderTextColor="#A9A9A9"
                style={styles.input}
              />
            </View>
          </View>

          <CustomTimeSelector
            customTimeEnabled={customTimeEnabled}
            setCustomTimeEnabled={setCustomTimeEnabled}
            customTime={customTime}
            setCustomTime={setCustomTime}
          />

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
              <Text style={styles.logButtonText}>Save Sleep</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  notesInput: { width: '100%', marginBottom: 20 },
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
