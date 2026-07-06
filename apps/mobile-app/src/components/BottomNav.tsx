import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Home, Clock, Sparkles, TrendingUp, Plus } from 'lucide-react-native';
import { C, Colors } from '../constants/colors';
import type { Tab } from '../types';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
  /** When non-null the Home tab shows a pulsing indicator */
  activeSleepStart?: string | null;
  /** Callback for when the center Log FAB is pressed */
  onPressLogFAB?: () => void;
}

const TABS = [
  { key: 'home' as Tab, Icon: Home, label: 'Home' },
  { key: 'history' as Tab, Icon: Clock, label: 'History' },
  // Center: FAB (Plus)
  { key: 'insights' as Tab, Icon: Sparkles, label: 'Insights' },
  { key: 'growth' as Tab, Icon: TrendingUp, label: 'Growth' },
];

export function BottomNav({ active, onChange, activeSleepStart, onPressLogFAB }: Props) {
  const renderTabItem = (item: typeof TABS[number]) => {
    const isActive = active === item.key;
    const showSleepDot = item.key === 'home' && activeSleepStart != null;
    const Icon = item.Icon;

    return (
      <TouchableOpacity
        key={item.key}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        onPress={() => onChange(item.key)}
        style={styles.navItem}
      >
        <View style={styles.iconWrap}>
          <Icon
            size={22}
            color={isActive ? Colors.brand[500] : '#9CA3AF'}
            strokeWidth={isActive ? 2.5 : 2}
          />
          {showSleepDot && <View style={styles.sleepDot} />}
        </View>
        <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
          {item.label}
        </Text>
        {/* Active indicator pill */}
        {isActive && <View style={styles.activePill} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.navWrap}>
      <View style={styles.nav}>
        {/* Left Tabs: Home, History */}
        {TABS.slice(0, 2).map(renderTabItem)}

        {/* Center Log FAB */}
        <TouchableOpacity
          onPress={onPressLogFAB}
          style={styles.fabButton}
          accessibilityRole="button"
          accessibilityLabel="Quick log activity"
        >
          <View style={styles.fabCircle}>
            <Plus color="#FFF" size={24} strokeWidth={3} />
          </View>
          <Text style={styles.fabLabel}>Log</Text>
        </TouchableOpacity>

        {/* Right Tabs: Insights, Growth */}
        {TABS.slice(2).map(renderTabItem)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.75)',
    padding: 4,
    shadowColor: '#6B21A8',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  nav: {
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    position: 'relative',
    height: '100%',
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 3,
    letterSpacing: 0.2,
  },
  navLabelActive: {
    color: Colors.brand[700],
    fontWeight: '800',
  },
  activePill: {
    position: 'absolute',
    bottom: 4,
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.brand[500],
  },
  sleepDot: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  fabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },
  fabCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28, // Pulls the FAB circle above the nav bar line
    shadowColor: Colors.brand[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  fabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.brand[700],
    marginTop: 2,
  },
});

