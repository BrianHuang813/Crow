import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProjectInteractions } from '../useProjectInteractions';
import type { Project } from '../../types/api';

let authValue = { isLoggedIn: true, userId: 'me', credits: 500, adjustCredits: vi.fn() };
vi.mock('../useAuth', () => ({ useAuth: () => authValue }));

function project(over: Partial<Project> = {}): Project {
  return {
    id: 'p1', name: 'X', description: null, url: null, tech_tags: [],
    owner_id: 'other', status: 'alive', expires_at: '', momentum: 50,
    territory_size: 3, color: '#ac3509', created_at: '', died_at: null, ...over,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useProjectInteractions', () => {
  it('allows interacting with another live project when funded', () => {
    authValue = { isLoggedIn: true, userId: 'me', credits: 500, adjustCredits: vi.fn() };
    const { result } = renderHook(() => useProjectInteractions(project()), { wrapper });
    expect(result.current.isOwnProject).toBe(false);
    expect(result.current.showInteract).toBe(true);
    expect(result.current.canBoost).toBe(true);
    expect(result.current.canResurrect).toBe(false);
  });

  it('hides interactions on your own project', () => {
    authValue = { isLoggedIn: true, userId: 'me', credits: 500, adjustCredits: vi.fn() };
    const { result } = renderHook(() => useProjectInteractions(project({ owner_id: 'me' })), { wrapper });
    expect(result.current.isOwnProject).toBe(true);
    expect(result.current.showInteract).toBe(false);
  });

  it('offers resurrect on a dead project when funded, and not boost', () => {
    authValue = { isLoggedIn: true, userId: 'me', credits: 500, adjustCredits: vi.fn() };
    const { result } = renderHook(() => useProjectInteractions(project({ status: 'dead' })), { wrapper });
    expect(result.current.canResurrect).toBe(true);
    expect(result.current.canBoost).toBe(false);
    expect(result.current.showInteract).toBe(false);
  });

  it('blocks boost/resurrect when underfunded', () => {
    authValue = { isLoggedIn: true, userId: 'me', credits: 10, adjustCredits: vi.fn() };
    const { result } = renderHook(() => useProjectInteractions(project({ status: 'dead' })), { wrapper });
    expect(result.current.canResurrect).toBe(false);
    const live = renderHook(() => useProjectInteractions(project()), { wrapper });
    expect(live.result.current.canBoost).toBe(false);
  });
});
