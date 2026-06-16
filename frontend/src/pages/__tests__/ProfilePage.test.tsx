import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { UserProfile } from '../../api/social';
import type { Project } from '../../types/api';

function makeProfile(over: Partial<UserProfile> = {}): UserProfile {
  return {
    handle: 'alice', avatar_url: null, resurrection_count: 2, created_at: '',
    project_count: 1, territory_total: 24,
    follower_count: 3, following_count: 1, is_following: false, ...over,
  };
}

let profile: { data: UserProfile | undefined; isLoading: boolean; isError: boolean } = {
  data: makeProfile(), isLoading: false, isError: false,
};
vi.mock('../../hooks/useUserProfile', () => ({ useUserProfile: () => profile }));

const proj: Project = {
  id: 'p1', name: 'EchoFlow', description: null, url: null, repo: null, tech_tags: [],
  owner_id: 'u1', status: 'alive', expires_at: '', momentum: 50, territory_size: 24,
  color: '#ac3509', created_at: '', died_at: null,
};
let projects: { data: { items: Project[] } | undefined } = { data: { items: [proj] } };
vi.mock('../../hooks/useProjects', () => ({ useProjects: () => projects }));

let auth = { handle: 'bob', isLoggedIn: true };
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => auth }));

const followUser = vi.fn().mockResolvedValue({ is_following: true, follower_count: 4 });
const unfollowUser = vi.fn().mockResolvedValue({ is_following: false, follower_count: 2 });
vi.mock('../../api/social', () => ({
  followUser: (h: string) => followUser(h),
  unfollowUser: (h: string) => unfollowUser(h),
}));

import ProfilePage from '../ProfilePage';

function renderAt(path: string) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/u/:handle" element={<ProfilePage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    profile = { data: makeProfile(), isLoading: false, isError: false };
    projects = { data: { items: [proj] } };
    auth = { handle: 'bob', isLoggedIn: true };
    followUser.mockClear();
    unfollowUser.mockClear();
  });

  it('renders any builder profile with stats, follower counts, and projects', () => {
    renderAt('/u/alice');
    expect(screen.getByRole('heading', { name: /alice/ })).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText(/3 followers/)).toBeInTheDocument();
    expect(screen.getByText('EchoFlow')).toBeInTheDocument();
  });

  it('shows a Follow button to a logged-in visitor and follows on click', async () => {
    const user = userEvent.setup();
    renderAt('/u/alice');
    await user.click(screen.getByRole('button', { name: /^follow$/i }));
    expect(followUser).toHaveBeenCalledWith('alice');
    expect(await screen.findByRole('button', { name: /following/i })).toBeInTheDocument();
  });

  it('hides the Follow button on your own profile', () => {
    auth = { handle: 'alice', isLoggedIn: true };
    renderAt('/u/alice');
    expect(screen.queryByRole('button', { name: /follow/i })).not.toBeInTheDocument();
  });

  it('shows not-found when the handle does not resolve', () => {
    profile = { data: undefined, isLoading: false, isError: true };
    projects = { data: { items: [] } };
    renderAt('/u/ghost');
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });
});
