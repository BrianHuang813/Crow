import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ isLoggedIn: false, credits: 0 }) }));
vi.mock('../../hooks/useProjects', () => ({ useProjects: () => ({ data: { items: [] } }) }));
vi.mock('../../hooks/useActivity', () => ({ useActivity: () => ({ data: { events: [] } }) }));

import HomePage from '../HomePage';

describe('HomePage', () => {
  it('renders the project feed shell and valid primary routes', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /submit ur project now/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore projects/i })).toHaveAttribute('href', '/explore');
    expect(screen.getByRole('link', { name: /view the grid/i })).toHaveAttribute('href', '/grid');
    expect(screen.getByText('Trending')).toBeInTheDocument();
  });
});
