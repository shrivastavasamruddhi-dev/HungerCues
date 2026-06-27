import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { C } from '../../constants/colors';
import { Header } from '../../components/Header';
import { growthService } from '../../services/growthService';
import type { Baby, GrowthRecord } from '../../types';

interface Props {
  baby: Baby | null;
  growth: GrowthRecord[];
  unitSystem: 'metric' | 'imperial';
  setUnitSystem: (value: 'metric' | 'imperial') => void;
  onRefreshData: () => void;
}

export function GrowthScreen({ baby, growth, unitSystem, setUnitSystem, onRefreshData }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [notes, setNotes] = useState('');
  const [customDateStr, setCustomDateStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const [chartMetric, setChartMetric] = useState<'weight' | 'height'>('weight');

  const sorted = useMemo(
    () => [...growth].sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at)),
    [growth],
  );

  const latest = sorted[sorted.length - 1] ?? null;
  const previous = sorted[sorted.length - 2] ?? null;

  useEffect(() => {
    if (showModal) {
      setWeight('');
      setHeight('');
      setNotes('');
      setLogError(null);
      const d = new Date();
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      setCustomDateStr(`${dd}/${mm}/${yyyy}`);
    }
  }, [showModal]);

  const displayWeight = (kg: number | null | undefined) => {
    if (kg == null) return '—';
    return unitSystem === 'metric' ? `${kg.toFixed(2)} kg` : `${(kg * 2.20462).toFixed(2)} lbs`;
  };
  const displayHeight = (cm: number | null | undefined) => {
    if (cm == null) return '—';
    return unitSystem === 'metric' ? `${cm.toFixed(1)} cm` : `${(cm / 2.54).toFixed(1)} in`;
  };

  const parseDateString = (str: string): Date | null => {
    const parts = str.trim().split('/');
    if (parts.length !== 3) return null;
    const day = Number(parts[0]);
    const month = Number(parts[1]) - 1; // 0-indexed month
    const year = Number(parts[2]);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31 || month < 0 || month > 11 || year < 2000 || year > 2100) {
      return null;
    }
    const d = new Date(year, month, day, 12, 0, 0, 0); // midday to avoid timezone shifts
    if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) {
      return null;
    }
    return d;
  };

  const handleSubmit = async () => {
    if (!baby || saving) return;
    setSaving(true);
    setLogError(null);
    let w_kg: number | null = null;
    let h_cm: number | null = null;
    if (weight.trim()) {
      const w_val = Number(weight);
      if (isNaN(w_val) || w_val <= 0) {
        setLogError('Weight must be a valid positive number');
        setSaving(false);
        return;
      }
      w_kg = unitSystem === 'metric' ? w_val : w_val / 2.20462;
    }
    if (height.trim()) {
      const h_val = Number(height);
      if (isNaN(h_val) || h_val <= 0) {
        setLogError('Height must be a valid positive number');
        setSaving(false);
        return;
      }
      h_cm = unitSystem === 'metric' ? h_val : h_val * 2.54;
    }
    if (w_kg === null && h_cm === null) {
      setLogError('Please enter at least one metric (weight or height).');
      setSaving(false);
      return;
    }
    const parsedDate = parseDateString(customDateStr);
    if (!parsedDate) {
      setLogError('Please enter a valid date in DD/MM/YYYY format');
      setSaving(false);
      return;
    }
    const growthTime = parsedDate;
    try {
      await growthService.createGrowth({
        baby_id: baby.id,
        recorded_at: growthTime.toISOString(),
        weight_kg: w_kg,
        height_cm: h_cm,
        notes: notes || null,
      });
      setShowModal(false);
      onRefreshData();
    } catch {
      setLogError('Could not save growth entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Build chart data from sorted records
  const chartData = useMemo(() => {
    const relevant = sorted.filter((r) =>
      chartMetric === 'weight' ? r.weight_kg != null : r.height_cm != null,
    );
    return relevant.slice(-8); // show last 8 entries
  }, [sorted, chartMetric]);

  const chartValues = chartData.map((r) =>
    chartMetric === 'weight' ? (r.weight_kg ?? 0) : (r.height_cm ?? 0),
  );
  const maxVal = Math.max(...chartValues, 0.01);
  const minVal = Math.min(...chartValues, 0);
  const range = maxVal - minVal || 1;
  const BAR_HEIGHT = 120;

  const formatChartLabel = (r: GrowthRecord) => {
    const d = new Date(r.recorded_at);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const latestWeightDelta = () => {
    if (!latest?.weight_kg || !previous?.weight_kg) return null;
    const diff = latest.weight_kg - previous.weight_kg;
    const diffDisplay =
      unitSystem === 'metric'
        ? `${diff > 0 ? '+' : ''}${diff.toFixed(2)} kg`
        : `${diff > 0 ? '+' : ''}${(diff * 2.20462).toFixed(2)} lbs`;
    return diffDisplay;
  };

  const latestHeightDelta = () => {
    if (!latest?.height_cm || !previous?.height_cm) return null;
    const diff = latest.height_cm - previous.height_cm;
    const diffDisplay =
      unitSystem === 'metric'
        ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)} cm`
        : `${diff > 0 ? '+' : ''}${(diff / 2.54).toFixed(1)} in`;
    return diffDisplay;
  };

  return (
    <View style={{ paddingBottom: 40 }}>
      <Header title="Growth" action="⚖" />
      <Text style={styles.heroTitle}>
        {baby ? `${baby.name}'s` : 'Baby'}
        {'\n'}Growth Journey
      </Text>

      {/* Summary cards */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
        <View style={styles.insightMini}>
          <Text style={styles.insightMiniLabel}>WEIGHT</Text>
          <Text style={styles.insightMiniValue}>{displayWeight(latest?.weight_kg)}</Text>
          {latestWeightDelta() && (
            <Text style={styles.deltaText}>{latestWeightDelta()} since last</Text>
          )}
        </View>
        <View style={styles.insightMini}>
          <Text style={styles.insightMiniLabel}>HEIGHT</Text>
          <Text style={styles.insightMiniValue}>{displayHeight(latest?.height_cm)}</Text>
          {latestHeightDelta() && (
            <Text style={styles.deltaText}>{latestHeightDelta()} since last</Text>
          )}
        </View>
      </View>

      {/* Chart section */}
      <View style={styles.chartContainer}>
        {/* Toggle weight/height chart */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['weight', 'height'] as const).map((metric) => (
            <TouchableOpacity
              key={metric}
              onPress={() => setChartMetric(metric)}
              style={[styles.chartToggleBtn, chartMetric === metric && styles.chartToggleBtnActive]}
            >
              <Text
                style={[
                  styles.chartToggleText,
                  chartMetric === metric && styles.chartToggleTextActive,
                ]}
              >
                {metric === 'weight' ? `⚖ Weight` : `↕ Height`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {chartData.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 30 }}>
            <Text style={{ fontSize: 32, marginBottom: 10 }}>📏</Text>
            <Text style={{ fontSize: 14, color: C.muted, textAlign: 'center' }}>
              No {chartMetric} data yet.{'\n'}Log your first entry below.
            </Text>
          </View>
        ) : (
          <View>
            {/* Y-axis max */}
            <Text style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>
              {chartMetric === 'weight' ? displayWeight(maxVal) : displayHeight(maxVal)}
            </Text>
            {/* Bars */}
            <View style={styles.barsContainer}>
              {chartData.map((r, i) => {
                const val = chartMetric === 'weight' ? (r.weight_kg ?? 0) : (r.height_cm ?? 0);
                const barH = Math.max(4, ((val - minVal) / range) * BAR_HEIGHT);
                const isLatest = i === chartData.length - 1;
                return (
                  <View key={r.id} style={{ flex: 1, alignItems: 'center' }}>
                    {isLatest && (
                      <Text style={styles.latestBarVal}>
                        {chartMetric === 'weight' ? displayWeight(val) : displayHeight(val)}
                      </Text>
                    )}
                    <View style={[styles.bar, { height: barH }, isLatest && styles.barLatest]} />
                  </View>
                );
              })}
            </View>
            {/* X-axis labels */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {chartData.map((r) => (
                <Text key={r.id} style={styles.chartLabel}>
                  {formatChartLabel(r)}
                </Text>
              ))}
            </View>
            {/* Y-axis min */}
            <Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
              {chartMetric === 'weight' ? displayWeight(minVal) : displayHeight(minVal)}
            </Text>
          </View>
        )}
      </View>

      {/* Log button */}
      <TouchableOpacity style={styles.logButton} onPress={() => setShowModal(true)}>
        <Text style={styles.logButtonText}>+ Log Growth Entry</Text>
      </TouchableOpacity>

      {/* Entry history */}
      {sorted.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>All Entries</Text>
          {[...sorted].reverse().map((r) => (
            <View key={r.id} style={styles.historyCard}>
              <View style={styles.historyIconCircle}>
                <Text style={{ fontSize: 20 }}>⚖</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>
                  {r.weight_kg != null ? displayWeight(r.weight_kg) : ''}
                  {r.weight_kg != null && r.height_cm != null ? ' · ' : ''}
                  {r.height_cm != null ? displayHeight(r.height_cm) : ''}
                </Text>
                <Text style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                  {new Date(r.recorded_at).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  {new Date(r.recorded_at).toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
                {r.notes && (
                  <Text style={{ fontSize: 11, color: '#666', marginTop: 2, fontStyle: 'italic' }}>
                    {r.notes}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {sorted.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No growth entries yet</Text>
          <Text style={styles.emptyCopy}>Tap the button above to log weight or height.</Text>
        </View>
      )}

      {/* Floating Log Modal */}
      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Log Growth Entry</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: C.muted, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Error banner */}
            {logError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{logError}</Text>
              </View>
            )}

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
              onPress={() => void handleSubmit()}
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
    </View>
  );
}

const styles = StyleSheet.create({
  heroTitle: {
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.7,
    marginBottom: 20,
  },
  insightMini: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 20,
  },
  insightMiniLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.muted,
    letterSpacing: 1,
    marginBottom: 6,
  },
  insightMiniValue: {
    fontSize: 22,
    fontWeight: '800',
    color: C.ink,
  },
  deltaText: {
    fontSize: 11,
    color: '#38B86A',
    fontWeight: '700',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: C.card,
    borderRadius: 26,
    padding: 18,
    marginBottom: 20,
  },
  chartToggleBtn: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDEDEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartToggleBtnActive: {
    backgroundColor: C.purple,
  },
  chartToggleText: {
    color: C.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  chartToggleTextActive: {
    color: '#FFF',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 6,
    marginBottom: 6,
  },
  latestBarVal: {
    fontSize: 9,
    fontWeight: '700',
    color: C.purpleDark,
    marginBottom: 2,
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: '#DDB8EE',
  },
  barLatest: {
    backgroundColor: C.purple,
  },
  chartLabel: {
    flex: 1,
    fontSize: 9,
    color: C.muted,
    textAlign: 'center',
  },
  logButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  logButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 21,
    lineHeight: 25,
    color: C.ink,
    fontWeight: '800',
    marginBottom: 18,
  },
  historyCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 22,
    backgroundColor: C.card,
    alignItems: 'center',
    marginTop: 24,
  },
  emptyTitle: {
    color: C.ink,
    fontWeight: '800',
    fontSize: 16,
  },
  emptyCopy: {
    color: C.muted,
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
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
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.ink,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 10,
    marginBottom: 15,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  inputLabel: {
    color: '#555',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
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
  segmentActive: {
    backgroundColor: C.purple,
  },
  segmentText: {
    color: C.muted,
    fontSize: 15,
  },
  whiteText: {
    color: '#FFF',
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formField: {
    flex: 1,
  },
  input: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F4F4F4',
    paddingHorizontal: 14,
    color: C.ink,
    fontSize: 14,
    marginBottom: 12,
  },
  notesInput: {
    width: '100%',
    marginBottom: 20,
  },
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
  modalSubmitButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
