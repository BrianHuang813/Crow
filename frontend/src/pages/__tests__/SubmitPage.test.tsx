import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => {
  const actual = await orig<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

let auth = { isLoggedIn: true };
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => auth }));

let myProject: unknown = null;
vi.mock('../../hooks/useMyProject', () => ({ useMyProject: () => ({ data: myProject, isLoading: false }) }));

const createProject = vi.fn().mockResolvedValue({ id: 'new1' });
vi.mock('../../api/projects', () => ({ createProject: (...a: unknown[]) => createProject(...a) }));

import SubmitPage from '../SubmitPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderPage() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><SubmitPage /></MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SubmitPage', () => {
  beforeEach(() => { auth = { isLoggedIn: true }; myProject = null; createProject.mockClear(); navigate.mockClear(); });

  it('prompts to log in when logged out', () => {
    auth = { isLoggedIn: false };
    renderPage();
    expect(screen.getByText(/log in to claim/i)).toBeInTheDocument();
  });

  it('shows the existing project when the user already holds territory', () => {
    myProject = { id: 'mine', name: 'MyThing' };
    renderPage();
    expect(screen.getByText(/already hold territory/i)).toBeInTheDocument();
  });

  it('submits name + description + tags and navigates home on success', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/project name/i), 'EchoFlow');
    await user.type(screen.getByLabelText(/description/i), 'A living agent.');
    await user.type(screen.getByPlaceholderText(/add a tool/i), 'React{Enter}');
    await user.click(screen.getByRole('button', { name: /post to grid/i }));
    expect(createProject).toHaveBeenCalledWith({
      name: 'EchoFlow', description: 'A living agent.', url: undefined, tech_tags: ['React'],
    });
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
  });
});
