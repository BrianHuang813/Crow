import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../hooks/useAuth';
import { HoverCard } from '../HoverCard';
import type { GridCell, Project } from '../../types/api';

vi.mock('../../hooks/useAuth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useAuth')>();
  return {
    ...actual,
    useAuth: vi.fn(() => ({
      isLoggedIn: false, handle: null, credits: 0,
      userId: null, token: null, login: vi.fn(), logout: vi.fn(), setCredits: vi.fn(),
    })),
  };
});

vi.mock('../../api/projects', () => ({
  fetchProject: vi.fn().mockResolvedValue({
    id: 'proj-1',
    name: 'Test Project',
    status: 'alive',
    momentum: 42,
    territory_size: 3,
    expires_at: new Date(Date.now() + 10 * 3_600_000).toISOString(),
    tech_tags: ['Python'],
    color: '#ac3509',
    owner_id: 'user-1',
    description: null,
    url: null,
    created_at: new Date().toISOString(),
    died_at: null,
  } satisfies Project),
}));

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={qc}>
    <AuthProvider>{children}</AuthProvider>
  </QueryClientProvider>
);

const aliveCell: GridCell = {
  x: 5, y: 5, state: 'alive', project_id: 'proj-1', color: '#ac3509',
};
const emptyCell: GridCell = {
  x: 0, y: 0, state: 'empty', project_id: null, color: null,
};

describe('HoverCard', () => {
  it('renders project name after data loads', async () => {
    render(<HoverCard cell={aliveCell} canvasX={100} canvasY={100} />, { wrapper });
    expect(await screen.findByText('Test Project')).toBeInTheDocument();
  });

  it('renders momentum value', async () => {
    render(<HoverCard cell={aliveCell} canvasX={100} canvasY={100} />, { wrapper });
    expect(await screen.findByText(/42/)).toBeInTheDocument();
  });

  it('returns null for empty cells', () => {
    const { container } = render(
      <HoverCard cell={emptyCell} canvasX={0} canvasY={0} />,
      { wrapper }
    );
    expect(container.firstChild).toBeNull();
  });
});
