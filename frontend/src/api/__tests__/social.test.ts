import { describe, it, expect, vi, afterEach } from 'vitest';
import { listProjects, fetchActivity, fetchUserProfile, fetchRelated } from '../social';

function mockFetch(json: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify(json),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('social api', () => {
  it('listProjects builds a query string from params and returns items', async () => {
    const fn = mockFetch({ items: [], total: 0, limit: 20, offset: 0 });
    await listProjects({ sort: 'momentum', status: 'active', limit: 5 });
    const url = fn.mock.calls[0][0] as string;
    expect(url).toContain('/api/projects?');
    expect(url).toContain('sort=momentum');
    expect(url).toContain('status=active');
    expect(url).toContain('limit=5');
  });

  it('listProjects omits undefined params', async () => {
    const fn = mockFetch({ items: [], total: 0, limit: 20, offset: 0 });
    await listProjects({ sort: 'territory' });
    const url = fn.mock.calls[0][0] as string;
    expect(url).not.toContain('owner_handle');
    expect(url).not.toContain('tag=');
  });

  it('fetchActivity hits /activity with limit', async () => {
    const fn = mockFetch({ events: [] });
    await fetchActivity(10);
    expect(fn.mock.calls[0][0]).toContain('/api/activity?limit=10');
  });

  it('fetchUserProfile and fetchRelated hit the right paths', async () => {
    const fn = mockFetch({ items: [] });
    await fetchRelated('p1', 4);
    expect(fn.mock.calls[0][0]).toContain('/api/projects/p1/related?limit=4');
    mockFetch({ handle: 'alice', avatar_url: null, resurrection_count: 0, created_at: '', project_count: 0, territory_total: 0 });
    const prof = await fetchUserProfile('alice');
    expect(prof.handle).toBe('alice');
  });
});
