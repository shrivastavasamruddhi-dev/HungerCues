import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../../../constants/colors';
import { formatEventTime } from '../../../utils/date';
import { SectionTitle } from '../../../components/SectionTitle';
import { EmptyState } from '../../../components/EmptyState';
import type { TimelineEvent } from '../../../types';

interface Props {
  recent: TimelineEvent[];
  onPress: () => void;
}

export function RecentActivityList({ recent, onPress }: Props) {
  const displayedEvents = recent.slice(0, 3);

  return (
    <View style={{ marginTop: 8 }}>
      <SectionTitle>Recent activity</SectionTitle>

      {displayedEvents.length === 0 ? (
        <EmptyState title="No activity yet" description="Use Quick Log to save the first moment." />
      ) : (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.containerCard}>
          {displayedEvents.map((event, index) => (
            <View key={event.id}>
              {index > 0 && <View style={styles.divider} />}
              <View style={styles.eventRow}>
                <View style={styles.eventIcon}>
                  <Text style={styles.purpleText}>{event.icon}</Text>
                </View>
                <View style={styles.eventBody}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventMeta}>
                    {formatEventTime(event.occurredAt)} · {event.note}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>View Full History</Text>
            <Text style={styles.footerArrow}>→</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  containerCard: {
    borderRadius: 24,
    backgroundColor: C.card,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  eventRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },
  eventIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventBody: { marginLeft: 12, flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '700' },
  eventMeta: { fontSize: 10, color: C.muted, marginTop: 4 },
  purpleText: { color: C.purpleDark },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  footerText: {
    fontSize: 12,
    color: C.purple,
    fontWeight: '700',
  },
  footerArrow: {
    fontSize: 14,
    color: C.purple,
    fontWeight: '800',
    marginLeft: 4,
  },
});
