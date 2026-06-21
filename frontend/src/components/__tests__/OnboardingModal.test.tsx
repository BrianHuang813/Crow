import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingModal } from '../OnboardingModal';

const KEY = 'crow_onboarded';

describe('OnboardingModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('appears on first visit after a short delay', () => {
    render(<MemoryRouter><OnboardingModal /></MemoryRouter>);
    // hidden immediately
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Install command lives behind the collapsible terminal path now.
    fireEvent.click(screen.getByText(/prefer your terminal/i));
    expect(screen.getByText('/plugin install crow-submit@crow')).toBeInTheDocument();
  });

  it('does not appear if already onboarded', () => {
    localStorage.setItem(KEY, '1');
    render(<MemoryRouter><OnboardingModal /></MemoryRouter>);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('dismisses and remembers via "Got it"', () => {
    render(<MemoryRouter><OnboardingModal /></MemoryRouter>);
    act(() => { vi.advanceTimersByTime(600); });
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBe('1');
  });

  it('shows the web submit path and a collapsible terminal path', () => {
    localStorage.clear();
    render(<MemoryRouter><OnboardingModal /></MemoryRouter>);
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText(/living arena/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /submit on the web/i })).toHaveAttribute('href', '/submit');
    expect(screen.getByText(/prefer your terminal/i)).toBeInTheDocument();
  });
});
