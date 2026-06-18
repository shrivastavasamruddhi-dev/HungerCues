import { Platform } from 'react-native';

export interface Baby {
  id: number;
  name: string;
  birth_date: string;
  gender: string;
}

export interface Feeding {
  id: number;
  baby_id: number;
  type: string;
  start_time: string;
  duration_minutes: number;
  quantity_ml?: number | null;
  notes?: string | null;
}

export interface SleepSession {
  id: number;
  baby_id: number;
  sleep_start: string;
  sleep_end?: string | null;
  duration_minutes?: number | null;
  tracking_method: string;
  notes?: string | null;
}

export interface DiaperChange {
  id: number;
  baby_id: number;
  changed_at: string;
  type: string;
  notes?: string | null;
}

export interface AIInsight {
  summary: string;
  feeding_insights: string;
  sleep_insights: string;
  recommendations: string[];
}

const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? `http://${defaultHost}:8000/api/v1`;

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
  listFeedings: (babyId: number) =>
    request<Feeding[]>(`/feedings/baby/${babyId}`),
  listSleep: (babyId: number) =>
    request<SleepSession[]>(`/sleep/baby/${babyId}`),
  listDiapers: (babyId: number) =>
    request<DiaperChange[]>(`/diapers/baby/${babyId}`),
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
  getInsights: (babyId: number) =>
    request<AIInsight>(`/ai/insights/${babyId}`, { method: 'POST' }),
};
