import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../hooks/useProjectInteractions', () => ({
  useProjectInteractions: () => ({
    isLoggedIn: false, isOwnProject: false, inCooldown: false,
    canBoost: false, canResurrect: false, showInteract: false, credits: 0,
    clickMutation: { mutate: vi.fn(), isPending: false },
    boostMutation: { mutate: vi.fn(), isPending: false },
    resurrectMutation: { mutate: vi.fn(), isPending: false },
  }),
}));

const startLogin = vi.fn();
vi.mock('../../utils/loginRedirect', () => ({ startLogin: (p?: string) => startLogin(p) }));

import { ProjectActions } from '../ProjectActions';
import type { Project } from '../../types/api';

const project = { id: 'p1', status: 'alive' } as Project;

describe('ProjectActions logged out', () => {
  beforeEach(() => startLogin.mockClear());

  it('shows a login prompt and Click/Boost that trigger login', () => {
    render(<ProjectActions project={project} />);
    expect(screen.getByText(/log in with github/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /click/i }));
    expect(startLogin).toHaveBeenCalled();
  });
});
