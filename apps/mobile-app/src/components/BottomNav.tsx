import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../constants/colors';
import type { Tab } from '../types';

const TAB_CONFIG: { key: Tab; emoji: string; label: string }[] = [
  { key: 'home',       emoji: '🏠', label: 'Home'       },
  { key: 'history',    emoji: '🕐', label: 'History'    },
  { key: 'growth',     emoji: '📈', label: 'Growth'     },
  { key: 'insights',   emoji: '💡', label: 'Insights'   },
  { key: 'milestones', emoji: '🎯', label: 'Milestones' },
];

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
  /** When non-null the Home tab shows a pulsing indicator */
  activeSleepStart?: string | null;
}

export function BottomNav({ active, onChange, activeSleepStart }: Props) {
  return (
    <View style={styles.navWrap}>
      <View style={styles.nav}>
        {TAB_CONFIG.map((item) => {
          const isActive = active === item.key;
          const showSleepDot = item.key === 'home' && activeSleepStart != null;
          return (
            <TouchableOpacity
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => onChange(item.key)}
              style={styles.navItem}
            >
              {/* Icon container so we can overlay the sleep dot */}
              <View style={styles.iconWrap}>
                <Text style={[styles.navIcon, isActive && styles.navIconActive]}>
                  {item.emoji}
                </Text>
                {showSleepDot && <View style={styles.sleepDot} />}
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
              {/* Active indicator pill */}
              {isActive && <View style={styles.activePill} />}
            </TouchableOpacity>
          );
        })}
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
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: 20,
    opacity: 0.45,
  },
  navIconActive: {
    opacity: 1,
    fontSize: 22,
  },
  navLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 3,
    letterSpacing: 0.2,
  },
  navLabelActive: {
    color: C.purpleDark,
    fontWeight: '800',
  },
  activePill: {
    position: 'absolute',
    bottom: -4,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.purple,
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
});
