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
    expect(screen.getByRole('link', { name: /grid/i })).toHaveAttribute('href', '/');
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });
});
