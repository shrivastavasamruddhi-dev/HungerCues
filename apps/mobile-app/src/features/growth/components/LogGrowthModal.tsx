import React from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { C } from '../../../constants/colors';
import { ErrorBox } from '../../../components/ErrorBox';

interface Props {
  visible: boolean;
  onClose: () => void;
  unitSystem: 'metric' | 'imperial';
  setUnitSystem: (val: 'metric' | 'imperial') => void;
  weight: string;
  setWeight: (val: string) => void;
  height: string;
  setHeight: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  customDateStr: string;
  setCustomDateStr: (val: string) => void;
  saving: boolean;
  logError: string | null;
  onSubmit: () => void;
}

export function LogGrowthModal({
  visible,
  onClose,
  unitSystem,
  setUnitSystem,
  weight,
  setWeight,
  height,
  setHeight,
  notes,
  setNotes,
  customDateStr,
  setCustomDateStr,
  saving,
  logError,
  onSubmit,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Log Growth Entry</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Text style={{ fontSize: 18, color: C.muted, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Error banner */}
          {logError && <ErrorBox message={logError} style={{ marginBottom: 15 }} />}

          {/* Unit System Toggle */}
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
                  { flex: 1, height: 38, minWidth: 0, paddingHorizontal: 0, borderRadius: 19 },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    unitSystem === item.key && styles.whiteText,
                    { fontSize: 13, fontWeight: '700' },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Numeric Input Fields */}
          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.inputLabel}>
                Weight {unitSystem === 'metric' ? '(kg)' : '(lbs)'}
              </Text>
              <TextInput
                accessibilityLabel="Weight"
                value={weight}
                onChangeText={setWeight}
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
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                placeholder={unitSystem === 'metric' ? 'e.g. 58.2' : 'e.g. 23.0'}
                placeholderTextColor="#A9A9A9"
                style={styles.input}
              />
            </View>
          </View>

          {/* Custom Date Selector */}
          <View style={{ marginBottom: 15, marginTop: 10 }}>
            <Text style={styles.inputLabel}>Date of Activity (DD/MM/YYYY)</Text>
            <TextInput
              value={customDateStr}
              onChangeText={setCustomDateStr}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#A9A9A9"
              style={styles.input}
            />

            {/* Quick Offset Helpers */}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              {[
                { label: 'Today', offsetDays: 0 },
                { label: 'Yesterday', offsetDays: 1 },
                { label: '3 days ago', offsetDays: 3 },
              ].map((helper) => (
                <TouchableOpacity
                  key={helper.label}
                  onPress={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - helper.offsetDays);
                    const dd = String(d.getDate()).padStart(2, '0');
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const yyyy = d.getFullYear();
                    setCustomDateStr(`${dd}/${mm}/${yyyy}`);
                  }}
                  style={styles.offsetHelperBtn}
                >
                  <Text style={{ color: C.purpleDark, fontSize: 11, fontWeight: '700' }}>
                    {helper.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <Text style={styles.inputLabel}>Notes (optional)</Text>
          <TextInput
            accessibilityLabel="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Add a useful detail"
            placeholderTextColor="#A9A9A9"
            style={[styles.input, styles.notesInput]}
          />

          {/* Submit Button */}
          <TouchableOpacity
            disabled={saving}
            style={[styles.modalSubmitButton, saving && styles.buttonDisabled]}
            onPress={onSubmit}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.modalSubmitButtonText}>Save Growth</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 450,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalHeaderTitle: { fontSize: 18, fontWeight: '800', color: C.ink },
  inputLabel: { color: '#555', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  whiteText: { color: '#FFF' },
  formRow: { flexDirection: 'row', gap: 10 },
  formField: { flex: 1 },
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
  offsetHelperBtn: {
    backgroundColor: C.purpleSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSubmitButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitButtonText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  buttonDisabled: { opacity: 0.55 },
});
