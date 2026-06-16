import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShareCard } from '../ShareCard';
import type { Project } from '../../types/api';

const project: Project = {
  id: 'p1', name: 'EchoFlow', description: null, url: null, repo: null,
  tech_tags: ['React', 'GPT-4'], owner_id: 'u1', status: 'alive',
  expires_at: new Date(Date.now() + 7200_000).toISOString(),
  momentum: 60, territory_size: 24, color: '#ac3509', created_at: '', died_at: null,
};

describe('ShareCard', () => {
  it('shows name, tech chips and stats by default', () => {
    render(<ShareCard project={project} background="cream" showTech showStats />);
    expect(screen.getByText('EchoFlow')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText(/24 cells/i)).toBeInTheDocument();
  });

  it('hides tech chips and stats when toggled off', () => {
    render(<ShareCard project={project} background="cream" showTech={false} showStats={false} />);
    expect(screen.queryByText('React')).not.toBeInTheDocument();
    expect(screen.queryByText(/24 cells/i)).not.toBeInTheDocument();
  });

  it('applies the background variant class', () => {
    const { container } = render(<ShareCard project={project} background="dark" showTech showStats />);
    expect(container.querySelector('.share-card--dark')).toBeInTheDocument();
  });
});
