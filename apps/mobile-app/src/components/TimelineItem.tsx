import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '../constants/colors';

interface TimelineItemProps {
  icon: string;
  title: string;
  meta: string;
  /** Optional trailing element (restore button, checkmark, etc.) */
  trailing?: React.ReactNode;
  /** Override card border/background e.g. for selection state */
  cardStyle?: object;
}

export function TimelineItem({ icon, title, meta, trailing, cardStyle }: TimelineItemProps) {
  return (
    <View style={[styles.eventCard, cardStyle]}>
      <View style={styles.eventIcon}>
        <Text style={styles.purpleText}>{icon}</Text>
      </View>
      <View style={styles.eventBody}>
        <Text style={styles.eventTitle}>{title}</Text>
        <Text style={styles.eventMeta}>{meta}</Text>
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  eventCard: {
    minHeight: 72,
    borderRadius: 20,
    backgroundColor: C.card,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventBody: { marginLeft: 12, flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '700' },
  eventMeta: { fontSize: 10, color: C.muted, marginTop: 4 },
  purpleText: { color: C.purpleDark },
});
