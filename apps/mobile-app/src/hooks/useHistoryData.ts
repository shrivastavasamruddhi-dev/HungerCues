import { useMemo } from 'react';
import type { TimelineEvent, Feeding, SleepSession, DiaperChange } from '../types';

interface Params {
  feedings: Feeding[];
  sleepSessions: SleepSession[];
  diapers: DiaperChange[];
  events: TimelineEvent[];
}

export function useHistoryData({ feedings, sleepSessions, diapers, events }: Params) {
  const recent = useMemo(() => events.filter((e) => e.kind !== 'growth').slice(0, 20), [events]);

  const today = new Date();
  const dayStart = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offsetDays);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const dayEnd = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offsetDays);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const DAY_LABELS = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = dayStart(6 - i);
      return d.toLocaleDateString(undefined, { weekday: 'short' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const feedChartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const offset = 6 - i;
      const ds = dayStart(offset);
      const de = dayEnd(offset);
      const dayFeedings = feedings.filter((f) => {
        const t = new Date(f.start_time).getTime();
        return t >= ds.getTime() && t <= de.getTime();
      });
      const bottleMl = dayFeedings
        .filter((f) => f.type === 'bottle')
        .reduce((s, f) => s + (f.quantity_ml ?? 0), 0);
      const breastMl = dayFeedings
        .filter((f) => f.type === 'breast')
        .reduce((s, f) => s + (f.duration_minutes ?? 0) * 4, 0); // ~4ml/min estimate
      return { bottleMl, breastMl, total: bottleMl + breastMl };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedings]);

  const feedMax = useMemo(() => Math.max(...feedChartData.map((d) => d.total), 1), [feedChartData]);

  const todaySleepSessions = useMemo(() => {
    const ds = dayStart(0);
    const de = dayEnd(0);
    return sleepSessions.filter((s) => {
      const t = new Date(s.sleep_start).getTime();
      return t >= ds.getTime() && t <= de.getTime();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepSessions]);

  const sleepChartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const offset = 6 - i;
      const ds = dayStart(offset);
      const de = dayEnd(offset);
      const daySessions = sleepSessions.filter((s) => {
        const t = new Date(s.sleep_start).getTime();
        return t >= ds.getTime() && t <= de.getTime();
      });
      const nightMins = daySessions
        .filter((s) => s.tracking_method === 'night')
        .reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);
      const napMins = daySessions
        .filter((s) => s.tracking_method !== 'night')
        .reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);
      return { nightMins, napMins, totalMins: nightMins + napMins };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepSessions]);

  const sleepMax = useMemo(
    () => Math.max(...sleepChartData.map((d) => d.totalMins), 1),
    [sleepChartData],
  );

  const diaperTodayData = useMemo(() => {
    const ds = dayStart(0);
    const de = dayEnd(0);
    const todayDiapers = diapers.filter((d) => {
      const t = new Date(d.changed_at).getTime();
      return t >= ds.getTime() && t <= de.getTime();
    });
    const sorted = [...todayDiapers].sort(
      (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
    );
    const normalizedDiaperTypes = todayDiapers.map((d) => d.type.trim().toLowerCase());
    return {
      count: todayDiapers.length,
      wet: normalizedDiaperTypes.filter((type) => type === 'wet').length,
      poopyMixed: normalizedDiaperTypes.filter((type) =>
        ['poopy', 'mixed', 'dry', 'dirty', 'both'].includes(type),
      ).length,
      lastChange: sorted[0]?.changed_at ?? null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diapers]);

  const counts = useMemo(() => {
    const ds = dayStart(0);
    const de = dayEnd(0);
    return {
      feed: feedings.filter((f) => {
        const t = new Date(f.start_time).getTime();
        return t >= ds.getTime() && t <= de.getTime();
      }).length,
      sleep: sleepSessions.filter((s) => {
        const t = new Date(s.sleep_start).getTime();
        return t >= ds.getTime() && t <= de.getTime();
      }).length,
      diaper: diapers.filter((d) => {
        const t = new Date(d.changed_at).getTime();
        return t >= ds.getTime() && t <= de.getTime();
      }).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedings, sleepSessions, diapers]);

  const timeToPercent = (iso: string) => {
    const d = new Date(iso);
    return (d.getHours() * 60 + d.getMinutes()) / (24 * 60);
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const formatTime12 = (iso: string) => {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  return {
    recent,
    DAY_LABELS,
    feedChartData,
    feedMax,
    todaySleepSessions,
    sleepChartData,
    sleepMax,
    diaperTodayData,
    counts,
    timeToPercent,
    formatDuration,
    formatTime12,
  };
}
