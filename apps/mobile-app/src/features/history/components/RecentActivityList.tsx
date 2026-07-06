import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../../../constants/colors';
import { formatEventTime } from '../../../utils/date';
import { EmptyState } from '../../../components/EmptyState';
import type { TimelineEvent } from '../../../types';

interface Props {
  events: TimelineEvent[];
  selectedIds: string[];
  handleLongPress: (id: string) => void;
  handlePress: (id: string) => void;
  emptyCategoryLabel?: string;
}

const isSameDay = (d1: Date, d2: Date) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export function RecentActivityList({
  events,
  selectedIds,
  handleLongPress,
  handlePress,
  emptyCategoryLabel = 'activities',
}: Props) {
  // Group events by date (local timezone)
  const groupedEvents = React.useMemo(() => {
    const groups: { title: string; date: Date; data: TimelineEvent[] }[] = [];
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    events.forEach((event) => {
      const eventDate = new Date(event.occurredAt);
      let groupTitle = '';

      if (isSameDay(eventDate, today)) {
        groupTitle = 'Today';
      } else if (isSameDay(eventDate, yesterday)) {
        groupTitle = 'Yesterday';
      } else {
        groupTitle = eventDate.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }

      const existingGroup = groups.find((g) => g.title === groupTitle);
      if (existingGroup) {
        existingGroup.data.push(event);
      } else {
        groups.push({
          title: groupTitle,
          date: eventDate,
          data: [event],
        });
      }
    });

    // Sort groups descending by date
    return groups.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [events]);

  if (events.length === 0) {
    return (
      <EmptyState
        title="No logs found"
        description={`No ${emptyCategoryLabel} logged. Track activities to see them here.`}
        icon="📅"
        style={{ marginTop: 30 }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {groupedEvents.map((group) => (
        <View key={group.title} style={styles.groupContainer}>
          {/* Date Separator Header */}
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>{group.title}</Text>
            <View style={styles.dateHeaderLine} />
          </View>

          {/* List of cards for this date */}
          <View style={styles.cardsContainer}>
            {group.data.map((event) => {
              const isSelected = selectedIds.includes(event.id);
              return (
                <TouchableOpacity
                  key={event.id}
                  onLongPress={() => handleLongPress(event.id)}
                  onPress={() => handlePress(event.id)}
                  delayLongPress={400}
                  activeOpacity={0.85}
                  style={[
                    styles.eventCard,
                    isSelected && styles.eventCardSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${event.title} at ${formatEventTime(event.occurredAt)}. ${event.note ?? ''}`}
                >
                  <View style={styles.eventIcon}>
                    <Text style={styles.iconText}>{event.icon}</Text>
                  </View>
                  <View style={styles.eventBody}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventMeta}>
                      {formatEventTime(event.occurredAt)}
                      {event.note ? ` · ${event.note}` : ''}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkIcon}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  groupContainer: {
    marginBottom: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  dateHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ECECEC',
    marginLeft: 10,
  },
  cardsContainer: {
    gap: 8,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECECEC',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  eventCardSelected: {
    borderColor: C.purple,
    backgroundColor: C.purpleSoft,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
  },
  eventBody: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
  },
  eventMeta: {
    fontSize: 11,
    color: C.muted,
    marginTop: 3,
    fontWeight: '500',
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
