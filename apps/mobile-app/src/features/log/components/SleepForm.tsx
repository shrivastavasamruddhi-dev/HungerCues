import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
  /** duration is stored as "HH:MM" string internally */
  duration: string;
  setDuration: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  saving: boolean;
  onLog: () => Promise<void>;
}

/** Parse "HH:MM" → { hours, minutes } */
function parseDuration(dur: string): { hours: number; minutes: number } {
  const parts = dur.split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  return { hours: isNaN(h) ? 0 : h, minutes: isNaN(m) ? 0 : m };
}

/** Build "HH:MM" from hours + minutes */
function buildDuration(hours: number, minutes: number): string {
  const hh = String(Math.max(0, hours)).padStart(2, '0');
  const mm = String(Math.min(59, Math.max(0, minutes))).padStart(2, '0');
  return `${hh}:${mm}`;
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
  const { hours, minutes } = parseDuration(duration);

  const onHoursChange = useCallback(
    (val: string) => {
      const h = parseInt(val.replace(/[^0-9]/g, ''), 10);
      setDuration(buildDuration(isNaN(h) ? 0 : h, minutes));
    },
    [minutes, setDuration],
  );

  const onMinutesChange = useCallback(
    (val: string) => {
      const m = parseInt(val.replace(/[^0-9]/g, ''), 10);
      setDuration(buildDuration(hours, isNaN(m) ? 0 : m));
    },
    [hours, setDuration],
  );

  return (
    <View>
      {/* ── Tracking mode toggle ── */}
      <View style={styles.segmentRow}>
        {(
          [
            { key: 'timer' as const, label: '⏱ Use Timer' },
            { key: 'manual' as const, label: '✏️ Enter Manually' },
          ] as const
        ).map((item) => (
          <TouchableOpacity
            key={item.key}
            onPress={() => setSleepTrackingMode(item.key)}
            style={[styles.segment, sleepTrackingMode === item.key && styles.segmentActive]}
          >
            <Text
              style={[
                styles.segmentText,
                sleepTrackingMode === item.key && styles.segmentTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Timer mode ── */}
      {sleepTrackingMode === 'timer' ? (
        activeSleepStart ? (
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>ACTIVE TIMER</Text>
            <Text style={styles.timerDisplay}>{formatElapsed(elapsedSeconds)}</Text>
            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              accessibilityLabel="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="What is your baby doing?"
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
                <Text style={styles.logButtonText}>End Sleep & Save</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.timerStart}>
            <Text style={styles.timerHint}>
              Track your baby's sleep in real-time.
            </Text>
            <TouchableOpacity
              style={styles.logButton}
              onPress={() => setActiveSleepStart(new Date().toISOString())}
            >
              <Text style={styles.logButtonText}>▶ Start Sleep Session</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        /* ── Manual mode ── */
        <View>
          {/* Hours + Minutes side-by-side steppers */}
          <Text style={styles.inputLabel}>Sleep Duration</Text>
          <View style={styles.durationRow}>
            {/* Hours */}
            <View style={styles.durationField}>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setDuration(buildDuration(Math.max(0, hours - 1), minutes))}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  accessibilityLabel="Hours of sleep"
                  value={String(hours)}
                  onChangeText={onHoursChange}
                  keyboardType="number-pad"
                  style={styles.stepInput}
                  maxLength={2}
                />
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setDuration(buildDuration(hours + 1, minutes))}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.durationUnit}>hours</Text>
            </View>

            <Text style={styles.durationSep}>:</Text>

            {/* Minutes */}
            <View style={styles.durationField}>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() =>
                    setDuration(buildDuration(hours, Math.max(0, minutes - 5)))
                  }
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  accessibilityLabel="Minutes of sleep"
                  value={String(minutes).padStart(2, '0')}
                  onChangeText={onMinutesChange}
                  keyboardType="number-pad"
                  style={styles.stepInput}
                  maxLength={2}
                />
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() =>
                    setDuration(buildDuration(hours, Math.min(59, minutes + 5)))
                  }
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.durationUnit}>min</Text>
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
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    backgroundColor: '#F4F4F4',
    borderRadius: 22,
    padding: 4,
  },
  segment: {
    flex: 1,
    height: 38,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  segmentText: { fontSize: 12, fontWeight: '600', color: C.muted },
  segmentTextActive: { color: C.purpleDark, fontWeight: '800' },
  white: { color: '#FFF' },

  /* Timer mode */
  timerContainer: { alignItems: 'center', paddingVertical: 8 },
  timerLabel: { fontSize: 11, color: C.muted, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  timerDisplay: { fontSize: 52, color: C.purple, fontWeight: '800', marginBottom: 24, fontVariant: ['tabular-nums'] as const },
  timerStart: { alignItems: 'center', paddingVertical: 16 },
  timerHint: { fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 20 },

  /* Duration steppers */
  inputLabel: { color: '#555', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 4,
  },
  durationField: { alignItems: 'center', flex: 1 },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    borderRadius: 16,
    overflow: 'hidden',
    height: 48,
  },
  stepBtn: {
    width: 40,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBEBEB',
  },
  stepBtnText: { fontSize: 20, fontWeight: '300', color: C.ink },
  stepInput: {
    width: 48,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: C.ink,
    backgroundColor: '#F4F4F4',
  },
  durationSep: { fontSize: 28, fontWeight: '800', color: C.muted, marginBottom: 18 },
  durationUnit: { fontSize: 10, color: C.muted, fontWeight: '700', marginTop: 6, letterSpacing: 0.5 },

  /* Shared */
  input: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F4F4F4',
    paddingHorizontal: 14,
    color: C.ink,
    fontSize: 14,
    marginBottom: 12,
    width: '100%',
  },
  notesInput: { marginBottom: 20 },
  logButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: C.purple,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    width: '100%',
  },
  logButtonText: { color: '#FFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  buttonDisabled: { opacity: 0.55 },
});
