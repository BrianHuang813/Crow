import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '../Header';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ isLoggedIn: true, credits: 42 }),
}));
vi.mock('../LoginButton', () => ({ LoginButton: () => <button>Login</button> }));

describe('Header', () => {
  it('shows brand, nav links, and credits when logged in', () => {
    render(<MemoryRouter><Header /></MemoryRouter>);
    expect(screen.getByText('CROW')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute('href', '/explore');
    expect(screen.getByRole('link', { name: 'Grid' })).toHaveAttribute('href', '/grid');
    expect(screen.getByText(/42/)).toBeInTheDocument();
    expect(screen.queryByText(/submit project/i)).not.toBeInTheDocument();
  });

  it('exposes persistent Submit and How it works entries', () => {
    render(<MemoryRouter><Header /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /^submit$/i })).toHaveAttribute('href', '/submit');
    expect(screen.getByRole('link', { name: /how it works/i })).toHaveAttribute('href', '/how-it-works');
  });
});
