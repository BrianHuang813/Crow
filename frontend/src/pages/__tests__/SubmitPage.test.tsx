import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ isLoggedIn: true }) }));
const createProject = vi.fn((_i: unknown) => Promise.resolve({ id: 'new1' }));
vi.mock('../../api/projects', () => ({ createProject: (i: unknown) => createProject(i) }));

import SubmitPage from '../SubmitPage';

function renderPage() {
  return render(<MemoryRouter><SubmitPage /></MemoryRouter>);
}

describe('SubmitPage', () => {
  it('disables submit until a name is entered', () => {
    renderPage();
    const submit = screen.getByRole('button', { name: /submit project/i });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/project name/i), { target: { value: 'EchoFlow' } });
    expect(submit).toBeEnabled();
  });

  it('rejects a non-http url with an inline error', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/homepage url/i), { target: { value: 'ftp://x' } });
    expect(screen.getByText(/must start with http/i)).toBeInTheDocument();
  });
});
