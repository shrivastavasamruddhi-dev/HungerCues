import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../constants/colors';
import type { Tab } from '../types';

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  const items: { key: Tab; icon: string; label: string }[] = [
    { key: 'home', icon: '⌂', label: 'Home' },
    { key: 'log', icon: '+', label: 'Log' },
    { key: 'growth', icon: '⚖', label: 'Growth' },
    { key: 'insights', icon: '▥', label: 'Insights' },
    { key: 'milestones', icon: '⚐', label: 'Goals' },
  ];

  return (
    <View style={styles.navWrap}>
      <View style={styles.nav}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={() => onChange(item.key)}
            style={styles.navItem}
          >
            <Text style={[styles.navIcon, active === item.key && styles.purpleText]}>
              {item.icon}
            </Text>
            <Text style={[styles.navLabel, active === item.key && styles.purpleText]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navWrap: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 20,
    padding: 5,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  nav: {
    height: 67,
    borderRadius: 32,
    backgroundColor: C.card,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 8,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIcon: { color: C.ink, fontSize: 23, fontWeight: '600', lineHeight: 25 },
  navLabel: { color: C.ink, fontSize: 10, marginTop: 3, fontWeight: '600' },
  purpleText: { color: C.purpleDark },
});
