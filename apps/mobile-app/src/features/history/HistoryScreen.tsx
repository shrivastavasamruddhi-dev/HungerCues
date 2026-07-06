import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { C } from '../../constants/colors';
import { useHistoryData } from '../../hooks/useHistoryData';
import { useDeleteActivities } from '../../hooks/useDeleteActivities';
import { RecentActivityList } from './components/RecentActivityList';
import type { TimelineEvent, Feeding, SleepSession, DiaperChange } from '../../types';

interface Props {
  events: TimelineEvent[];
  feedings: Feeding[];
  sleepSessions: SleepSession[];
  diapers: DiaperChange[];
  onRefreshData: () => Promise<void>;
  onPressViewDeleted: () => void;
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

const isSameDay = (d1: Date, d2: Date) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export function HistoryScreen({
  events,
  feedings,
  sleepSessions,
  diapers,
  onRefreshData,
  onPressViewDeleted,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'feed' | 'sleep' | 'diaper' | 'growth'
  >('all');
  const [showMenu, setShowMenu] = useState<boolean>(false);

  // Month/Year for calendar picker rendering
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth());
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());

  const { recent } = useHistoryData({ feedings, sleepSessions, diapers, events });

  const { selectedIds, setSelectedIds, handleLongPress, handlePress, handleDeleteSelected } =
    useDeleteActivities({ onRefreshData });

  useEffect(() => {
    void onRefreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(calYear, calMonth, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean; key: string }[] = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = prevMonthTotalDays - i;
      const date = new Date(calYear, calMonth - 1, day);
      cells.push({ date, isCurrentMonth: false, key: `prev-${day}` });
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(calYear, calMonth, day);
      cells.push({ date, isCurrentMonth: true, key: `curr-${day}` });
    }

    const remaining = 42 - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const date = new Date(calYear, calMonth + 1, day);
      cells.push({ date, isCurrentMonth: false, key: `next-${day}` });
    }

    return cells;
  }, [calMonth, calYear]);

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

  // Filter events by selected category and date (if any)
  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => {
        const matchesCategory = activeCategory === 'all' || event.kind === activeCategory;
        if (!selectedDate) return matchesCategory;

        const eventDate = new Date(event.occurredAt);
        const matchesDate = isSameDay(eventDate, selectedDate);
        return matchesCategory && matchesDate;
      })
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [events, selectedDate, activeCategory]);

  const formattedHeaderDate = useMemo(() => {
    if (!selectedDate) return 'All History';

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
    <View style={styles.container}>
      {/* Absolute Backdrop to close dropdown menu */}
      {showMenu && (
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        />
      )}

      {/* Header / Selection Control */}
      {selectedIds.length > 0 ? (
        <View style={[styles.header, { backgroundColor: C.purpleSoft, paddingRight: 10 }]}>
          <TouchableOpacity
            onPress={() => setSelectedIds([])}
            style={{ paddingVertical: 8, paddingHorizontal: 4 }}
          >
            <Text style={{ color: C.purpleDark, fontWeight: '700', fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.purpleDark, fontWeight: '800' }]}>
            {selectedIds.length} Selected
          </Text>
          <TouchableOpacity onPress={handleDeleteSelected} style={styles.deleteBtn}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.header, { paddingRight: 6 }]}>
          <Text style={styles.headerTitle}>History</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              accessibilityLabel="Open options menu"
              onPress={() => setShowMenu(!showMenu)}
              style={[styles.headerAction, { backgroundColor: '#EFEFEF' }]}
            >
              <Text style={{ fontSize: 18, color: C.ink, fontWeight: '700' }}>⋮</Text>
            </TouchableOpacity>

            {/* Dropdown Menu */}
            {showMenu && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  accessibilityRole="menuitem"
                  onPress={() => {
                    setShowMenu(false);
                    onPressViewDeleted();
                  }}
                  style={styles.dropdownItem}
                >
                  <Text style={styles.dropdownItemEmoji}>🗑️</Text>
                  <Text style={styles.dropdownItemText}>Deleted Activities</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── Date Navigator Row ── */}
      <View style={styles.dateSelectorRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.selectedDateText}>{formattedHeaderDate}</Text>
          {selectedDate && (
            <TouchableOpacity
              onPress={() => setSelectedDate(null)}
              style={styles.clearDateBtn}
            >
              <Text style={styles.clearDateBtnText}>Clear filter ×</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => {
            const dateToUse = selectedDate || new Date();
            setCalMonth(dateToUse.getMonth());
            setCalYear(dateToUse.getFullYear());
            setShowCalendar(!showCalendar);
          }}
          style={[styles.calendarToggleBtn, showCalendar && styles.calendarToggleBtnActive]}
        >
          <Text style={[styles.calendarToggleText, showCalendar && styles.whiteText]}>
            {showCalendar ? 'Close ✕' : 'Filter Date 📅'}
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
              const isSelected = selectedDate && isSameDay(cell.date, selectedDate);
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
                    setShowCalendar(false);
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

      {/* ── Direct Scrollable Timeline List ── */}
      <RecentActivityList
        events={filteredEvents}
        selectedIds={selectedIds}
        handleLongPress={handleLongPress}
        handlePress={handlePress}
        emptyCategoryLabel={activeCategory === 'all' ? 'activities' : activeCategory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 54,
    backgroundColor: C.card,
    borderRadius: 28,
    paddingLeft: 18,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    zIndex: 10,
  },
  headerTitle: { color: C.ink, fontSize: 16, fontWeight: '800' },
  headerActions: {
    position: 'relative',
    zIndex: 20,
  },
  headerAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 5,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 190,
    backgroundColor: C.card,
    borderRadius: 16,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    borderWidth: 1,
    borderColor: '#ECECEC',
    zIndex: 30,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  dropdownItemEmoji: {
    fontSize: 16,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.ink,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  selectedDateText: {
    fontSize: 15,
    fontWeight: '800',
    color: C.ink,
  },
  clearDateBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  clearDateBtnText: {
    fontSize: 12,
    color: C.purple,
    fontWeight: '700',
  },
  calendarToggleBtn: {
    backgroundColor: C.purpleSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  calendarToggleBtnActive: {
    backgroundColor: C.purple,
  },
  calendarToggleText: {
    color: C.purpleDark,
    fontWeight: '800',
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
    borderColor: '#ECECEC',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 12,
    color: C.ink,
  },
  calendarHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.ink,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekdayText: {
    width: 32,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  selectedDayCell: {
    backgroundColor: C.purple,
  },
  otherMonthDayCell: {
    opacity: 0.3,
  },
  disabledDayCell: {
    opacity: 0.15,
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
  disabledDayText: {
    color: C.muted,
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
  disabledTodayIndicator: {
    backgroundColor: C.muted,
  },
  chipsContainer: {
    marginBottom: 16,
  },
  chipsScroll: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  activeChip: {
    backgroundColor: C.purple,
  },
  chipText: {
    fontSize: 13,
    color: C.muted,
    fontWeight: '700',
  },
  activeChipText: {
    color: '#FFF',
    fontWeight: '800',
  },
});
