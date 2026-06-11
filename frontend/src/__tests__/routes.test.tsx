import { describe, expect, it } from 'vitest';
import { router } from '../routes';

describe('application routes', () => {
  it('exposes only the supported frontend routes', () => {
    const root = router.routes.find(route => route.children);
    const paths = root?.children?.map(route => route.path);

    expect(paths).toEqual([
      '/',
      '/explore',
      '/grid',
      '/p/:id',
      '/u/:handle',
      '/share/:id',
    ]);
    expect(paths).not.toContain('/submit');
  });

  it('keeps the authentication callback outside the application layout', () => {
    expect(router.routes.some(route => route.path === '/auth/callback')).toBe(true);
  });
});
