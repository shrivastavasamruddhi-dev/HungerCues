import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../constants/colors';
import type { Baby } from '../types';

interface Props {
  baby: Baby | null;
  onOpenSidebar: () => void;
}

export function BabyProfileCard({ baby, onOpenSidebar }: Props) {
  const getBabyAge = (birthDateString: string) => {
    try {
      const birthDate = new Date(birthDateString);
      const today = new Date();
      
      // Calculate difference in time
      const diffTime = Math.abs(today.getTime() - birthDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} old`;
      }
      
      const weeks = Math.floor(diffDays / 7);
      if (weeks < 8) {
        return `${weeks} week${weeks !== 1 ? 's' : ''} old`;
      }
      
      const months = Math.floor(diffDays / 30.44);
      if (months < 12) {
        const remainingWeeks = Math.floor((diffDays - (months * 30.44)) / 7);
        if (remainingWeeks > 0) {
          return `${months}m ${remainingWeeks}w old`;
        }
        return `${months} month${months !== 1 ? 's' : ''} old`;
      }
      
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays - (years * 365)) / 30.44);
      if (remainingMonths > 0) {
        return `${years}y ${remainingMonths}m old`;
      }
      return `${years} year${years !== 1 ? 's' : ''} old`;
    } catch {
      return '—';
    }
  };

  const getBabyAvatar = (gender: string) => {
    const g = gender.toLowerCase();
    if (g === 'boy' || g === 'male') return '👶';
    if (g === 'girl' || g === 'female') return '🎀';
    return '🧸';
  };

  if (!baby) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>Loading baby profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.leftSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>{getBabyAvatar(baby.gender)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{baby.name}</Text>
          <Text style={styles.ageText}>
            {getBabyAge(baby.birth_date)} • {baby.gender}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        accessibilityLabel="Open settings and profile menu"
        onPress={onOpenSidebar}
        style={styles.menuButton}
      >
        <Text style={styles.menuIcon}>☰</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F2F2F2',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  info: {
    justifyContent: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: C.ink,
  },
  ageText: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
    fontWeight: '600',
  },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 18,
    color: C.ink,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    width: '100%',
    paddingVertical: 10,
  },
});
