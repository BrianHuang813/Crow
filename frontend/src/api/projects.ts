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

export interface ProjectCreateInput {
  name: string;
  description?: string;
  url?: string;
  repo?: string;
  tech_tags?: string[];
}

export function createProject(input: ProjectCreateInput): Promise<Project> {
  return apiFetch<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
