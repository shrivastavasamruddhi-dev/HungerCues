import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { C } from '../../../constants/colors';

interface Props {
  customTimeEnabled: boolean;
  setCustomTimeEnabled: (val: boolean) => void;
  /** time stored as "HH:MM" 24-hour string */
  customTime: string;
  setCustomTime: (val: string) => void;
}

/** Parse "HH:MM" → { hours, minutes } */
function parseHHMM(val: string): { h: number; m: number } {
  const [hStr, mStr] = val.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const m = parseInt(mStr ?? '0', 10);
  return { h: isNaN(h) ? 0 : Math.min(23, Math.max(0, h)), m: isNaN(m) ? 0 : Math.min(59, Math.max(0, m)) };
}

/** Format hour + minute → "HH:MM" */
function toHHMM(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Format for 12-hour display: "2:30 PM" */
function to12h(val: string): string {
  const { h, m } = parseHHMM(val);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function CustomTimeSelector({
  customTimeEnabled,
  setCustomTimeEnabled,
  customTime,
  setCustomTime,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const { h, m } = parseHHMM(customTime);

  const adjustH = (delta: number) => {
    const next = ((h + delta) % 24 + 24) % 24;
    setCustomTime(toHHMM(next, m));
  };
  const adjustM = (delta: number) => {
    // Step by 5 minutes
    const rounded = Math.round(m / 5) * 5;
    const next = ((rounded + delta) % 60 + 60) % 60;
    setCustomTime(toHHMM(h, next));
  };

  return (
    <View style={styles.wrapper}>
      {/* Toggle row */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          setCustomTimeEnabled(!customTimeEnabled);
          if (!customTimeEnabled) setShowPicker(true);
          else setShowPicker(false);
        }}
        style={styles.toggleRow}
      >
        <View style={styles.toggleLeft}>
          <Text style={styles.clockIcon}>🕐</Text>
          <View>
            <Text style={styles.toggleLabel}>
              {customTimeEnabled ? to12h(customTime) : 'Set a different time'}
            </Text>
            <Text style={styles.toggleSub}>
              {customTimeEnabled ? 'Tap to change' : 'Defaults to right now'}
            </Text>
          </View>
        </View>
        {/* Pill toggle */}
        <View style={[styles.pill, customTimeEnabled && styles.pillActive]}>
          <View style={[styles.pillThumb, customTimeEnabled && styles.pillThumbActive]} />
        </View>
      </TouchableOpacity>

      {/* Time picker panel */}
      {customTimeEnabled && (
        <View style={styles.pickerCard}>
          <TouchableOpacity
            style={styles.displayRow}
            onPress={() => setShowPicker(!showPicker)}
            activeOpacity={0.8}
          >
            <Text style={styles.timeDisplay}>{to12h(customTime)}</Text>
            <Text style={styles.editHint}>{showPicker ? 'Close ▲' : 'Edit ▼'}</Text>
          </TouchableOpacity>

          {showPicker && (
            Platform.OS === 'web'
              ? /* ── Web: native <input type="time"> ── */
                <WebTimePicker value={customTime} onChange={setCustomTime} />
              : /* ── Native: HH MM steppers ── */
                <NativeTimePicker
                  h={h}
                  m={m}
                  adjustH={adjustH}
                  adjustM={adjustM}
                />
          )}
        </View>
      )}
    </View>
  );
}

/* ───────────────────────────────────────────
   Web picker — renders an <input type="time">
─────────────────────────────────────────── */
function WebTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  // React Native Web lets us render raw HTML elements when Platform.OS === 'web'
  // We use the React createElement trick so TS doesn't complain in RN context
  if (Platform.OS !== 'web') return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const input = React.createElement('input', {
    type: 'time',
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    style: {
      fontSize: 28,
      fontWeight: '800',
      color: '#6B21A8',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      cursor: 'pointer',
      width: '100%',
      textAlign: 'center',
      padding: '8px 0',
      fontFamily: 'inherit',
    },
  } as unknown as React.InputHTMLAttributes<HTMLInputElement>);

  return (
    <View style={styles.webPickerWrap}>
      {input}
    </View>
  );
}

/* ─────────────────────────────────────────────────
   Native picker — H/M steppers with wrap-around
───────────────────────────────────────────────── */
function NativeTimePicker({
  h,
  m,
  adjustH,
  adjustM,
}: {
  h: number;
  m: number;
  adjustH: (d: number) => void;
  adjustM: (d: number) => void;
}) {
  const period = h >= 12 ? 'PM' : 'AM';

  return (
    <View style={styles.nativePicker}>
      {/* Hours */}
      <View style={styles.drumColumn}>
        <TouchableOpacity onPress={() => adjustH(1)} style={styles.drumArrow}>
          <Text style={styles.drumArrowText}>▲</Text>
        </TouchableOpacity>
        <View style={styles.drumCell}>
          <Text style={styles.drumValue}>
            {String(h % 12 === 0 ? 12 : h % 12).padStart(2, '0')}
          </Text>
        </View>
        <TouchableOpacity onPress={() => adjustH(-1)} style={styles.drumArrow}>
          <Text style={styles.drumArrowText}>▼</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.colon}>:</Text>

      {/* Minutes */}
      <View style={styles.drumColumn}>
        <TouchableOpacity onPress={() => adjustM(5)} style={styles.drumArrow}>
          <Text style={styles.drumArrowText}>▲</Text>
        </TouchableOpacity>
        <View style={styles.drumCell}>
          <Text style={styles.drumValue}>{String(m).padStart(2, '0')}</Text>
        </View>
        <TouchableOpacity onPress={() => adjustM(-5)} style={styles.drumArrow}>
          <Text style={styles.drumArrowText}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* AM / PM toggle */}
      <View style={styles.periodColumn}>
        {(['AM', 'PM'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => {
              if (p === 'AM' && h >= 12) adjustH(-12);
              if (p === 'PM' && h < 12) adjustH(12);
            }}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },

  /* Toggle */
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#F8F6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9DFFE',
    marginBottom: 8,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clockIcon: { fontSize: 16 },
  toggleLabel: { fontSize: 13, fontWeight: '700', color: C.ink },
  toggleSub: { fontSize: 10, fontWeight: '600', color: C.muted, marginTop: 1 },

  /* Pill switch */
  pill: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    padding: 2,
  },
  pillActive: { backgroundColor: C.purple },
  pillThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  pillThumbActive: { alignSelf: 'flex-end' },

  /* Picker card */
  pickerCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    shadowColor: C.purple,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timeDisplay: {
    fontSize: 26,
    fontWeight: '800',
    color: C.purpleDark,
    letterSpacing: -0.5,
  },
  editHint: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
  },

  /* Web picker */
  webPickerWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },

  /* Native drum-scroll picker */
  nativePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 4,
  },
  drumColumn: {
    alignItems: 'center',
    minWidth: 72,
  },
  drumArrow: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  drumArrowText: {
    fontSize: 16,
    color: C.muted,
    fontWeight: '700',
  },
  drumCell: {
    width: 72,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#F5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
  },
  drumValue: {
    fontSize: 32,
    fontWeight: '800',
    color: C.purpleDark,
    fontVariant: ['tabular-nums'],
  },
  colon: {
    fontSize: 32,
    fontWeight: '800',
    color: C.purpleDark,
    marginBottom: 4,
    marginHorizontal: 4,
  },
  periodColumn: {
    gap: 8,
    marginLeft: 12,
  },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  periodBtnActive: {
    backgroundColor: C.purple,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.muted,
  },
  periodTextActive: {
    color: '#FFF',
  },
});
