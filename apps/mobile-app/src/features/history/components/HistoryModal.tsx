import React, { useState, useMemo } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { C } from '../../../constants/colors';
import { formatEventTime } from '../../../utils/date';
import type { TimelineEvent } from '../../../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  events: TimelineEvent[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  handleLongPress: (id: string) => void;
  handlePress: (id: string) => void;
  handleDeleteSelected: () => void;
  onRefreshData: () => Promise<void>;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function HistoryModal({
  visible,
  onClose,
  events,
  selectedIds,
  setSelectedIds,
  handleLongPress,
  handlePress,
  handleDeleteSelected,
  onRefreshData,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'feed' | 'sleep' | 'diaper' | 'growth'
  >('all');

  // Month and Year state for the calendar rendering (separate from active selectedDate)
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth());
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());

  // Date range constraints: from first logged activity to today
  const minDate = useMemo(() => {
    if (events.length === 0) return new Date();
    const oldestEvent = events[events.length - 1];
    const d = new Date(oldestEvent.occurredAt);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [events]);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const isDateSelectable = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    const minCompare = new Date(minDate);
    minCompare.setHours(0, 0, 0, 0);

    const maxCompare = new Date(maxDate);
    maxCompare.setHours(0, 0, 0, 0);

    return d >= minCompare && d <= maxCompare;
  };

  const prevMonthDisabled = useMemo(() => {
    const lastDayOfPrevMonth = new Date(calYear, calMonth, 0);
    lastDayOfPrevMonth.setHours(23, 59, 59, 999);

    const minCompare = new Date(minDate);
    minCompare.setHours(0, 0, 0, 0);

    return lastDayOfPrevMonth < minCompare;
  }, [calYear, calMonth, minDate]);

  const nextMonthDisabled = useMemo(() => {
    const firstDayOfNextMonth = new Date(calYear, calMonth + 1, 1);
    firstDayOfNextMonth.setHours(0, 0, 0, 0);

    const maxCompare = new Date(maxDate);
    maxCompare.setHours(23, 59, 59, 999);

    return firstDayOfNextMonth > maxCompare;
  }, [calYear, calMonth, maxDate]);

  // Generate calendar days grid
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(calYear, calMonth, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean; key: string }[] = [];

    // Prev month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = prevMonthTotalDays - i;
      const date = new Date(calYear, calMonth - 1, day);
      cells.push({ date, isCurrentMonth: false, key: `prev-${day}` });
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(calYear, calMonth, day);
      cells.push({ date, isCurrentMonth: true, key: `curr-${day}` });
    }

    // Next month days to fill grid (6 rows * 7 columns = 42 cells)
    const remaining = 42 - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const date = new Date(calYear, calMonth + 1, day);
      cells.push({ date, isCurrentMonth: false, key: `next-${day}` });
    }

    return cells;
  }, [calMonth, calYear]);

  // Handle month changes
  const handlePrevMonth = () => {
    if (prevMonthDisabled) return;
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((prev) => prev - 1);
    } else {
      setCalMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (nextMonthDisabled) return;
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((prev) => prev + 1);
    } else {
      setCalMonth((prev) => prev + 1);
    }
  };

  // Compare helper
  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // Filter events by selected date and category
  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => {
        // Compare date in local time
        const eventDate = new Date(event.occurredAt);
        const matchesDate = isSameDay(eventDate, selectedDate);
        const matchesCategory = activeCategory === 'all' || event.kind === activeCategory;
        return matchesDate && matchesCategory;
      })
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [events, selectedDate, activeCategory]);

  const formattedHeaderDate = useMemo(() => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(selectedDate, today)) {
      return `Today, ${selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }
    if (isSameDay(selectedDate, yesterday)) {
      return `Yesterday, ${selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }
    return selectedDate.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* ── Selection Action Header (if items selected) ── */}
          {selectedIds.length > 0 ? (
            <View style={styles.selectionHeader}>
              <TouchableOpacity onPress={() => setSelectedIds([])} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.selectionTitle}>{selectedIds.length} Selected</Text>
              <TouchableOpacity onPress={handleDeleteSelected} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.normalHeader}>
              <Text style={styles.modalTitle}>Activity History</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityLabel="Close history"
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Date Navigator Header ── */}
          <View style={styles.dateSelectorRow}>
            <Text style={styles.selectedDateText}>{formattedHeaderDate}</Text>
            <TouchableOpacity
              onPress={() => {
                // When opening calendar, match displayed month/year to selected date
                setCalMonth(selectedDate.getMonth());
                setCalYear(selectedDate.getFullYear());
                setShowCalendar(!showCalendar);
              }}
              style={[styles.calendarToggleBtn, showCalendar && styles.calendarToggleBtnActive]}
            >
              <Text style={[styles.calendarToggleText, showCalendar && styles.whiteText]}>
                {showCalendar ? 'Close Calendar ✕' : 'Select Date 📅'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Collapsible Calendar Picker ── */}
          {showCalendar && (
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  onPress={handlePrevMonth}
                  style={[styles.arrowBtn, prevMonthDisabled && { opacity: 0.25 }]}
                  disabled={prevMonthDisabled}
                >
                  <Text style={styles.arrowText}>◀</Text>
                </TouchableOpacity>
                <Text style={styles.calendarHeaderTitle}>
                  {MONTHS[calMonth]} {calYear}
                </Text>
                <TouchableOpacity
                  onPress={handleNextMonth}
                  style={[styles.arrowBtn, nextMonthDisabled && { opacity: 0.25 }]}
                  disabled={nextMonthDisabled}
                >
                  <Text style={styles.arrowText}>▶</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.weekdaysRow}>
                {WEEKDAYS.map((day) => (
                  <Text key={day} style={styles.weekdayText}>
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {calendarCells.map((cell) => {
                  const isSelected = isSameDay(cell.date, selectedDate);
                  const isToday = isSameDay(cell.date, new Date());
                  const selectable = isDateSelectable(cell.date);

                  return (
                    <TouchableOpacity
                      key={cell.key}
                      style={[
                        styles.dayCell,
                        isSelected && styles.selectedDayCell,
                        !cell.isCurrentMonth && styles.otherMonthDayCell,
                        !selectable && styles.disabledDayCell,
                      ]}
                      onPress={() => {
                        if (!selectable) return;
                        setSelectedDate(cell.date);
                        setShowCalendar(false); // Close calendar on day select
                      }}
                      disabled={!selectable}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isSelected && styles.selectedDayText,
                          !cell.isCurrentMonth && styles.otherMonthDayText,
                          !selectable && styles.disabledDayText,
                        ]}
                      >
                        {cell.date.getDate()}
                      </Text>
                      {isToday && !isSelected && (
                        <View
                          style={[
                            styles.todayIndicator,
                            !selectable && styles.disabledTodayIndicator,
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Category Filtering Chips ── */}
          <View style={styles.chipsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {(
                [
                  { key: 'all', label: 'All', icon: '📝' },
                  { key: 'feed', label: 'Feeds', icon: '🍼' },
                  { key: 'sleep', label: 'Sleep', icon: '😴' },
                  { key: 'diaper', label: 'Diapers', icon: '🧷' },
                  { key: 'growth', label: 'Growth', icon: '📈' },
                ] as const
              ).map((chip) => {
                const isActive = activeCategory === chip.key;
                return (
                  <TouchableOpacity
                    key={chip.key}
                    onPress={() => setActiveCategory(chip.key)}
                    style={[styles.chip, isActive && styles.activeChip]}
                  >
                    <Text style={[styles.chipText, isActive && styles.activeChipText]}>
                      {chip.icon} {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Scrollable Logs List ── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {filteredEvents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No logs found</Text>
                <Text style={styles.emptyStateDescription}>
                  No {activeCategory === 'all' ? '' : `${activeCategory} `}logs for{' '}
                  {formattedHeaderDate}.
                </Text>
              </View>
            ) : (
              filteredEvents.map((event) => {
                const isSelected = selectedIds.includes(event.id);
                return (
                  <TouchableOpacity
                    key={event.id}
                    onLongPress={() => handleLongPress(event.id)}
                    onPress={() => handlePress(event.id)}
                    delayLongPress={400}
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
                      <View style={styles.checkContainer}>
                        <Text style={styles.checkIcon}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    height: '85%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: C.canvas,
    paddingHorizontal: 20,
    paddingTop: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: -4 },
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: '0px -4px 16px rgba(0,0,0,0.1)',
      },
    }),
  },
  normalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.ink,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: C.muted,
    fontWeight: '700',
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.purpleSoft,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelBtnText: {
    color: C.purpleDark,
    fontWeight: '700',
    fontSize: 13,
  },
  selectionTitle: {
    color: C.purpleDark,
    fontWeight: '800',
    fontSize: 14,
  },
  deleteBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 15,
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 12,
  },
  selectedDateText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
  },
  calendarToggleBtn: {
    backgroundColor: C.purpleSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 15,
  },
  calendarToggleBtnActive: {
    backgroundColor: C.purple,
  },
  calendarToggleText: {
    color: C.purpleDark,
    fontWeight: '700',
    fontSize: 12,
  },
  whiteText: {
    color: '#FFF',
  },
  calendarContainer: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  arrowBtn: {
    padding: 8,
  },
  arrowText: {
    fontSize: 14,
    color: C.purple,
  },
  calendarHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.ink,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 99,
    position: 'relative',
  },
  selectedDayCell: {
    backgroundColor: C.purple,
  },
  otherMonthDayCell: {
    opacity: 0.35,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.ink,
  },
  selectedDayText: {
    color: '#FFF',
    fontWeight: '800',
  },
  otherMonthDayText: {
    color: C.muted,
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.purple,
  },
  disabledDayCell: {
    opacity: 0.2,
  },
  disabledDayText: {
    color: C.muted,
  },
  disabledTodayIndicator: {
    backgroundColor: C.muted,
  },
  chipsContainer: {
    marginBottom: 12,
  },
  chipsScroll: {
    paddingRight: 10,
    gap: 8,
  },
  chip: {
    backgroundColor: C.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeChip: {
    backgroundColor: C.purple,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.ink,
  },
  activeChipText: {
    color: '#FFF',
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyState: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.muted,
    marginBottom: 6,
  },
  emptyStateDescription: {
    fontSize: 12,
    color: C.muted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  eventCard: {
    minHeight: 70,
    borderRadius: 18,
    backgroundColor: C.card,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventBody: {
    marginLeft: 12,
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  eventMeta: {
    fontSize: 10,
    color: C.muted,
    marginTop: 4,
  },
  purpleText: {
    color: C.purpleDark,
  },
  checkContainer: {
    marginLeft: 8,
    marginRight: 4,
  },
  checkIcon: {
    fontSize: 16,
    color: C.purpleDark,
    fontWeight: '900',
  },
});
