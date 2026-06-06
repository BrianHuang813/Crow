import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CrowMascot } from '../CrowMascot';

function mockReducedMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }));
}

describe('CrowMascot', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('renders the pixel crow image', () => {
    mockReducedMotion(false);
    render(<CrowMascot />);
    const img = screen.getByTestId('crow-mascot-img') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toBe('/logo.png');
  });

  it('stays static when reduced motion is preferred', () => {
    mockReducedMotion(true);
    render(<CrowMascot />);
    const root = screen.getByTestId('crow-mascot');
    expect(root.getAttribute('data-static')).toBe('true');
  });
});
