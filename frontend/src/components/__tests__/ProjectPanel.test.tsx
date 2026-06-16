import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../hooks/useAuth';
import { ProjectPanel } from '../ProjectPanel';
import type { Project } from '../../types/api';
import { fetchMyProject } from '../../api/projects';

vi.mock('../../hooks/useAuth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useAuth')>();
  return {
    ...actual,
    useAuth: () => ({
      isLoggedIn: true,
      handle: 'testuser',
      credits: 100,
      userId: 'u-1',
      token: 'tok',
      logout: vi.fn(),
      login: vi.fn(),
      setCredits: vi.fn(),
      adjustCredits: vi.fn(),
    }),
  };
});

vi.mock('../../api/projects', () => ({
  fetchMyProject: vi.fn().mockResolvedValue(null),
  abandonProject: vi.fn().mockResolvedValue({} as Project),
  fetchProject: vi.fn(),
  fetchMe: vi.fn().mockResolvedValue({
    id: 'u-1', handle: 'testuser', email: null, avatar_url: null,
    credits: 100, resurrection_count: 0,
  }),
}));

const makeQc = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrapper =
  (qc: QueryClient) =>
  ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProjectPanel — no project', () => {
  it('renders no web submission UI when user has no active project', async () => {
    vi.mocked(fetchMyProject).mockResolvedValue(null);
    const qc = makeQc();
    const { container } = render(<ProjectPanel />, { wrapper: wrapper(qc) });
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByText(/submit/i)).not.toBeInTheDocument();
  });
});

describe('ProjectPanel — with project', () => {
  const mockProject: Project = {
    id: 'p-1',
    name: 'My Live App',
    description: 'Cool stuff',
    url: null,
    repo: null,
    tech_tags: ['Python'],
    owner_id: 'u-1',
    status: 'alive',
    momentum: 60,
    territory_size: 4,
    color: '#ac3509',
    expires_at: new Date(Date.now() + 20 * 3_600_000).toISOString(),
    created_at: new Date().toISOString(),
    died_at: null,
  };

  it('shows project name and status badge', async () => {
    vi.mocked(fetchMyProject).mockResolvedValue(mockProject);
    const qc = makeQc();
    render(<ProjectPanel />, { wrapper: wrapper(qc) });
    expect(await screen.findByText('My Live App')).toBeInTheDocument();
    expect(screen.getByText('alive')).toBeInTheDocument();
  });

  it('shows momentum and territory size', async () => {
    vi.mocked(fetchMyProject).mockResolvedValue(mockProject);
    const qc = makeQc();
    render(<ProjectPanel />, { wrapper: wrapper(qc) });
    expect(await screen.findByText('60 / 100 momentum')).toBeInTheDocument();
    expect(screen.getByText(/4 cells/)).toBeInTheDocument();
  });

  it('shows Abandon button', async () => {
    vi.mocked(fetchMyProject).mockResolvedValue(mockProject);
    const qc = makeQc();
    render(<ProjectPanel />, { wrapper: wrapper(qc) });
    expect(await screen.findByText('Abandon')).toBeInTheDocument();
  });
});
