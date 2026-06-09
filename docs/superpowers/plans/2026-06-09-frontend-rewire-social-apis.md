# Frontend Rewire — Consume Social Read APIs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the frontend's client-side stopgaps (grid-snapshot-derived Trending/Top Builders, snapshot-diff Live Activity, degraded other-user profiles, "More on the grid") with the real backend endpoints shipped in Spec A.

**Architecture:** Add a small `api/social.ts` client + thin react-query hooks, then rewire the Sidebar/HomePage, ProjectDetailPage, and ProfilePage to use them. Remove the now-dead derivation modules (`useTopProjects`, `lib/gridStats`, `lib/activityFeed`) once nothing references them.

**Tech Stack:** React 18, react-router-dom, @tanstack/react-query, lucide-react, Vitest + Testing Library. **Use yarn.**

**Backend endpoints (live on main):** `GET /api/projects?status&sort&owner_handle&tag&limit&offset` → `{items,total,limit,offset}`; `GET /api/users/{handle}` → public profile; `GET /api/activity?limit` → `{events}`; `GET /api/projects/{id}/related?limit` → `{items}`.

**Prereq:** Built on `main` (backend Spec A merged). Work on a branch `frontend/social-rewire`.

---

## File Structure

- `frontend/src/api/social.ts` — **new**: `listProjects`, `fetchActivity`, `fetchUserProfile`, `fetchRelated` + their response types
- `frontend/src/hooks/useProjects.ts` — **new**: `useProjects(params)`
- `frontend/src/hooks/useActivity.ts` — **new**: `useActivity()`
- `frontend/src/hooks/useRelated.ts` — **new**: `useRelated(id)`
- `frontend/src/hooks/useUserProfile.ts` — **new**: `useUserProfile(handle)`
- `frontend/src/components/Sidebar.tsx` + test — rewire to real `Project[]` + API activity
- `frontend/src/pages/HomePage.tsx` + test — feed Sidebar from new hooks; drop `useTopProjects` + activity diff
- `frontend/src/pages/ProjectDetailPage.tsx` + test — related from `useRelated`
- `frontend/src/pages/ProfilePage.tsx` + test — real other-user profiles + fossil graveyard
- **Delete** (after rewire): `frontend/src/hooks/useTopProjects.ts`, `frontend/src/lib/gridStats.ts`(+test), `frontend/src/lib/activityFeed.ts`(+test)

---

### Task 1: Social API client

**Files:**
- Create: `frontend/src/api/social.ts`
- Test: `frontend/src/api/__tests__/social.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/api/__tests__/social.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && yarn vitest run src/api/__tests__/social.test.ts`
Expected: FAIL — cannot resolve `../social`.

- [ ] **Step 3: Implement**

Create `frontend/src/api/social.ts`:

```ts
import { apiFetch } from './client';
import type { Project } from '../types/api';

export interface ProjectListResponse {
  items: Project[];
  total: number;
  limit: number;
  offset: number;
}

export interface ActivityEventApi {
  type: 'claimed' | 'faded' | 'boosted';
  project_id: string;
  project_name: string;
  color: string;
  actor_handle: string | null;
  at: string;
}

export interface ActivityResponse {
  events: ActivityEventApi[];
}

export interface UserProfile {
  handle: string;
  avatar_url: string | null;
  resurrection_count: number;
  created_at: string;
  project_count: number;
  territory_total: number;
}

export interface ListParams {
  status?: 'active' | 'alive' | 'dying' | 'dead' | 'all';
  sort?: 'momentum' | 'recent' | 'territory';
  owner_handle?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function listProjects(params: ListParams = {}): Promise<ProjectListResponse> {
  return apiFetch<ProjectListResponse>(`/projects${qs(params as Record<string, string | number | undefined>)}`);
}

export function fetchActivity(limit = 20): Promise<ActivityResponse> {
  return apiFetch<ActivityResponse>(`/activity${qs({ limit })}`);
}

export function fetchUserProfile(handle: string): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/users/${encodeURIComponent(handle)}`);
}

