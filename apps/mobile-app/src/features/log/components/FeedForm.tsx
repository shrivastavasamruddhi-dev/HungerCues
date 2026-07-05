import React from 'react';
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
  subtype: string;
  amount: string;
  setAmount: (val: string) => void;
  duration: string;
  setDuration: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  breastSide: 'Left' | 'Right';
  setBreastSide: (val: 'Left' | 'Right') => void;
  saving: boolean;
  onLog: () => Promise<void>;
  customTimeEnabled: boolean;
  setCustomTimeEnabled: (val: boolean) => void;
  customTime: string;
  setCustomTime: (val: string) => void;
}

export function FeedForm({
  subtype,
  amount,
  setAmount,
  duration,
  setDuration,
  notes,
  setNotes,
  breastSide,
  setBreastSide,
  saving,
  onLog,
  customTimeEnabled,
  setCustomTimeEnabled,
  customTime,
  setCustomTime,
}: Props) {
  const isBottle = subtype === 'Bottle';
  const isBreast = subtype === 'Breast';
  const isSolid  = subtype === 'Solid';

  return (
    <View>
      <View style={styles.formRow}>
        {/* ── Bottle: Amount (ml) ── */}
        {isBottle && (
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
        )}

        {/* ── Breast: Side selector ── */}
        {isBreast && (
          <View style={styles.formField}>
            <Text style={styles.inputLabel}>Breast Side</Text>
            <View style={styles.sideRow}>
              {(['Left', 'Right'] as const).map((side) => (
                <TouchableOpacity
                  key={side}
                  accessibilityLabel={`${side} breast`}
                  onPress={() => setBreastSide(side)}
                  style={[
                    styles.sideBtn,
                    breastSide === side && styles.sideBtnActive,
                  ]}
                >
                  <Text style={[styles.sideBtnText, breastSide === side && styles.sideBtnTextActive]}>
                    {side}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Solid: Servings (not ml, not minutes) ── */}
        {isSolid && (
          <View style={styles.formField}>
            <Text style={styles.inputLabel}>Portions / Servings</Text>
            <TextInput
              accessibilityLabel="Number of servings"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor="#A9A9A9"
              style={styles.input}
            />
          </View>
        )}

        {/* ── Duration (min) — only for Breast & Bottle, NOT Solid ── */}
        {!isSolid && (
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
        )}
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
          <Text style={styles.logButtonText}>Save Feed</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
  sideRow: { flexDirection: 'row', gap: 6, height: 46, marginBottom: 12 },
  sideBtn: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtnActive: { backgroundColor: C.purple },
  sideBtnText: { fontSize: 13, fontWeight: '700', color: C.muted },
  sideBtnTextActive: { color: '#FFF' },
  logButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: C.purple,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  logButtonText: { color: '#FFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  buttonDisabled: { opacity: 0.55 },
});
