import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectActions } from '../ProjectActions';
import type { Project } from '../../types/api';

const flags = {
  isOwnProject: false, inCooldown: false, canBoost: true, canResurrect: false,
  showInteract: true, credits: 500,
  clickMutation: { mutate: vi.fn(), isPending: false },
  boostMutation: { mutate: vi.fn(), isPending: false },
  resurrectMutation: { mutate: vi.fn(), isPending: false },
};
vi.mock('../../hooks/useProjectInteractions', () => ({ useProjectInteractions: () => flags }));

function project(over: Partial<Project> = {}): Project {
  return {
    id: 'p1', name: 'X', description: null, url: null, tech_tags: [],
    owner_id: 'other', status: 'alive', expires_at: '', momentum: 50,
    territory_size: 3, color: '#ac3509', created_at: '', died_at: null, ...over,
  };
}

describe('ProjectActions', () => {
  it('renders Click and Boost for an interactable project', () => {
    render(<ProjectActions project={project()} />);
    expect(screen.getByRole('button', { name: /click/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /boost/i })).toBeInTheDocument();
  });

  it('fires the boost mutation when Boost is clicked', () => {
    render(<ProjectActions project={project()} />);
    screen.getByRole('button', { name: /boost/i }).click();
    expect(flags.boostMutation.mutate).toHaveBeenCalled();
  });
});
