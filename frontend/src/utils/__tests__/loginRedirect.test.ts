import { describe, it, expect, beforeEach } from 'vitest';
import { consumeLoginRedirect } from '../loginRedirect';

describe('consumeLoginRedirect', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when nothing stored', () => {
    expect(consumeLoginRedirect()).toBeNull();
  });

  it('returns and clears the stored path', () => {
    localStorage.setItem('crow_post_login_redirect', '/p/abc');
    expect(consumeLoginRedirect()).toBe('/p/abc');
    expect(consumeLoginRedirect()).toBeNull();
  });
});