export function fetchRelated(id: string, limit = 4): Promise<{ items: Project[] }> {
  return apiFetch<{ items: Project[] }>(`/projects/${id}/related${qs({ limit })}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && yarn vitest run src/api/__tests__/social.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/social.ts frontend/src/api/__tests__/social.test.ts
git commit -m "feat(frontend): social API client (projects/activity/users/related)"
```

---

### Task 2: react-query hooks

**Files:**
- Create: `frontend/src/hooks/useProjects.ts`, `useActivity.ts`, `useRelated.ts`, `useUserProfile.ts`

- [ ] **Step 1: Implement the four hooks**

Create `frontend/src/hooks/useProjects.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { listProjects, type ListParams } from '../api/social';

export function useProjects(params: ListParams) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => listProjects(params),
    staleTime: 10_000,
  });
}
```

Create `frontend/src/hooks/useActivity.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchActivity } from '../api/social';

export function useActivity(limit = 12) {
  return useQuery({
    queryKey: ['activity', limit],
    queryFn: () => fetchActivity(limit),
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
  });
}
```

Create `frontend/src/hooks/useRelated.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchRelated } from '../api/social';

export function useRelated(id: string | undefined, limit = 4) {
  return useQuery({
    queryKey: ['related', id, limit],
    queryFn: () => fetchRelated(id!, limit),
    enabled: !!id,
    staleTime: 30_000,
  });
}
```

Create `frontend/src/hooks/useUserProfile.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchUserProfile } from '../api/social';

export function useUserProfile(handle: string | undefined) {
  return useQuery({
    queryKey: ['userProfile', handle],
    queryFn: () => fetchUserProfile(handle!),
    enabled: !!handle,
    retry: false, // a 404 (unknown handle) should not retry
    staleTime: 30_000,
  });
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && yarn build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useProjects.ts frontend/src/hooks/useActivity.ts frontend/src/hooks/useRelated.ts frontend/src/hooks/useUserProfile.ts
git commit -m "feat(frontend): react-query hooks for social endpoints"
```

---

### Task 3: Rewire Sidebar + HomePage

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx`
- Modify: `frontend/src/components/__tests__/Sidebar.test.tsx`
- Modify: `frontend/src/pages/HomePage.tsx`
- Modify: `frontend/src/pages/__tests__/HomePage.test.tsx`

- [ ] **Step 1: Rewrite the Sidebar test for the new props**

Replace `frontend/src/components/__tests__/Sidebar.test.tsx` with:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import type { Project } from '../../types/api';
import type { ActivityEventApi } from '../../api/social';

function project(over: Partial<Project>): Project {
  return {
    id: 'a', name: 'EchoFlow', description: null, url: null, tech_tags: [],
    owner_id: 'u1', status: 'alive', expires_at: '', momentum: 80,
    territory_size: 30, color: '#ac3509', created_at: '', died_at: null, ...over,
  };
}

const trending = [project({ id: 'a', name: 'EchoFlow', momentum: 80 })];
const builders = [project({ id: 'b', name: 'HabitLoop', territory_size: 40, color: '#006a63' })];
const activity: ActivityEventApi[] = [
  { type: 'boosted', project_id: 'a', project_name: 'EchoFlow', color: '#ac3509', actor_handle: 'bob', at: '2026-06-09T00:00:00Z' },
];

describe('Sidebar', () => {
  it('renders trending, top builders and activity from props', () => {
    render(<MemoryRouter><Sidebar trending={trending} builders={builders} activity={activity} /></MemoryRouter>);
    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.getByText('Top Builders')).toBeInTheDocument();
    expect(screen.getByText('Live Activity')).toBeInTheDocument();
    expect(screen.getByText('EchoFlow')).toBeInTheDocument();
    expect(screen.getByText('HabitLoop')).toBeInTheDocument();
    expect(screen.getByText(/boosted/i)).toBeInTheDocument();
  });

  it('shows empty hints when there is no data', () => {
    render(<MemoryRouter><Sidebar trending={[]} builders={[]} activity={[]} /></MemoryRouter>);
    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && yarn vitest run src/components/__tests__/Sidebar.test.tsx`
Expected: FAIL (Sidebar still takes the old `top` prop).

- [ ] **Step 3: Rewrite Sidebar.tsx**

Replace `frontend/src/components/Sidebar.tsx` with:

```tsx
import { Link } from 'react-router-dom';
import { TrendingUp, Trophy, Radio } from 'lucide-react';
import type { Project } from '../types/api';
import type { ActivityEventApi } from '../api/social';
import './Sidebar.css';

interface Props {
  trending: Project[];
  builders: Project[];
  activity: ActivityEventApi[];
}

function activityLabel(e: ActivityEventApi): string {
  if (e.type === 'boosted') {
    const who = e.actor_handle ? `@${e.actor_handle}` : 'Someone';
    return `${who} boosted ${e.project_name}`;
  }
  if (e.type === 'claimed') return `${e.project_name} claimed new territory`;
  return `${e.project_name} faded from the grid`;
}

export function Sidebar({ trending, builders, activity }: Props) {
  return (
    <aside className="sidebar">
      <section className="side-panel">
        <h3 className="side-panel__title"><TrendingUp size={18} /> Trending</h3>
        {trending.length === 0 && <p className="side-empty">No momentum yet.</p>}
        {trending.slice(0, 5).map(p => (
          <Link key={p.id} to={`/p/${p.id}`} className="side-row">
            <span className="side-row__swatch" style={{ background: p.color }} />
            <span className="side-row__name">{p.name}</span>
            <span className="side-row__metric">{p.momentum}</span>
          </Link>
        ))}
      </section>

      <section className="side-panel">
        <h3 className="side-panel__title"><Trophy size={18} /> Top Builders</h3>
        {builders.length === 0 && <p className="side-empty">No territory claimed yet.</p>}
        {builders.slice(0, 5).map(p => (
          <Link key={p.id} to={`/p/${p.id}`} className="side-row">
            <span className="side-row__swatch" style={{ background: p.color }} />
            <span className="side-row__name">{p.name}</span>
            <span className="side-row__metric">{p.territory_size}</span>
          </Link>
        ))}
      </section>

      <section className="side-panel">
        <h3 className="side-panel__title"><Radio size={18} /> Live Activity</h3>
        {activity.length === 0 && <p className="side-empty">No activity yet.</p>}
        {activity.slice(0, 8).map((e, i) => (
          <Link key={`${e.project_id}-${e.at}-${i}`} to={`/p/${e.project_id}`} className="side-row">
            <span className="side-row__name">{activityLabel(e)}</span>
          </Link>
        ))}
      </section>
    </aside>
  );
}
```

- [ ] **Step 4: Rewrite HomePage to feed the Sidebar from hooks**

In `frontend/src/pages/HomePage.tsx`:
- Remove imports/usage of `useTopProjects`, `diffSnapshots`/`ActivityEvent` from `../lib/activityFeed`, the `prevCells` ref, the `activity` `useState`, and the activity-accumulation `useEffect`.
- Add imports: `import { useProjects } from '../hooks/useProjects';` and `import { useActivity } from '../hooks/useActivity';`
- Replace the `const top = useTopProjects(snapshot);` line and the activity effect with:

```tsx
  const { data: trending } = useProjects({ sort: 'momentum', status: 'active', limit: 5 });
  const { data: builders } = useProjects({ sort: 'territory', status: 'active', limit: 5 });
  const { data: activity } = useActivity(12);
```

- Change the Sidebar render to:

```tsx
      <Sidebar
        trending={trending?.items ?? []}
        builders={builders?.items ?? []}
        activity={activity?.events ?? []}
      />
```

(Keep everything else in HomePage — grid, HoverCard, ProjectPanel, mobile guard — unchanged.)

- [ ] **Step 5: Update the HomePage test mocks**

In `frontend/src/pages/__tests__/HomePage.test.tsx`, replace the `useTopProjects` mock with mocks for the new hooks:

```tsx
vi.mock('../../hooks/useProjects', () => ({ useProjects: () => ({ data: { items: [] } }) }));
vi.mock('../../hooks/useActivity', () => ({ useActivity: () => ({ data: { events: [] } }) }));
```
Remove the old `vi.mock('../../hooks/useTopProjects', ...)` line. Keep the existing `useAuth`/`useGridPoll` mocks and the assertions (loading grid + "Trending" present).

- [ ] **Step 6: Run the affected tests + build**

Run: `cd frontend && yarn vitest run src/components/__tests__/Sidebar.test.tsx src/pages/__tests__/HomePage.test.tsx && yarn build`
Expected: PASS + build success.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/Sidebar.tsx frontend/src/components/__tests__/Sidebar.test.tsx frontend/src/pages/HomePage.tsx frontend/src/pages/__tests__/HomePage.test.tsx
git commit -m "feat(frontend): Sidebar + HomePage consume real projects/activity endpoints"
```

---

### Task 4: Rewire ProjectDetailPage "related"

**Files:**
- Modify: `frontend/src/pages/ProjectDetailPage.tsx`
- Modify: `frontend/src/pages/__tests__/ProjectDetailPage.test.tsx`

- [ ] **Step 1: Update the test mocks**

In `frontend/src/pages/__tests__/ProjectDetailPage.test.tsx`:
- Remove the `useGridPoll` and `useTopProjects` mocks.
- Add: `vi.mock('../../hooks/useRelated', () => ({ useRelated: () => ({ data: { items: [] } }) }));`
(The existing test asserts title/story/stats/chips/actions — those still hold with no related items.)

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && yarn vitest run src/pages/__tests__/ProjectDetailPage.test.tsx`
Expected: FAIL (page still imports `useGridPoll`/`useTopProjects`).

- [ ] **Step 3: Rewire the page**

In `frontend/src/pages/ProjectDetailPage.tsx`:
- Remove imports of `useGridPoll` and `useTopProjects`.
- Add: `import { useRelated } from '../hooks/useRelated';`
- Replace:
  ```tsx
  const { data: snapshot } = useGridPoll();
  const top = useTopProjects(snapshot);
  ```
  with:
  ```tsx
  const { data: relatedData } = useRelated(id);
  ```
- Replace the `const related = top.filter(...)...` line with:
  ```tsx
  const related = (relatedData?.items ?? []).filter(p => p.id !== project.id).slice(0, 4);
  ```
- Update the related render block to use `Project` fields directly (each item is a full `Project`, not a `TopProject`):
  ```tsx
  {related.map(p => (
    <Link key={p.id} to={`/p/${p.id}`} className="detail__related-row">
      <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flex: 'none' }} />
      <span>{p.name}</span>
    </Link>
  ))}
  ```
  (Remove the `t.project!.name`/`t.projectId`/`t.color` references.) Keep the `{related.length > 0 && (...)}` guard and the "More on the grid" heading.

- [ ] **Step 4: Run test + build**

Run: `cd frontend && yarn vitest run src/pages/__tests__/ProjectDetailPage.test.tsx && yarn build`
Expected: PASS + build success.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ProjectDetailPage.tsx frontend/src/pages/__tests__/ProjectDetailPage.test.tsx
git commit -m "feat(frontend): project detail related uses /projects/{id}/related"
```

---

### Task 5: Rewire ProfilePage — real other-user profiles + graveyard

**Files:**
- Modify: `frontend/src/pages/ProfilePage.tsx`
- Modify: `frontend/src/pages/__tests__/ProfilePage.test.tsx`

The page currently only renders the logged-in user's own profile and degrades for everyone else. Now any handle resolves via `useUserProfile`, and the builder's projects come from `useProjects({ owner_handle })`.

- [ ] **Step 1: Rewrite the test**

Replace `frontend/src/pages/__tests__/ProfilePage.test.tsx` with:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { UserProfile } from '../../api/social';
import type { Project } from '../../types/api';

let profile: { data: UserProfile | undefined; isLoading: boolean; isError: boolean } = {
  data: { handle: 'alice', avatar_url: null, resurrection_count: 2, created_at: '', project_count: 1, territory_total: 24 },
  isLoading: false, isError: false,
};
vi.mock('../../hooks/useUserProfile', () => ({ useUserProfile: () => profile }));

const proj: Project = {
  id: 'p1', name: 'EchoFlow', description: null, url: null, tech_tags: [],
  owner_id: 'u1', status: 'alive', expires_at: '', momentum: 50, territory_size: 24,
  color: '#ac3509', created_at: '', died_at: null,
};
let projects: { data: { items: Project[] } | undefined } = { data: { items: [proj] } };
vi.mock('../../hooks/useProjects', () => ({ useProjects: () => projects }));

import ProfilePage from '../ProfilePage';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/u/:handle" element={<ProfilePage />} /></Routes>
    </MemoryRouter>
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    profile = { data: { handle: 'alice', avatar_url: null, resurrection_count: 2, created_at: '', project_count: 1, territory_total: 24 }, isLoading: false, isError: false };
    projects = { data: { items: [proj] } };
  });

  it('renders any builder profile with stats and projects', () => {
    renderAt('/u/alice');
    expect(screen.getByRole('heading', { name: /alice/ })).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();    // resurrections
    expect(screen.getByText('24')).toBeInTheDocument();   // territory_total
    expect(screen.getByText('EchoFlow')).toBeInTheDocument();
  });

  it('shows not-found when the handle does not resolve', () => {
    profile = { data: undefined, isLoading: false, isError: true };
    projects = { data: { items: [] } };
    renderAt('/u/ghost');
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && yarn vitest run src/pages/__tests__/ProfilePage.test.tsx`
Expected: FAIL (page uses `useMe`/`useMyProject`, not the new hooks).

- [ ] **Step 3: Rewrite ProfilePage.tsx**

Replace `frontend/src/pages/ProfilePage.tsx` with:

```tsx
import { useParams, Link } from 'react-router-dom';
import { Coins, Sparkles, Grid2x2 } from 'lucide-react';
import { useUserProfile } from '../hooks/useUserProfile';
import { useProjects } from '../hooks/useProjects';
import './ProfilePage.css';

export default function ProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const { data: profile, isLoading, isError } = useUserProfile(handle);
  const { data: projectsData } = useProjects({ owner_handle: handle, status: 'all', sort: 'recent' });

  if (isLoading) return <main className="profile"><p className="profile__empty">Loading…</p></main>;
  if (isError || !profile) {
    return (
      <main className="profile">
        <div className="profile__degraded">
          <h1>@{handle}</h1>
          <p>Builder not found.</p>
        </div>
      </main>
    );
  }

  const projects = projectsData?.items ?? [];
  const living = projects.filter(p => p.status !== 'dead');
  const fossils = projects.filter(p => p.status === 'dead');
  const initial = profile.handle.charAt(0).toUpperCase();

  return (
    <main className="profile">
      <header className="profile__header">
        {profile.avatar_url
          ? <img className="profile__avatar" src={profile.avatar_url} alt="" />
          : <div className="profile__avatar">{initial}</div>}
        <div>
          <h1 className="profile__handle">@{profile.handle}</h1>
          <p className="profile__sub">Digital Darwinism builder</p>
        </div>
      </header>

      <div className="profile__stats">
        <div className="profile__stat">
          <div className="profile__stat-label"><Coins size={13} /> Projects</div>
          <div className="profile__stat-value">{profile.project_count}</div>
        </div>
        <div className="profile__stat">
          <div className="profile__stat-label"><Sparkles size={13} /> Resurrections</div>
          <div className="profile__stat-value">{profile.resurrection_count}</div>
        </div>
        <div className="profile__stat">
          <div className="profile__stat-label"><Grid2x2 size={13} /> Territory</div>
          <div className="profile__stat-value">{profile.territory_total}</div>
        </div>
      </div>

      <h2 className="profile__section-title">Projects</h2>
      {living.length === 0 && <p className="profile__empty">No active projects.</p>}
      {living.map(p => (
        <Link key={p.id} to={`/p/${p.id}`} className="profile__project">
          <span className="profile__project-swatch" style={{ background: p.color }} />
          <span className="profile__project-name">{p.name}</span>
          <span className={`profile__status profile__status--${p.status}`}>{p.status}</span>
        </Link>
      ))}

      {fossils.length > 0 && (
        <>
          <h2 className="profile__section-title" style={{ marginTop: 28 }}>Fossil graveyard</h2>
          {fossils.map(p => (
            <Link key={p.id} to={`/p/${p.id}`} className="profile__project">
              <span className="profile__project-swatch" style={{ background: p.color }} />
              <span className="profile__project-name">{p.name}</span>
              <span className="profile__status profile__status--dead">dead</span>
            </Link>
          ))}
        </>
      )}
    </main>
  );
}
```

(`Coins` is reused for the Projects stat — credits are intentionally not shown on public profiles. `useAuth`/`useMe`/`useMyProject` are no longer imported here.)

- [ ] **Step 4: Run test + build**

Run: `cd frontend && yarn vitest run src/pages/__tests__/ProfilePage.test.tsx && yarn build`
Expected: PASS + build success.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ProfilePage.tsx frontend/src/pages/__tests__/ProfilePage.test.tsx
git commit -m "feat(frontend): profile page shows real builder profiles + fossil graveyard"
```

---

### Task 6: Remove dead derivation code

**Files:**
- Delete: `frontend/src/hooks/useTopProjects.ts`
- Delete: `frontend/src/hooks/useMe.ts` (only consumer was ProfilePage, rewired in Task 5)
- Delete: `frontend/src/lib/gridStats.ts`, `frontend/src/lib/gridStats.test.ts`
- Delete: `frontend/src/lib/activityFeed.ts`, `frontend/src/lib/activityFeed.test.ts`

- [ ] **Step 1: Confirm nothing imports them**

Run: `cd frontend && grep -rn "useTopProjects\|gridStats\|activityFeed" src; grep -rn "useMe\b" src | grep -v useMemo`
Expected: no matches (all consumers were rewired in Tasks 3–5). If any remain, fix that consumer before deleting.

- [ ] **Step 2: Delete the files**

```bash
git rm frontend/src/hooks/useTopProjects.ts frontend/src/hooks/useMe.ts frontend/src/lib/gridStats.ts frontend/src/lib/gridStats.test.ts frontend/src/lib/activityFeed.ts frontend/src/lib/activityFeed.test.ts
```

- [ ] **Step 3: Full suite + build**

Run: `cd frontend && yarn test && yarn build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 4: Manual smoke**

Run: `cd frontend && yarn dev`. Home sidebar shows real Trending/Top Builders/Live Activity from the API; a project page shows real "More on the grid"; visiting `/u/<any handle>` shows that builder's real profile + fossil graveyard (or "Builder not found" for a bad handle).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(frontend): remove grid-snapshot derivation now replaced by real endpoints"
```

---

## Self-Review

- **Coverage:** Trending/Top Builders → `useProjects` (Task 3); Live Activity → `useActivity` (Task 3); related → `useRelated` (Task 4); other-user profiles + graveyard → `useUserProfile` + `useProjects` (Task 5); dead code removed (Task 6).
- **Placeholder scan:** no TBD/TODO; every step has full code or an exact command.
- **Type consistency:** `ProjectListResponse`/`ActivityEventApi`/`UserProfile`/`ListParams` defined in Task 1 (`api/social.ts`) and consumed by hooks (Task 2) and components (Tasks 3–5). Sidebar's new props (`trending`/`builders`/`activity`) match HomePage's render. `ActivityEventApi` (type/project_id/project_name/color/actor_handle/at) is the shape used in Sidebar and its test.
- **Backend dependency:** requires the deployed backend to have Spec A endpoints (merged to main; will be live once Railway redeploys). Tests mock the hooks/fetch, so they don't need a live backend.
- **Note:** `useMe` stays (used elsewhere? verify) — it was added in the profile plan and is now unused by ProfilePage; Task 6's grep step will catch it if it's fully orphaned. If `useMe` has no other consumer, delete it too in Task 6.
