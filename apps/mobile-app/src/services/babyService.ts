import { request } from './apiClient';
import type { Baby, Feeding, SleepSession, DiaperChange, GrowthRecord } from '../types';

export interface BabyCreate {
  name: string;
  birth_date: string; // YYYY-MM-DD
  gender: string;
}

export const babyService = {
  listBabies: () => request<Baby[]>('/babies/'),

  createBaby: (data: BabyCreate) =>
    request<Baby>('/babies/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  listDeletedActivities: (babyId: number) =>
    request<{
      feedings: Feeding[];
      sleep: SleepSession[];
      diapers: DiaperChange[];
      growth: GrowthRecord[];
    }>(`/activities/deleted/baby/${babyId}`),

  restoreActivity: (kind: string, id: number) =>
    request<{ status: string }>(`/activities/restore/${kind}/${id}`, { method: 'POST' }),
};
