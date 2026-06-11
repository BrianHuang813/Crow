import { apiFetch } from './client';
import type { Project } from '../types/api';

export interface ProjectListResponse {
  items: Project[];
  total: number;
  limit: number;
  offset: number;
}

export interface ActivityEventApi {
  type: 'claimed' | 'faded' | 'boosted';
  project_id: string;
  project_name: string;
  color: string;
  actor_handle: string | null;
  at: string;
}

export interface ActivityResponse {
  events: ActivityEventApi[];
}

export interface UserProfile {
  handle: string;
  avatar_url: string | null;
  resurrection_count: number;
  created_at: string;
  project_count: number;
  territory_total: number;
  follower_count: number;
  following_count: number;
  is_following: boolean;
}

export interface FollowState {
  is_following: boolean;
  follower_count: number;
}

export function followUser(handle: string): Promise<FollowState> {
  return apiFetch<FollowState>(`/users/${encodeURIComponent(handle)}/follow`, { method: 'POST' });
}

export function unfollowUser(handle: string): Promise<FollowState> {
  return apiFetch<FollowState>(`/users/${encodeURIComponent(handle)}/follow`, { method: 'DELETE' });
}

export interface ListParams {
  status?: 'active' | 'alive' | 'dying' | 'dead' | 'all';
  sort?: 'momentum' | 'recent' | 'territory';
  owner_handle?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function listProjects(params: ListParams = {}): Promise<ProjectListResponse> {
  return apiFetch<ProjectListResponse>(`/projects${qs(params as Record<string, string | number | undefined>)}`);
}

export function fetchActivity(limit = 20): Promise<ActivityResponse> {
  return apiFetch<ActivityResponse>(`/activity${qs({ limit })}`);
}

export function fetchUserProfile(handle: string): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/users/${encodeURIComponent(handle)}`);
}

export function fetchRelated(id: string, limit = 4): Promise<{ items: Project[] }> {
  return apiFetch<{ items: Project[] }>(`/projects/${id}/related${qs({ limit })}`);
}
