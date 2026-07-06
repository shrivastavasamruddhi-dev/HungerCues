import React, { useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { C } from '../../constants/colors';
import { StatCard } from '../../components/StatCard';
import { useGrowthLog } from '../../hooks/useGrowthLog';
import { GrowthChart } from './components/GrowthChart';
import { GrowthEntryList } from './components/GrowthEntryList';
import { LogGrowthModal } from './components/LogGrowthModal';
import { MilestonesScreen } from '../milestones/MilestonesScreen';
import type { Baby, GrowthRecord } from '../../types';

interface Props {
  baby: Baby | null;
  growth: GrowthRecord[];
  unitSystem: 'metric' | 'imperial';
  setUnitSystem: (value: 'metric' | 'imperial') => void;
  onRefreshData: () => void;
}

export function GrowthScreen({ baby, growth, unitSystem, setUnitSystem, onRefreshData }: Props) {
  const [subTab, setSubTab] = useState<'metrics' | 'milestones'>('metrics');
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
    <View style={styles.container}>
      {/* ── Header row: title + unit toggle chip ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Growth</Text>
        <View style={styles.unitToggle}>
          <TouchableOpacity
            style={[styles.unitChip, unitSystem === 'metric' && styles.unitChipActive]}
            onPress={() => setUnitSystem('metric')}
            accessibilityRole="button"
            accessibilityLabel="Switch to metric units"
            accessibilityState={{ selected: unitSystem === 'metric' }}
          >
            <Text style={[styles.unitChipText, unitSystem === 'metric' && styles.unitChipTextActive]}>
              kg / cm
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitChip, unitSystem === 'imperial' && styles.unitChipActive]}
            onPress={() => setUnitSystem('imperial')}
            accessibilityRole="button"
            accessibilityLabel="Switch to imperial units"
            accessibilityState={{ selected: unitSystem === 'imperial' }}
          >
            <Text style={[styles.unitChipText, unitSystem === 'imperial' && styles.unitChipTextActive]}>
              lbs / in
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Sub-tab Switcher: Metrics vs Milestones ── */}
      <View style={styles.subTabRow}>
        <TouchableOpacity
          style={[styles.subTabButton, subTab === 'metrics' && styles.subTabButtonActive]}
          onPress={() => setSubTab('metrics')}
          accessibilityRole="tab"
          accessibilityState={{ selected: subTab === 'metrics' }}
        >
          <Text style={[styles.subTabText, subTab === 'metrics' && styles.subTabTextActive]}>
            Metrics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTabButton, subTab === 'milestones' && styles.subTabButtonActive]}
          onPress={() => setSubTab('milestones')}
          accessibilityRole="tab"
          accessibilityState={{ selected: subTab === 'milestones' }}
        >
          <Text style={[styles.subTabText, subTab === 'milestones' && styles.subTabTextActive]}>
            Milestones
          </Text>
        </TouchableOpacity>
      </View>

      {subTab === 'metrics' ? (
        <>
          {/* Hero title */}
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

          {/* Entry history */}
          <GrowthEntryList
            sorted={sorted}
            displayWeight={displayWeight}
            displayHeight={displayHeight}
          />

          {/* Bottom spacing for sticky footer */}
          <View style={{ height: 100 }} />

          {/* ── Sticky footer: Log Growth Entry ── */}
          <View style={styles.stickyFooter}>
            <TouchableOpacity
              style={styles.logButton}
              onPress={() => setShowModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Log a new growth entry"
              accessibilityHint="Opens a form to record weight and height"
            >
              <Text style={styles.logButtonText}>＋  Log Growth Entry</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <MilestonesScreen baby={baby} hideHeader={true} />
      )}

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
  container: {
    flex: 1,
    paddingBottom: 0,
  },
  // ── Custom header ──
  header: {
    height: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingLeft: 18,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 26,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  headerTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '700',
  },
  // ── Unit toggle pill ──
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  unitChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 17,
  },
  unitChipActive: {
    backgroundColor: '#7C3AED',
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  unitChipTextActive: {
    color: '#FFFFFF',
  },
  heroTitle: {
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: -0.7,
    marginBottom: 20,
  },
  // ── Sticky footer ──
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: '#FAF5FF',
    borderTopWidth: 1,
    borderTopColor: '#E9D5FF',
  },
  logButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  logButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  // ── Segmented sub-tabs ──
  subTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  subTabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  subTabTextActive: {
    color: '#7C3AED',
  },
});
