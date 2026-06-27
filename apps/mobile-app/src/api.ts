import {
  Baby,
  Feeding,
  SleepSession,
  DiaperChange,
  GrowthRecord,
  AIInsight,
  Milestone,
  NotificationEntry,
  AIWeeklySummary,
} from './types';

export type {
  Baby,
  Feeding,
  SleepSession,
  DiaperChange,
  GrowthRecord,
  AIInsight,
  Milestone,
  NotificationEntry,
  AIWeeklySummary,
};

const defaultHost = '192.168.1.22';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? `http://${defaultHost}:8000/api/v1`;

const headers = {
  Authorization: 'Bearer mock-token',
  'Content-Type': 'application/json',
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  listBabies: () => request<Baby[]>('/babies/'),
  listFeedings: (babyId: number) => request<Feeding[]>(`/feedings/baby/${babyId}`),
  listSleep: (babyId: number) => request<SleepSession[]>(`/sleep/baby/${babyId}`),
  listDiapers: (babyId: number) => request<DiaperChange[]>(`/diapers/baby/${babyId}`),
  listGrowth: (babyId: number) => request<GrowthRecord[]>(`/growth/baby/${babyId}`),
  createFeeding: (payload: Omit<Feeding, 'id'>) =>
    request<Feeding>('/feedings/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createSleep: (payload: Omit<SleepSession, 'id'>) =>
    request<SleepSession>('/sleep/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createDiaper: (payload: Omit<DiaperChange, 'id'>) =>
    request<DiaperChange>('/diapers/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createGrowth: (payload: Omit<GrowthRecord, 'id'>) =>
    request<GrowthRecord>('/growth/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getInsights: (babyId: number) => request<AIInsight>(`/ai/insights/${babyId}`, { method: 'POST' }),
  askQuestion: (babyId: number, question: string) =>
    request<{ answer: string }>(`/ai/ask/${babyId}`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
  listMilestones: (babyId: number) => request<Milestone[]>(`/milestones/baby/${babyId}`),
  createMilestone: (payload: Omit<Milestone, 'id'>) =>
    request<Milestone>('/milestones/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateMilestone: (id: number, payload: Partial<Omit<Milestone, 'id' | 'baby_id' | 'name'>>) =>
    request<Milestone>(`/milestones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteMilestone: (id: number) =>
    request<{ status: string }>(`/milestones/${id}`, { method: 'DELETE' }),
  getWeeklySummary: (babyId: number) =>
    request<AIWeeklySummary>(`/ai/weekly-summary/${babyId}`, { method: 'POST' }),
  listRecentNotifications: () => request<NotificationEntry[]>('/notifications/recent'),
  clearNotifications: () => request<{ status: string }>('/notifications/clear', { method: 'POST' }),
  deleteNotification: (id: number) =>
    request<{ status: string }>(`/notifications/${id}`, { method: 'DELETE' }),
  registerDeviceToken: (payload: { fcm_token: string; baby_id: number }) =>
    request<{ status: string }>('/notifications/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteFeeding: (id: number) =>
    request<{ status: string }>(`/feedings/${id}`, { method: 'DELETE' }),
  deleteSleep: (id: number) => request<{ status: string }>(`/sleep/${id}`, { method: 'DELETE' }),
  deleteDiaper: (id: number) => request<{ status: string }>(`/diapers/${id}`, { method: 'DELETE' }),
  deleteGrowth: (id: number) => request<{ status: string }>(`/growth/${id}`, { method: 'DELETE' }),
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
