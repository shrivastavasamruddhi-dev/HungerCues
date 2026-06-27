import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../../../constants/colors';
import { formatEventTime } from '../../../utils/date';
import { SectionTitle } from '../../../components/SectionTitle';
import { EmptyState } from '../../../components/EmptyState';
import type { TimelineEvent } from '../../../types';

interface Props {
  recent: TimelineEvent[];
  selectedIds: string[];
  handleLongPress: (id: string) => void;
  handlePress: (id: string) => void;
}

export function RecentActivityList({ recent, selectedIds, handleLongPress, handlePress }: Props) {
  return (
    <View style={{ marginTop: 8 }}>
      <SectionTitle>Recent activity</SectionTitle>
      {!recent.length && (
        <EmptyState title="No activity yet" description="Use Quick Log to save the first moment." />
      )}
      {recent.map((event) => {
        const isSelected = selectedIds.includes(event.id);
        return (
          <TouchableOpacity
            key={event.id}
            onLongPress={() => handleLongPress(event.id)}
            onPress={() => handlePress(event.id)}
            delayLongPress={500}
            activeOpacity={0.8}
            style={[
              styles.eventCard,
              {
                borderWidth: 2,
                borderColor: isSelected ? C.purple : 'transparent',
                backgroundColor: isSelected ? C.purpleSoft : C.card,
              },
            ]}
          >
            <View style={styles.eventIcon}>
              <Text style={styles.purpleText}>{event.icon}</Text>
            </View>
            <View style={styles.eventBody}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventMeta}>
                {formatEventTime(event.occurredAt)} · {event.note}
              </Text>
            </View>
            {isSelected && (
              <View style={{ marginLeft: 8, marginRight: 4 }}>
                <Text style={{ fontSize: 16, color: C.purpleDark, fontWeight: '900' }}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
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
