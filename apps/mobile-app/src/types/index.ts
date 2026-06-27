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
  breast_side?: string | null;
  notes?: string | null;
  deleted_at?: string | null;
}

export interface SleepSession {
  id: number;
  baby_id: number;
  sleep_start: string;
  sleep_end?: string | null;
  duration_minutes?: number | null;
  tracking_method: string;
  notes?: string | null;
  deleted_at?: string | null;
}

export interface DiaperChange {
  id: number;
  baby_id: number;
  changed_at: string;
  type: string;
  notes?: string | null;
  deleted_at?: string | null;
}

export interface GrowthRecord {
  id: number;
  baby_id: number;
  recorded_at: string;
  weight_kg?: number | null;
  height_cm?: number | null;
  notes?: string | null;
  deleted_at?: string | null;
}

export interface AIInsight {
  summary: string;
  feeding_insights: string;
  sleep_insights: string;
  recommendations: string[];
}

export interface Milestone {
  id: number;
  baby_id: number;
  name: string;
  achieved_at?: string | null;
  notes?: string | null;
}

export interface NotificationEntry {
  id: number;
  title: string;
  body: string;
  sent_at: string;
  type: string;
}

export interface AIWeeklySummary {
  summary: string;
  feeding_insights: string;
  sleep_insights: string;
  growth_insights: string;
  recommendations: string[];
}
