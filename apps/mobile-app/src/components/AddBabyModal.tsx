import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { C } from '../constants/colors';
import { babyService } from '../services/babyService';
import type { Baby } from '../types';

/* ─────────────────────────────────────────────────
   Shared date helpers
───────────────────────────────────────────────── */
function parseYMD(val: string): { y: number; mo: number; d: number } {
  const parts = val.split('-');
  const y = parseInt(parts[0] ?? '2024', 10);
  const mo = parseInt(parts[1] ?? '01', 10);
  const d = parseInt(parts[2] ?? '01', 10);
  return {
    y: isNaN(y) ? 2024 : y,
    mo: isNaN(mo) ? 1 : Math.min(12, Math.max(1, mo)),
    d: isNaN(d) ? 1 : Math.min(31, Math.max(1, d)),
  };
}

function toYMD(y: number, mo: number, d: number): string {
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDisplayDate(val: string): string {
  if (!val) return 'Not set';
  const { y, mo, d } = parseYMD(val);
  return `${MONTH_NAMES[(mo - 1) % 12] ?? '?'} ${d}, ${y}`;
}

/* ─────────────────────────────────────────────────
   DatePicker component
───────────────────────────────────────────────── */
function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { y, mo, d } = parseYMD(value);
  const currentYear = new Date().getFullYear();

  const adjY  = (delta: number) => onChange(toYMD(Math.min(currentYear, Math.max(1990, y + delta)), mo, d));
  const adjMo = (delta: number) => onChange(toYMD(y, ((mo - 1 + delta + 12) % 12) + 1, d));
  const adjD  = (delta: number) => onChange(toYMD(y, mo, Math.min(31, Math.max(1, d + delta))));

  return (
    <View style={dpStyles.wrapper}>
      {/* Display row — always visible */}
      <TouchableOpacity
        style={dpStyles.displayRow}
        onPress={() => setOpen(!open)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Date of birth: ${value ? formatDisplayDate(value) : 'Not set'}`}
        accessibilityHint="Tap to open date picker"
      >
        <Text style={dpStyles.calIcon}>📅</Text>
        <Text style={dpStyles.displayText}>
          {value ? formatDisplayDate(value) : 'Tap to set date of birth'}
        </Text>
        <Text style={dpStyles.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        Platform.OS === 'web'
          ? /* ── Web: native <input type="date"> ── */
            (
              <View style={dpStyles.webWrap}>
                {React.createElement('input', {
                  type: 'date',
                  value,
                  max: new Date().toISOString().split('T')[0],
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    onChange(e.target.value);
                    setOpen(false);
                  },
                  style: {
                    fontSize: 18,
                    fontWeight: '700',
                    color: '#6B21A8',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    width: '100%',
                    padding: '10px 0',
                    fontFamily: 'inherit',
                  },
                } as unknown as React.InputHTMLAttributes<HTMLInputElement>)}
              </View>
            )
          : /* ── Native: D / M / Y steppers ── */
            (
              <View style={dpStyles.nativePicker}>
                {/* Day */}
                <View style={dpStyles.col}>
                  <TouchableOpacity onPress={() => adjD(1)} style={dpStyles.arrow} accessibilityRole="button" accessibilityLabel="Increase day"><Text style={dpStyles.arrowTxt}>▲</Text></TouchableOpacity>
                  <View style={dpStyles.cell}><Text style={dpStyles.cellVal}>{String(d).padStart(2, '0')}</Text></View>
                  <TouchableOpacity onPress={() => adjD(-1)} style={dpStyles.arrow} accessibilityRole="button" accessibilityLabel="Decrease day"><Text style={dpStyles.arrowTxt}>▼</Text></TouchableOpacity>
                  <Text style={dpStyles.colLabel}>Day</Text>
                </View>

                <Text style={dpStyles.sep}>/</Text>

                {/* Month */}
                <View style={dpStyles.col}>
                  <TouchableOpacity onPress={() => adjMo(1)} style={dpStyles.arrow} accessibilityRole="button" accessibilityLabel="Increase month"><Text style={dpStyles.arrowTxt}>▲</Text></TouchableOpacity>
                  <View style={[dpStyles.cell, { width: 60 }]}>
                    <Text style={[dpStyles.cellVal, { fontSize: 18 }]}>{MONTH_NAMES[(mo - 1) % 12]}</Text>
                  </View>
                  <TouchableOpacity onPress={() => adjMo(-1)} style={dpStyles.arrow} accessibilityRole="button" accessibilityLabel="Decrease month"><Text style={dpStyles.arrowTxt}>▼</Text></TouchableOpacity>
                  <Text style={dpStyles.colLabel}>Month</Text>
                </View>

                <Text style={dpStyles.sep}>/</Text>

                {/* Year */}
                <View style={dpStyles.col}>
                  <TouchableOpacity onPress={() => adjY(1)} style={dpStyles.arrow} accessibilityRole="button" accessibilityLabel="Increase year"><Text style={dpStyles.arrowTxt}>▲</Text></TouchableOpacity>
                  <View style={[dpStyles.cell, { width: 76 }]}><Text style={[dpStyles.cellVal, { fontSize: 22 }]}>{y}</Text></View>
                  <TouchableOpacity onPress={() => adjY(-1)} style={dpStyles.arrow} accessibilityRole="button" accessibilityLabel="Decrease year"><Text style={dpStyles.arrowTxt}>▼</Text></TouchableOpacity>
                  <Text style={dpStyles.colLabel}>Year</Text>
                </View>
              </View>
            )
      )}
    </View>
  );
}

const dpStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    backgroundColor: '#FFF',
    shadowColor: C.purple,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  calIcon: { fontSize: 20 },
  displayText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: C.purpleDark,
  },
  chevron: { fontSize: 12, color: C.muted, fontWeight: '700' },
  webWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  nativePicker: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 4,
  },
  col: { alignItems: 'center' },
  arrow: { paddingVertical: 6, paddingHorizontal: 12 },
  arrowTxt: { fontSize: 14, color: C.muted, fontWeight: '700' },
  cell: {
    width: 48,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
  },
  cellVal: { fontSize: 24, fontWeight: '800', color: C.purpleDark },
  sep: { fontSize: 24, fontWeight: '800', color: C.muted, marginTop: 32, marginHorizontal: 2 },
  colLabel: { fontSize: 9, color: C.muted, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
});

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (baby: Baby) => void;
}

const GENDERS = ['Boy', 'Girl', 'Other'] as const;

export function AddBabyModal({ visible, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<string>('Boy');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setBirthDate('');
    setGender('Boy');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const isValidDate = (val: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(val) && !isNaN(Date.parse(val));

  const handleSave = async () => {
    if (!name.trim()) { setError('Please enter your baby\'s name.'); return; }
    if (!isValidDate(birthDate)) { setError('Enter birth date as YYYY-MM-DD (e.g. 2024-03-15).'); return; }
    setSaving(true);
    setError(null);
    try {
      const baby = await babyService.createBaby({
        name: name.trim(),
        birth_date: birthDate,
        gender,
      });
      reset();
      onCreated(baby);
    } catch {
      setError('Could not create profile. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close add baby modal"
        />

        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Baby Profile</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close add baby modal"
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Illustration */}
            <View style={styles.illustrationWrap}>
              <Text style={styles.illustration}>👶</Text>
              <Text style={styles.illustrationCaption}>
                Every journey begins with a first step.
              </Text>
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Name */}
            <Text style={styles.label}>Baby's Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Charlie"
              placeholderTextColor="#C0C0C0"
              style={styles.input}
              autoFocus
            />

            {/* Date of birth */}
            <Text style={styles.label}>Date of Birth</Text>
            <DatePicker value={birthDate} onChange={setBirthDate} />

            {/* Gender */}
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGender(g)}
                  style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${g}`}
                  accessibilityState={{ selected: gender === g }}
                >
                  <Text style={[styles.genderEmoji]}>
                    {g === 'Boy' ? '👦' : g === 'Girl' ? '👧' : '🧒'}
                  </Text>
                  <Text style={[styles.genderLabel, gender === g && styles.genderLabelActive]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={() => void handleSave()}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Create baby profile"
              accessibilityState={{ disabled: saving }}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Create Profile 🎉</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '800', color: C.ink },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  closeText: { fontSize: 14, color: C.muted, fontWeight: '700' },

  illustrationWrap: { alignItems: 'center', marginBottom: 28 },
  illustration: { fontSize: 64, marginBottom: 8 },
  illustrationCaption: { fontSize: 13, color: C.muted, fontStyle: 'italic', textAlign: 'center' },

  errorBox: {
    backgroundColor: '#FEE2E2', borderRadius: 14,
    padding: 12, marginBottom: 16,
  },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '700', textAlign: 'center' },

  label: { fontSize: 12, fontWeight: '800', color: '#555', marginBottom: 6, letterSpacing: 0.3 },
  input: {
    height: 50, borderRadius: 16, backgroundColor: '#F4F4F4',
    paddingHorizontal: 16, color: C.ink, fontSize: 15, marginBottom: 6,
  },
  hint: { fontSize: 10, color: C.muted, marginBottom: 18, marginLeft: 4 },

  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  genderBtn: {
    flex: 1, borderRadius: 16, borderWidth: 1.5, borderColor: '#ECECEC',
    backgroundColor: '#F9FAFB', alignItems: 'center', paddingVertical: 14,
  },
  genderBtnActive: { borderColor: C.purple, backgroundColor: '#F7EEFC' },
  genderEmoji: { fontSize: 28, marginBottom: 6 },
  genderLabel: { fontSize: 12, fontWeight: '700', color: C.muted },
  genderLabelActive: { color: C.purpleDark },

  saveBtn: {
    height: 54, borderRadius: 27, backgroundColor: C.purple,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.purple, shadowOpacity: 0.4, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
    marginBottom: 10,
  },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
});
