import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../hooks/useAuth';
import { HoverCard } from '../HoverCard';
import type { GridCell, Project } from '../../types/api';

// Logged-in user with 100 credits — different from mockProject.owner_id ('other-user')
vi.mock('../../hooks/useAuth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useAuth')>();
  return {
    ...actual,
    useAuth: vi.fn(() => ({
      isLoggedIn: true, handle: 'clicker', credits: 100,
      userId: 'clicker-uuid',   // !== mockProject.owner_id → buttons should show
      token: 'tok', login: vi.fn(), logout: vi.fn(), setCredits: vi.fn(), adjustCredits: vi.fn(),
    })),
  };
});

const mockProject: Project = {
  id: 'p-alive',
  name: 'Alive Project',
  status: 'alive',
  momentum: 30,
  territory_size: 2,
  expires_at: new Date(Date.now() + 20 * 3_600_000).toISOString(),
  tech_tags: ['Go'],
  color: '#4a90d9',
  owner_id: 'other-user-uuid',  // different from userId 'clicker-uuid' → buttons shown
  description: null,
  url: null,
  created_at: new Date().toISOString(),
  died_at: null,
};

vi.mock('../../api/projects', () => ({
  fetchProject: vi.fn().mockResolvedValue({
    id: 'p-alive',
    name: 'Alive Project',
    status: 'alive',
    momentum: 30,
    territory_size: 2,
    expires_at: new Date(Date.now() + 20 * 3_600_000).toISOString(),
    tech_tags: ['Go'],
    color: '#4a90d9',
    owner_id: 'other-user-uuid',
    description: null,
    url: null,
    created_at: new Date().toISOString(),
    died_at: null,
  }),
  fetchMyProject: vi.fn(),
  abandonProject: vi.fn(),
  fetchMe: vi.fn(),
}));

vi.mock('../../api/interact', () => ({
  interact: vi.fn().mockResolvedValue({
    momentum_added: 5,
    time_added_seconds: 300,
    credits_earned: 5,
    new_momentum: 35,
    new_expires_at: new Date(Date.now() + 20 * 3_600_000+ 300_000).toISOString(),
  }),
  resurrect: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const aliveCell: GridCell = {
  x: 5, y: 5, state: 'alive', project_id: 'p-alive', color: '#4a90d9',
};

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={qc}>
    <AuthProvider>{children}</AuthProvider>
  </QueryClientProvider>
);

describe('HoverCard interaction buttons', () => {
  it('shows Click button for alive project owned by someone else', async () => {
    render(<HoverCard cell={aliveCell} canvasX={100} canvasY={100} />, { wrapper });
    expect(await screen.findByRole('button', { name: /click/i })).toBeInTheDocument();
  });

  it('shows Boost button with credit cost', async () => {
    render(<HoverCard cell={aliveCell} canvasX={100} canvasY={100} />, { wrapper });
    expect(await screen.findByRole('button', { name: /boost/i })).toBeInTheDocument();
    expect(screen.getByText(/20/)).toBeInTheDocument();
  });

  it('calls interact() with type "click" when Click is clicked', async () => {
    const user = userEvent.setup();
    render(<HoverCard cell={aliveCell} canvasX={100} canvasY={100} />, { wrapper });
    await screen.findByRole('button', { name: /click/i });
    await user.click(screen.getByRole('button', { name: /click/i }));
    const { interact } = await import('../../api/interact');
    expect(interact).toHaveBeenCalledWith('p-alive', 'click');
  });

  it('hides Click and Boost buttons when project is owned by current user', async () => {
    const { useAuth: mockUseAuth } = await import('../../hooks/useAuth');
    vi.mocked(mockUseAuth).mockReturnValue({
      isLoggedIn: true, handle: 'clicker', credits: 100,
      userId: 'other-user-uuid',  // matches mockProject.owner_id
      token: 'tok', login: vi.fn(), logout: vi.fn(), setCredits: vi.fn(), adjustCredits: vi.fn(),
    });
    render(<HoverCard cell={aliveCell} canvasX={100} canvasY={100} />, { wrapper });
    await screen.findByText('Alive Project');
    expect(screen.queryByRole('button', { name: /click/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /boost/i })).not.toBeInTheDocument();
  });
});
