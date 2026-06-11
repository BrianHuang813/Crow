import { apiFetch } from './client';
import type { Project, Me } from '../types/api';

export function fetchProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`);
}

export function fetchMyProject(): Promise<Project | null> {
  return apiFetch<Project | null>('/projects/mine');
}

export function abandonProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}/abandon`, { method: 'PATCH' });
}

export function fetchMe(): Promise<Me> {
  return apiFetch('/auth/me');
}
