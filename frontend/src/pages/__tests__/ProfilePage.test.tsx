import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Me, Project } from '../../types/api';

let auth = { isLoggedIn: true, handle: 'alice' };
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => auth }));

const me: Me = { id: 'u1', handle: 'alice', email: null, avatar_url: null, credits: 320, resurrection_count: 2 };
let meData: Me | undefined = me;
vi.mock('../../hooks/useMe', () => ({ useMe: () => ({ data: meData, isLoading: false }) }));

const project: Project = {
  id: 'p1', name: 'EchoFlow', description: null, url: null, tech_tags: [],
  owner_id: 'u1', status: 'alive', expires_at: '', momentum: 50, territory_size: 24,
  color: '#ac3509', created_at: '', died_at: null,
};
let myProjectData: Project | null = project;
vi.mock('../../hooks/useMyProject', () => ({ useMyProject: () => ({ data: myProjectData, isLoading: false }) }));

import ProfilePage from '../ProfilePage';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/u/:handle" element={<ProfilePage />} /></Routes>
    </MemoryRouter>
  );
}

describe('ProfilePage', () => {
  beforeEach(() => { auth = { isLoggedIn: true, handle: 'alice' }; meData = me; myProjectData = project; });

  it('shows own profile with handle, stats and project', () => {
    renderAt('/u/alice');
    expect(screen.getByRole('heading', { name: /alice/ })).toBeInTheDocument();
    expect(screen.getByText('320')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('EchoFlow')).toBeInTheDocument();
  });

  it('shows a degraded state for another builder', () => {
    renderAt('/u/bob');
    expect(screen.getByText(/isn't public yet/i)).toBeInTheDocument();
    expect(screen.getByText(/@bob/)).toBeInTheDocument();
  });
});
