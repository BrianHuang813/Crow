import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../useAuth';

vi.mock('../../api/projects', () => ({
  fetchMe: vi.fn().mockResolvedValue({
    id: 'user-uuid-1',
    handle: 'brian',
    email: null,
    avatar_url: null,
    credits: 50,
    resurrection_count: 0,
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts unauthenticated when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.handle).toBeNull();
    expect(result.current.userId).toBeNull();
    expect(result.current.credits).toBe(0);
  });

  it('login() sets isLoggedIn, handle, and persists to localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.login('jwt-abc', 'brian'));
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.handle).toBe('brian');
    expect(localStorage.getItem('crow_token')).toBe('jwt-abc');
    expect(localStorage.getItem('crow_handle')).toBe('brian');
  });

  it('login() triggers /api/auth/me fetch and syncs userId + credits', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.login('jwt-abc', 'brian'));
    await waitFor(() => expect(result.current.userId).toBe('user-uuid-1'));
    expect(result.current.credits).toBe(50);
  });

  it('logout() clears state and localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.login('jwt-abc', 'brian'));
    act(() => result.current.logout());
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.userId).toBeNull();
    expect(localStorage.getItem('crow_token')).toBeNull();
  });

  it('setCredits() updates credits and persists', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.setCredits(125));
    expect(result.current.credits).toBe(125);
    expect(localStorage.getItem('crow_credits')).toBe('125');
  });

  it('restores state from localStorage on mount', () => {
    localStorage.setItem('crow_token', 'existing-jwt');
    localStorage.setItem('crow_handle', 'returning-user');
    localStorage.setItem('crow_credits', '42');
    localStorage.setItem('crow_user_id', 'uuid-existing');
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.handle).toBe('returning-user');
    expect(result.current.userId).toBe('uuid-existing');
    expect(result.current.credits).toBe(42);
  });
});
