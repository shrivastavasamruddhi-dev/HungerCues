import React from 'react';
import { Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { C } from '../../../constants/colors';
import { CustomTimeSelector } from './CustomTimeSelector';

interface Props {
  notes: string;
  setNotes: (val: string) => void;
  saving: boolean;
  onLog: () => Promise<void>;
  customTimeEnabled: boolean;
  setCustomTimeEnabled: (val: boolean) => void;
  customTime: string;
  setCustomTime: (val: string) => void;
}

export function DiaperForm({
  notes,
  setNotes,
  saving,
  onLog,
  customTimeEnabled,
  setCustomTimeEnabled,
  customTime,
  setCustomTime,
}: Props) {
  return (
    <>
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
          <Text style={styles.logButtonText}>Save Diaper</Text>
        )}
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
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
