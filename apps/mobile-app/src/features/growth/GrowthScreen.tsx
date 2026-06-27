import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../../constants/colors';
import { Header } from '../../components/Header';
import { StatCard } from '../../components/StatCard';
import { useGrowthLog } from '../../hooks/useGrowthLog';
import { GrowthChart } from './components/GrowthChart';
import { GrowthEntryList } from './components/GrowthEntryList';
import { LogGrowthModal } from './components/LogGrowthModal';
import type { Baby, GrowthRecord } from '../../types';

interface Props {
  baby: Baby | null;
  growth: GrowthRecord[];
  unitSystem: 'metric' | 'imperial';
  setUnitSystem: (value: 'metric' | 'imperial') => void;
  onRefreshData: () => void;
}

export function GrowthScreen({ baby, growth, unitSystem, setUnitSystem, onRefreshData }: Props) {
  const sorted = useMemo(
    () => [...growth].sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at)),
    [growth],
  );
  const latest = sorted[sorted.length - 1] ?? null;
  const previous = sorted[sorted.length - 2] ?? null;

  const {
    showModal,
    setShowModal,
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
    handleSubmit,
  } = useGrowthLog({ baby, unitSystem, onRefreshData });

  const displayWeight = (kg: number | null | undefined) => {
    if (kg == null) return '—';
    return unitSystem === 'metric' ? `${kg.toFixed(2)} kg` : `${(kg * 2.20462).toFixed(2)} lbs`;
  };
  const displayHeight = (cm: number | null | undefined) => {
    if (cm == null) return '—';
    return unitSystem === 'metric' ? `${cm.toFixed(1)} cm` : `${(cm / 2.54).toFixed(1)} in`;
  };

  const latestWeightDelta = () => {
    if (!latest?.weight_kg || !previous?.weight_kg) return null;
    const diff = latest.weight_kg - previous.weight_kg;
    return unitSystem === 'metric'
      ? `${diff > 0 ? '+' : ''}${diff.toFixed(2)} kg`
      : `${diff > 0 ? '+' : ''}${(diff * 2.20462).toFixed(2)} lbs`;
  };

  const latestHeightDelta = () => {
    if (!latest?.height_cm || !previous?.height_cm) return null;
    const diff = latest.height_cm - previous.height_cm;
    return unitSystem === 'metric'
      ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)} cm`
      : `${diff > 0 ? '+' : ''}${(diff / 2.54).toFixed(1)} in`;
  };

  return (
    <View style={{ paddingBottom: 40 }}>
      <Header title="Growth" action="⚖" />
      <Text style={styles.heroTitle}>
        {baby ? `${baby.name}'s` : 'Baby'}
        {'\n'}Growth Journey
      </Text>

      {/* Summary stat cards */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
        <StatCard
          label="WEIGHT"
          value={displayWeight(latest?.weight_kg)}
          subtitle={latestWeightDelta() ? `${latestWeightDelta()} since last` : null}
        />
        <StatCard
          label="HEIGHT"
          value={displayHeight(latest?.height_cm)}
          subtitle={latestHeightDelta() ? `${latestHeightDelta()} since last` : null}
        />
      </View>

      {/* Bar chart */}
      <GrowthChart
        sorted={sorted}
        unitSystem={unitSystem}
        displayWeight={displayWeight}
        displayHeight={displayHeight}
      />

      {/* Log button */}
      <TouchableOpacity style={styles.logButton} onPress={() => setShowModal(true)}>
        <Text style={styles.logButtonText}>+ Log Growth Entry</Text>
      </TouchableOpacity>

      {/* Entry history */}
      <GrowthEntryList
        sorted={sorted}
        displayWeight={displayWeight}
        displayHeight={displayHeight}
      />

      {/* Log Modal */}
      <LogGrowthModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        unitSystem={unitSystem}
        setUnitSystem={setUnitSystem}
        weight={weight}
        setWeight={setWeight}
        height={height}
        setHeight={setHeight}
        notes={notes}
        setNotes={setNotes}
        customDateStr={customDateStr}
        setCustomDateStr={setCustomDateStr}
        saving={saving}
        logError={logError}
        onSubmit={() => void handleSubmit()}
      />
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
  logButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  logButtonText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
