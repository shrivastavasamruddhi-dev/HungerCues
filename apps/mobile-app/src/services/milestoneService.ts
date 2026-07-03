import { request } from './apiClient';
import type { Milestone, MilestoneMedia } from '../types';

export const milestoneService = {
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

  uploadMedia: (milestoneId: number, formData: FormData) =>
    request<MilestoneMedia>(`/milestones/${milestoneId}/media`, {
      method: 'POST',
      body: formData,
    }),

  deleteMedia: (milestoneId: number, mediaId: number) =>
    request<{ status: string }>(`/milestones/${milestoneId}/media/${mediaId}`, {
      method: 'DELETE',
    }),
};
