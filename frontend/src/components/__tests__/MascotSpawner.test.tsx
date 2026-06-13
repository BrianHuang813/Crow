import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MascotSpawner } from '../MascotSpawner';
import { FIRST_DELAY } from '../mascot/spawn';

const MUTE_KEY = 'crow_mascot_muted';

function mockReducedMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(), onchange: null,
  }));
}

describe('MascotSpawner', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    mockReducedMotion(false);
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('stays hidden initially, then pops a mascot into a corner', () => {
    render(<MascotSpawner />);
    expect(screen.queryByTestId('mascot')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(FIRST_DELAY + 10); });
    expect(screen.getByTestId('mascot')).toBeInTheDocument();
  });

  it('never spawns when reduced motion is preferred', () => {
    mockReducedMotion(true);
    render(<MascotSpawner />);
    act(() => { vi.advanceTimersByTime(FIRST_DELAY + 10); });
    expect(screen.queryByTestId('mascot')).not.toBeInTheDocument();
  });

  it('never spawns when previously muted', () => {
    localStorage.setItem(MUTE_KEY, '1');
    render(<MascotSpawner />);
    act(() => { vi.advanceTimersByTime(FIRST_DELAY + 10); });
    expect(screen.queryByTestId('mascot')).not.toBeInTheDocument();
  });

  it('mute hides it and remembers the choice', () => {
    render(<MascotSpawner />);
    act(() => { vi.advanceTimersByTime(FIRST_DELAY + 10); });
    fireEvent.click(screen.getByRole('button', { name: /hide the crow mascot/i }));
    expect(screen.queryByTestId('mascot')).not.toBeInTheDocument();
    expect(localStorage.getItem(MUTE_KEY)).toBe('1');
  });
});
