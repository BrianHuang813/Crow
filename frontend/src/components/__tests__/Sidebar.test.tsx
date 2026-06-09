import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import type { Project } from '../../types/api';
import type { ActivityEventApi } from '../../api/social';

function project(over: Partial<Project>): Project {
  return {
    id: 'a', name: 'EchoFlow', description: null, url: null, tech_tags: [],
    owner_id: 'u1', status: 'alive', expires_at: '', momentum: 80,
    territory_size: 30, color: '#ac3509', created_at: '', died_at: null, ...over,
  };
}

const trending = [project({ id: 'a', name: 'EchoFlow', momentum: 80 })];
const builders = [project({ id: 'b', name: 'HabitLoop', territory_size: 40, color: '#006a63' })];
const activity: ActivityEventApi[] = [
  { type: 'boosted', project_id: 'a', project_name: 'EchoFlow', color: '#ac3509', actor_handle: 'bob', at: '2026-06-09T00:00:00Z' },
];

describe('Sidebar', () => {
  it('renders trending, top builders and activity from props', () => {
    render(<MemoryRouter><Sidebar trending={trending} builders={builders} activity={activity} /></MemoryRouter>);
    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.getByText('Top Builders')).toBeInTheDocument();
    expect(screen.getByText('Live Activity')).toBeInTheDocument();
    expect(screen.getByText('EchoFlow')).toBeInTheDocument();
    expect(screen.getByText('HabitLoop')).toBeInTheDocument();
    expect(screen.getByText(/boosted/i)).toBeInTheDocument();
  });

  it('shows empty hints when there is no data', () => {
    render(<MemoryRouter><Sidebar trending={[]} builders={[]} activity={[]} /></MemoryRouter>);
    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument();
  });
});
