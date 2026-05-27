import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CrowLogo } from '../CrowLogo';
import { CodeRain } from '../CodeRain';

describe('CrowLogo', () => {
  it('renders the crow image', () => {
    render(<CrowLogo />);
    const img = screen.getByRole('presentation', { hidden: true });
    expect(img).toHaveAttribute('src', '/logo.png');
  });

  it('renders the crow.gg name', () => {
    render(<CrowLogo />);
    expect(screen.getByText('crow.gg')).toBeInTheDocument();
  });
});

describe('CodeRain', () => {
  it('renders with aria-hidden', () => {
    const { container } = render(<CodeRain />);
    expect(container.firstChild).toHaveAttribute('aria-hidden');
  });

  it('renders 22 drop elements', () => {
    const { container } = render(<CodeRain />);
    const drops = container.querySelectorAll('.code-rain__drop');
    expect(drops).toHaveLength(22);
  });
});
