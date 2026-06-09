import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Project } from '../../types/api';

const sample: Project = {
  id: 'p1', name: 'EchoFlow', description: 'A living knowledge agent.',
  url: 'https://echo.dev', tech_tags: ['React', 'GPT-4'], owner_id: 'me',
  status: 'alive', expires_at: new Date(Date.now() + 7200_000).toISOString(),
  momentum: 72, territory_size: 18, color: '#ac3509', created_at: '', died_at: null,
};

vi.mock('@tanstack/react-query', async (orig) => {
  const actual = await orig<typeof import('@tanstack/react-query')>();
  return { ...actual, useQuery: () => ({ data: sample, isLoading: false, isError: false }) };
});
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ isLoggedIn: true, userId: 'me', credits: 0, adjustCredits: vi.fn() }) }));
vi.mock('../../hooks/useRelated', () => ({ useRelated: () => ({ data: { items: [] } }) }));
vi.mock('../../components/ProjectActions', () => ({ ProjectActions: () => <div data-testid="actions" /> }));

import ProjectDetailPage from '../ProjectDetailPage';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/p/:id" element={<ProjectDetailPage />} /></Routes>
    </MemoryRouter>
  );
}

describe('ProjectDetailPage', () => {
  it('renders the project title, story, stats and tech chips', () => {
    renderAt('/p/p1');
    expect(screen.getByRole('heading', { name: 'EchoFlow' })).toBeInTheDocument();
    expect(screen.getByText('A living knowledge agent.')).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByTestId('actions')).toBeInTheDocument();
  });
});
