import { useHomeData } from './useHomeData';
import type { TimelineEvent, Feeding, SleepSession, DiaperChange } from '../types';

interface Params {
  feedings: Feeding[];
  sleepSessions: SleepSession[];
  diapers: DiaperChange[];
  events: TimelineEvent[];
}

export function useHistoryData(params: Params) {
  return useHomeData(params);
}
