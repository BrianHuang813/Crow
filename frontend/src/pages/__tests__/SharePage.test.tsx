import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Project } from '../../types/api';

const sample: Project = {
  id: 'p1', name: 'EchoFlow', description: null, url: null, repo: null,
  tech_tags: ['React'], owner_id: 'u1', status: 'alive',
  expires_at: new Date(Date.now() + 7200_000).toISOString(),
  momentum: 60, territory_size: 24, color: '#ac3509', created_at: '', died_at: null,
};

vi.mock('@tanstack/react-query', async (orig) => {
  const actual = await orig<typeof import('@tanstack/react-query')>();
  return { ...actual, useQuery: () => ({ data: sample, isLoading: false, isError: false }) };
});

const toPng = vi.fn().mockResolvedValue('data:image/png;base64,xxx');
vi.mock('html-to-image', () => ({ toPng: (...a: unknown[]) => toPng(...a) }));

import SharePage from '../SharePage';

function renderAt(path = '/share/p1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/share/:id" element={<SharePage />} /></Routes>
    </MemoryRouter>
  );
}

describe('SharePage', () => {
  it('renders the card preview and controls', () => {
    renderAt();
    expect(screen.getByText('EchoFlow')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
  });

  it('hides tech chips when the Show tech toggle is unchecked', async () => {
    const user = userEvent.setup();
    renderAt();
    expect(screen.getByText('React')).toBeInTheDocument();
    await user.click(screen.getByLabelText(/show tech stack/i));
    expect(screen.queryByText('React')).not.toBeInTheDocument();
  });

  it('captures the card to PNG when Download is clicked', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole('button', { name: /download/i }));
    expect(toPng).toHaveBeenCalled();
  });
});
