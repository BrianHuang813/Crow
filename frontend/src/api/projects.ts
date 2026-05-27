import { apiFetch } from './client';
import type { Project, ProjectCreate, Me } from '../types/api';

export function fetchProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`);
}

export function fetchMyProject(): Promise<Project | null> {
  return apiFetch<Project | null>('/projects/mine');
}

export function createProject(data: ProjectCreate): Promise<Project> {
  return apiFetch<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function abandonProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}/abandon`, { method: 'PATCH' });
}

export function fetchMe(): Promise<Me> {
  return apiFetch('/auth/me');
}
