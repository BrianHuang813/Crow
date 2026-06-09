import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { UserProfile } from '../../api/social';
import type { Project } from '../../types/api';

let profile: { data: UserProfile | undefined; isLoading: boolean; isError: boolean } = {
  data: { handle: 'alice', avatar_url: null, resurrection_count: 2, created_at: '', project_count: 1, territory_total: 24 },
  isLoading: false, isError: false,
};
vi.mock('../../hooks/useUserProfile', () => ({ useUserProfile: () => profile }));

const proj: Project = {
  id: 'p1', name: 'EchoFlow', description: null, url: null, tech_tags: [],
  owner_id: 'u1', status: 'alive', expires_at: '', momentum: 50, territory_size: 24,
  color: '#ac3509', created_at: '', died_at: null,
};
let projects: { data: { items: Project[] } | undefined } = { data: { items: [proj] } };
vi.mock('../../hooks/useProjects', () => ({ useProjects: () => projects }));

import ProfilePage from '../ProfilePage';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/u/:handle" element={<ProfilePage />} /></Routes>
    </MemoryRouter>
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    profile = { data: { handle: 'alice', avatar_url: null, resurrection_count: 2, created_at: '', project_count: 1, territory_total: 24 }, isLoading: false, isError: false };
    projects = { data: { items: [proj] } };
  });

  it('renders any builder profile with stats and projects', () => {
    renderAt('/u/alice');
    expect(screen.getByRole('heading', { name: /alice/ })).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('EchoFlow')).toBeInTheDocument();
  });

  it('shows not-found when the handle does not resolve', () => {
    profile = { data: undefined, isLoading: false, isError: true };
    projects = { data: { items: [] } };
    renderAt('/u/ghost');
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });
});
