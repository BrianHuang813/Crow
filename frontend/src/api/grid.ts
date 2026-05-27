import { apiFetch } from './client';
import type { GridSnapshot } from '../types/api';

export function fetchGrid(): Promise<GridSnapshot> {
  return apiFetch<GridSnapshot>('/grid');
}
