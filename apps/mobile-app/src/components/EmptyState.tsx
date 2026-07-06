import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { C, Colors } from '../constants/colors';

interface Props {
  title: string;
  description: string;
  /** Emoji or short text to display in the illustration circle. */
  icon?: string;
  /** Optional label for a primary call-to-action button. */
  ctaLabel?: string;
  /** Called when the CTA button is tapped. */
  onCta?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ title, description, icon, ctaLabel, onCta, style }: Props) {
  return (
    <View style={[styles.card, style]}>
      {icon ? (
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      ) : null}

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {ctaLabel && onCta ? (
        <TouchableOpacity
          style={styles.cta}
          onPress={onCta}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 32,
    borderRadius: 24,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle border to distinguish from background
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    color: C.ink,
    fontWeight: '800',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    color: C.muted,
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
  },
  cta: {
    marginTop: 20,
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 22,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    // Brand shadow
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  ctaText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
});

