import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Project } from '../../types/api';
import { ProjectCard } from '../ProjectCard';

const project: Project = {
  id: 'project-123',
  name: 'EchoFlow',
  description: 'A living knowledge agent.',
  url: 'https://example.com',
  tech_tags: ['React'],
  owner_id: 'user-1',
  status: 'alive',
  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  momentum: 72,
  territory_size: 18,
  color: '#ac3509',
  created_at: '',
  died_at: null,
};

describe('ProjectCard', () => {
  it('links the artwork and title to the real Project route', () => {
    render(<MemoryRouter><ProjectCard project={project} /></MemoryRouter>);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute('href', '/p/project-123');
  });
});
