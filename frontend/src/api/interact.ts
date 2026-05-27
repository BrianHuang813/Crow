import { apiFetch } from './client';
import type { InteractionResult, Project } from '../types/api';

export function interact(
  projectId: string,
  type: 'click' | 'boost'
): Promise<InteractionResult> {
  return apiFetch<InteractionResult>(`/interact/${projectId}`, {
    method: 'POST',
    body: JSON.stringify({ type }),
  });
}

export function resurrect(projectId: string): Promise<Project> {
  return apiFetch<Project>(`/resurrect/${projectId}`, { method: 'POST' });
}
