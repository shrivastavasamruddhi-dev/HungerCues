import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { C } from '../constants/colors';
import { api } from '../api';
import type { Activity, Baby, FeedType } from '../types';
import { getCustomDateTime, parseDurationHHMM } from '../utils/date';

// Reuse the existing forms
import { FeedForm } from '../features/log/components/FeedForm';
import { SleepForm } from '../features/log/components/SleepForm';
import { DiaperForm } from '../features/log/components/DiaperForm';

interface Props {
  visible: boolean;
  activity: Activity;
  baby: Baby | null;
  onClose: () => void;
  onSaved: (kind: 'feed' | 'sleep' | 'diaper', id: number) => void;
}

export function QuickLogModal({ visible, activity, baby, onClose, onSaved }: Props) {
  // Local Form State
  const [subtype, setSubtype] = useState('');
  const [feedType, setFeedType] = useState<FeedType>('Breast');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [breastSide, setBreastSide] = useState<'Left' | 'Right'>('Left');
  const [customTimeEnabled, setCustomTimeEnabled] = useState(false);
  const [customTime, setCustomTime] = useState('');
  
  // Sleep-specific manual states
  const [sleepTrackingMode, setSleepTrackingMode] = useState<'timer' | 'manual'>('manual');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form defaults based on active activity and type
  useEffect(() => {
    if (!visible) return;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setCustomTime(`${hh}:${mm}`);
    setCustomTimeEnabled(false);
    setNotes('');
    setBreastSide('Left');
    setError(null);

    if (activity === 'feed') {
      setSubtype('Breast');
      setFeedType('Breast');
      setAmount('120');
      setDuration('15');
    } else if (activity === 'sleep') {
      setSubtype('Nap');
      setDuration('01:00');
      setSleepTrackingMode('manual');
    } else if (activity === 'diaper') {
      setSubtype('Wet');
    }
  }, [visible, activity]);

  const handleSave = async () => {
    if (!baby || saving) return;
    setSaving(true);
    setError(null);
    const now = new Date();

    try {
      if (activity === 'feed') {
        let startTime = now;
        if (customTimeEnabled) {
          const customDate = getCustomDateTime(customTime);
          if (!customDate) {
            setError('Please enter a valid time in HH:MM format (e.g. 14:30)');
            setSaving(false);
            return;
          }
          startTime = customDate;
        }

        const isSolid = subtype === 'Solid';
        const res = await api.createFeeding({
          baby_id: baby.id,
          type: subtype.toLowerCase(),
          start_time: startTime.toISOString(),
          duration_minutes: isSolid ? 0 : (Number(duration) || 15),
          quantity_ml: isSolid ? (Number(amount) || 1) : (subtype === 'Bottle' ? Number(amount) || 120 : null),
          breast_side: subtype === 'Breast' ? breastSide : null,
          notes: notes || null,
        });

        onSaved('feed', res.id);
      } else if (activity === 'sleep') {
        const isNightSleep = subtype === 'Night';
        const minutes = parseDurationHHMM(duration);
        if (minutes === null) {
          setError('Please enter sleep duration in HH:MM format (e.g. 01:30)');
          setSaving(false);
          return;
        }
        let startTime = new Date(now.getTime() - minutes * 60_000);
        if (customTimeEnabled) {
          const customDate = getCustomDateTime(customTime);
          if (!customDate) {
            setError('Please enter a valid time in HH:MM format (e.g. 14:30)');
            setSaving(false);
            return;
          }
          startTime = customDate;
        }
        const endTime = new Date(startTime.getTime() + minutes * 60_000);
        const res = await api.createSleep({
          baby_id: baby.id,
          sleep_start: startTime.toISOString(),
          sleep_end: endTime.toISOString(),
          duration_minutes: minutes,
          tracking_method: isNightSleep ? 'night' : 'manual',
          notes: notes || null,
        });

        onSaved('sleep', res.id);
      } else if (activity === 'diaper') {
        let changeTime = now;
        if (customTimeEnabled) {
          const customDate = getCustomDateTime(customTime);
          if (!customDate) {
            setError('Please enter a valid time in HH:MM format (e.g. 14:30)');
            setSaving(false);
            return;
          }
          changeTime = customDate;
        }
        const res = await api.createDiaper({
          baby_id: baby.id,
          changed_at: changeTime.toISOString(),
          type: subtype.toLowerCase(),
          notes: notes || null,
        });

        onSaved('diaper', res.id);
      }

      onClose();
    } catch {
      setError('Cannot save entry. Please check the backend connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const getSubtypeOptions = () => {
    if (activity === 'feed') return ['Breast', 'Bottle', 'Solid'];
    if (activity === 'sleep') return ['Nap', 'Night', 'Rest'];
    return ['Wet', 'Poopy', 'Mixed'];
  };

  const getActivityTitle = () => {
    if (activity === 'feed') return 'Feeding';
    if (activity === 'sleep') return 'Sleep';
    return 'Diaper';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log {getActivityTitle()}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Type selector row */}
            <Text style={styles.sectionLabel}>{getActivityTitle()} Type</Text>
            <View style={styles.typeRow}>
              {getSubtypeOptions().map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => {
                    setSubtype(opt);
                    if (activity === 'feed') setFeedType(opt as FeedType);
                  }}
                  style={[styles.typeCard, subtype === opt && styles.typeCardActive]}
                >
                  <Text style={[styles.typeLabel, subtype === opt && styles.typeLabelActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Form Fields wrapper */}
            <View style={styles.formCard}>
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
                  onLog={handleSave}
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
                  activeSleepStart={null}
                  setActiveSleepStart={() => {}}
                  elapsedSeconds={0}
                  formatElapsed={() => '00:00:00'}
                  customTimeEnabled={customTimeEnabled}
                  setCustomTimeEnabled={setCustomTimeEnabled}
                  customTime={customTime}
                  setCustomTime={setCustomTime}
                  duration={duration}
                  setDuration={setDuration}
                  notes={notes}
                  setNotes={setNotes}
                  saving={saving}
                  onLog={handleSave}
                />
              )}

              {activity === 'diaper' && (
                <DiaperForm
                  notes={notes}
                  setNotes={setNotes}
                  saving={saving}
                  onLog={handleSave}
                  customTimeEnabled={customTimeEnabled}
                  setCustomTimeEnabled={setCustomTimeEnabled}
                  customTime={customTime}
                  setCustomTime={setCustomTime}
                />
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.canvas,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
    minHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: C.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.ink,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    color: C.muted,
    fontWeight: '700',
  },
  formContainer: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.muted,
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  typeCard: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  typeCardActive: {
    borderWidth: 1.5,
    borderColor: C.purple,
    backgroundColor: '#F7EEFC',
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.ink,
  },
  typeLabelActive: {
    color: C.purpleDark,
  },
  formCard: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
    marginBottom: 30,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
