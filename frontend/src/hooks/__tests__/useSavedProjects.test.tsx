import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSavedProjects } from '../useSavedProjects';

describe('useSavedProjects', () => {
  beforeEach(() => localStorage.clear());

  it('toggles and persists saved ids', () => {
    const { result } = renderHook(() => useSavedProjects());
    expect(result.current.isSaved('a')).toBe(false);
    act(() => result.current.toggle('a'));
    expect(result.current.isSaved('a')).toBe(true);
    expect(JSON.parse(localStorage.getItem('crow_saved_projects')!)).toContain('a');
    act(() => result.current.toggle('a'));
    expect(result.current.isSaved('a')).toBe(false);
  });
});
