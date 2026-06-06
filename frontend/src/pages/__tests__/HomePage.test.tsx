import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ isLoggedIn: false, credits: 0 }) }));
vi.mock('../../hooks/useGridPoll', () => ({ useGridPoll: () => ({ data: undefined, isLoading: true, isError: false }) }));
vi.mock('../../hooks/useTopProjects', () => ({ useTopProjects: () => [] }));

import HomePage from '../HomePage';

describe('HomePage', () => {
  it('renders the grid loading state and the sidebar', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.getByText(/loading grid/i)).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
  });
});
