import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Vibration,
  Animated,
} from 'react-native';
import { C } from '../constants/colors';
import { api } from '../api';
import type { Activity, Baby, FeedType } from '../types';
import { getCustomDateTime, parseDurationHHMM } from '../utils/date';

// Reuse the existing forms
import { FeedForm } from '../features/log/components/FeedForm';
import { SleepForm } from '../features/log/components/SleepForm';
import { DiaperForm } from '../features/log/components/DiaperForm';

// Simple module-level cache for progressive form memory
const lastLoggedMemory = {
  feed: {
    subtype: 'Breast',
    amount: '120',
    duration: '15',
  },
  sleep: {
    subtype: 'Nap',
    duration: '01:00',
  },
  diaper: {
    subtype: 'Wet',
  },
};

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

  // Success state for micro-animation feedback
  const [successVisible, setSuccessVisible] = useState(false);
  const [successScale] = useState(() => new Animated.Value(0));

  // Initialize form defaults based on active activity and type
  useEffect(() => {
    if (!visible) {
      setSuccessVisible(false);
      successScale.setValue(0);
      return;
    }

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setCustomTime(`${hh}:${mm}`);
    setCustomTimeEnabled(false);
    setNotes('');
    setBreastSide('Left');
    setError(null);
    setSuccessVisible(false);
    successScale.setValue(0);

    if (activity === 'feed') {
      setSubtype(lastLoggedMemory.feed.subtype);
      setFeedType(lastLoggedMemory.feed.subtype as FeedType);
      setAmount(lastLoggedMemory.feed.amount);
      setDuration(lastLoggedMemory.feed.duration);
    } else if (activity === 'sleep') {
      setSubtype(lastLoggedMemory.sleep.subtype);
      setDuration(lastLoggedMemory.sleep.duration);
      setSleepTrackingMode('manual');
    } else if (activity === 'diaper') {
      setSubtype(lastLoggedMemory.diaper.subtype);
    }
  }, [visible, activity]);

  const handleSave = async () => {
    if (!baby || saving) return;
    setSaving(true);
    setError(null);
    const now = new Date();

    let savedId = 0;
    let savedKind: 'feed' | 'sleep' | 'diaper' = 'feed';

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

        savedId = res.id;
        savedKind = 'feed';
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

        savedId = res.id;
        savedKind = 'sleep';
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

        savedId = res.id;
        savedKind = 'diaper';
      }

      // Cache the saved values for progressive memory
      if (savedKind === 'feed') {
        lastLoggedMemory.feed.subtype = subtype;
        lastLoggedMemory.feed.amount = amount;
        lastLoggedMemory.feed.duration = duration;
      } else if (savedKind === 'sleep') {
        lastLoggedMemory.sleep.subtype = subtype;
        lastLoggedMemory.sleep.duration = duration;
      } else if (savedKind === 'diaper') {
        lastLoggedMemory.diaper.subtype = subtype;
      }

      // Success animation and double-tap haptic vibration
      Vibration.vibrate([0, 15, 30, 15]);
      setSuccessVisible(true);
      Animated.spring(successScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: Platform.OS !== 'web',
      }).start();

      setTimeout(() => {
        onSaved(savedKind, savedId);
        onClose();
        setSuccessVisible(false);
        successScale.setValue(0);
      }, 950);
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
        <KeyboardAvoidingView
          style={styles.kavWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>Log {getActivityTitle()}</Text>
                {baby && (
                  <Text style={styles.modalSubtitle}>· {baby.name}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                accessibilityLabel="Close log modal"
                accessibilityRole="button"
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {successVisible ? (
              <Animated.View
                style={[
                  styles.successContainer,
                  { transform: [{ scale: successScale }] },
                ]}
              >
                <View style={styles.successIconCircle}>
                  <Text style={styles.successIconText}>✓</Text>
                </View>
                <Text style={styles.successTitle}>Activity Logged!</Text>
                <Text style={styles.successSubtitle}>
                  {getActivityTitle()} entry saved successfully
                </Text>
              </Animated.View>
            ) : (
              <>
                <ScrollView
                  style={styles.formContainer}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
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
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${opt}`}
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

                  {/* Bottom padding so last form field clears the sticky button */}
                  <View style={{ height: 20 }} />
                </ScrollView>

                {/* ── Sticky Save Footer ── always visible above keyboard */}
                <View style={styles.stickyFooter}>
                  <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={() => void handleSave()}
                    disabled={saving}
                    accessibilityRole="button"
                    accessibilityLabel={`Save ${getActivityTitle()} entry`}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save {getActivityTitle()}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  kavWrapper: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.canvas,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '92%',
    minHeight: '55%',
    paddingBottom: Platform.OS === 'ios' ? 0 : 0,
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
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.ink,
  },
  modalSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.muted,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    height: 56,
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
    marginBottom: 4,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  // ── Sticky save footer ──
  stickyFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: C.canvas,
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
  },
  saveButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.purple,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.55,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
  },
  // ── Success state overlay ──
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    minHeight: 250,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successIconText: {
    color: '#16A34A',
    fontSize: 32,
    fontWeight: '800',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.ink,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 13,
    color: C.muted,
    fontWeight: '600',
    textAlign: 'center',
  },
});
