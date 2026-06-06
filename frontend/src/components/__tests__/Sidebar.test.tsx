import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import type { TopProject } from '../../hooks/useTopProjects';

const top: TopProject[] = [
  { projectId: 'a', territory: 30, color: '#ac3509', project: { id: 'a', name: 'EchoFlow', momentum: 80, territory_size: 30, status: 'alive', color: '#ac3509', owner_id: 'u1', description: null, url: null, tech_tags: [], expires_at: '', created_at: '', died_at: null } },
  { projectId: 'b', territory: 12, color: '#006a63', project: { id: 'b', name: 'HabitLoop', momentum: 95, territory_size: 12, status: 'alive', color: '#006a63', owner_id: 'u2', description: null, url: null, tech_tags: [], expires_at: '', created_at: '', died_at: null } },
];

describe('Sidebar', () => {
  it('renders trending (momentum sort) and top builders (territory sort)', () => {
    render(<MemoryRouter><Sidebar top={top} activity={[]} /></MemoryRouter>);
    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.getByText('Top Builders')).toBeInTheDocument();
    expect(screen.getByText('Live Activity')).toBeInTheDocument();
    expect(screen.getAllByText('HabitLoop').length).toBeGreaterThan(0);
    expect(screen.getAllByText('EchoFlow').length).toBeGreaterThan(0);
  });

  it('shows an empty hint when there is no activity', () => {
    render(<MemoryRouter><Sidebar top={[]} activity={[]} /></MemoryRouter>);
    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument();
  });
});
