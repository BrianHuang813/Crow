import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HowItWorksPage from '../HowItWorksPage';

function renderPage() {
  return render(<MemoryRouter><HowItWorksPage /></MemoryRouter>);
}

describe('HowItWorksPage', () => {
  it('renders the explainer with a submit link and install commands', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /how crow works/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /submit a project/i })).toHaveAttribute('href', '/submit');
    expect(screen.getByText('/plugin install crow-submit@crow')).toBeInTheDocument();
  });
});
