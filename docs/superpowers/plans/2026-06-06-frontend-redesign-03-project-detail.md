# Frontend Redesign — Plan 3: Project Detail Page (`/p/:id`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the BuildLog-style project detail page at `/p/:id`: a hero title + story, a stats strip (lifespan / momentum / territory / status), tech chips, an author card, the project link, Boost/Click/Resurrect actions, and a "More on the grid" list — all on the cream theme.

**Architecture:** A new `ProjectDetailPage` fetches the project by id (react-query, `fetchProject`). The interaction logic (Click/Boost/Resurrect with credits + cooldown) currently lives inline in `HoverCard`; we extract it into a reusable `useProjectInteractions(project)` hook so both `HoverCard` and the new `ProjectActions` share one implementation (DRY). "More on the grid" reuses the existing `useTopProjects` derivation from the grid snapshot (no recommendation endpoint exists). The author card shows what the API actually provides (`owner_id`); handle/avatar/follow are not available from the backend, so the Follow button is rendered disabled and marked `TODO`.

**Tech Stack:** React 18, react-router-dom, @tanstack/react-query, lucide-react, motion, Vitest + Testing Library. **Use yarn.**

**Spec:** `docs/superpowers/specs/2026-06-06-frontend-redesign-social-grid-design.md`

**Prereq:** Built on branch `redesign/social-ui` (Plan 1 + Plan 2 work present).

---

## Data Reality

`fetchProject(id)` returns the full `Project` (name, description, url, tech_tags, owner_id, status, expires_at, momentum, territory_size, color, created_at, died_at). There is **no endpoint to resolve another user's handle/avatar from `owner_id`**, and **no recommendation/list endpoint**. Therefore:
- **Author card:** show `owner_id` (shortened) or "You" when it's the current user's project. Follow button rendered **disabled** with `title="Coming soon"` and a `TODO: follow endpoint` comment.
- **More on the grid:** derived from `useTopProjects(snapshot)` (top territory projects), excluding the current id. Real data, bounded. Marked as "More on the grid" (not "recommended"), since it's territory-based, not similarity-based. `TODO: real recommendations endpoint`.

No fake data is invented.

---

## File Structure

- `frontend/src/hooks/useProjectInteractions.ts` — **new**: shared Click/Boost/Resurrect logic + derived flags
- `frontend/src/hooks/__tests__/useProjectInteractions.test.tsx` — **new**
- `frontend/src/components/HoverCard.tsx` — modify: consume the hook (remove its duplicated mutation/flag code)
- `frontend/src/components/ProjectActions.tsx` + `ProjectActions.css` — **new**: action buttons for the detail page, using the hook
- `frontend/src/pages/ProjectDetailPage.tsx` + `ProjectDetailPage.css` — **new**
- `frontend/src/pages/__tests__/ProjectDetailPage.test.tsx` — **new**
- `frontend/src/routes.tsx` — modify: `/p/:id` → `<ProjectDetailPage/>`

---

### Task 1: Extract `useProjectInteractions` hook

**Files:**
- Create: `frontend/src/hooks/useProjectInteractions.ts`
- Test: `frontend/src/hooks/__tests__/useProjectInteractions.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/hooks/__tests__/useProjectInteractions.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProjectInteractions } from '../useProjectInteractions';
import type { Project } from '../../types/api';

let authValue = { isLoggedIn: true, userId: 'me', credits: 500, adjustCredits: vi.fn() };
vi.mock('../useAuth', () => ({ useAuth: () => authValue }));

function project(over: Partial<Project> = {}): Project {
  return {
    id: 'p1', name: 'X', description: null, url: null, tech_tags: [],
    owner_id: 'other', status: 'alive', expires_at: '', momentum: 50,
    territory_size: 3, color: '#ac3509', created_at: '', died_at: null, ...over,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useProjectInteractions', () => {
  it('allows interacting with another live project when funded', () => {
    authValue = { isLoggedIn: true, userId: 'me', credits: 500, adjustCredits: vi.fn() };
    const { result } = renderHook(() => useProjectInteractions(project()), { wrapper });
    expect(result.current.isOwnProject).toBe(false);
    expect(result.current.showInteract).toBe(true);
    expect(result.current.canBoost).toBe(true);
    expect(result.current.canResurrect).toBe(false);
  });

  it('hides interactions on your own project', () => {
    authValue = { isLoggedIn: true, userId: 'me', credits: 500, adjustCredits: vi.fn() };
    const { result } = renderHook(() => useProjectInteractions(project({ owner_id: 'me' })), { wrapper });
    expect(result.current.isOwnProject).toBe(true);
    expect(result.current.showInteract).toBe(false);
  });

  it('offers resurrect on a dead project when funded, and not boost', () => {
    authValue = { isLoggedIn: true, userId: 'me', credits: 500, adjustCredits: vi.fn() };
    const { result } = renderHook(() => useProjectInteractions(project({ status: 'dead' })), { wrapper });
    expect(result.current.canResurrect).toBe(true);
    expect(result.current.canBoost).toBe(false);
    expect(result.current.showInteract).toBe(false);
  });

  it('blocks boost/resurrect when underfunded', () => {
    authValue = { isLoggedIn: true, userId: 'me', credits: 10, adjustCredits: vi.fn() };
    const { result } = renderHook(() => useProjectInteractions(project({ status: 'dead' })), { wrapper });
    expect(result.current.canResurrect).toBe(false);
    const live = renderHook(() => useProjectInteractions(project()), { wrapper });
    expect(live.result.current.canBoost).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && yarn vitest run src/hooks/__tests__/useProjectInteractions.test.tsx`
Expected: FAIL — cannot resolve `../useProjectInteractions`.

- [ ] **Step 3: Implement the hook**

Create `frontend/src/hooks/useProjectInteractions.ts`:

```ts
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { interact, resurrect } from '../api/interact';
import { useAuth } from './useAuth';
import type { Project } from '../types/api';

const CLICK_COOLDOWN_MS = 60_000;
const BOOST_COST = 20;
const RESURRECT_COST = 200;

/**
 * Shared Click / Boost / Resurrect logic and derived permission flags for a
 * project. Used by both the grid HoverCard and the detail page ProjectActions.
 */
export function useProjectInteractions(project: Project | undefined) {
  const { isLoggedIn, userId, credits, adjustCredits } = useAuth();
  const queryClient = useQueryClient();
  const [clickCooldownUntil, setClickCooldownUntil] = useState<number | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['project', project?.id] });
    queryClient.invalidateQueries({ queryKey: ['grid'] });
  };

  const clickMutation = useMutation({
    mutationFn: () => interact(project!.id, 'click'),
    onSuccess: (result) => {
      adjustCredits(result.credits_earned);
      setClickCooldownUntil(Date.now() + CLICK_COOLDOWN_MS);
      invalidate();
      setTimeout(() => setClickCooldownUntil(null), CLICK_COOLDOWN_MS);
    },
  });

  const boostMutation = useMutation({
    mutationFn: () => interact(project!.id, 'boost'),
    onSuccess: () => {
      adjustCredits(-BOOST_COST);
      invalidate();
    },
  });

  const resurrectMutation = useMutation({
    mutationFn: () => resurrect(project!.id),
    onSuccess: () => {
      adjustCredits(-RESURRECT_COST);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['myProject'] });
    },
  });

  const isOwnProject = !!userId && !!project && project.owner_id === userId;
  const inCooldown = !!clickCooldownUntil && Date.now() < clickCooldownUntil;
  const canBoost =
    isLoggedIn && !isOwnProject && !!project && credits >= BOOST_COST && project.status !== 'dead';
  const canResurrect =
    isLoggedIn && !!project && project.status === 'dead' && credits >= RESURRECT_COST;
  const showInteract =
    isLoggedIn && !isOwnProject && !!project && project.status !== 'dead';

  return {
    isOwnProject,
    inCooldown,
    canBoost,
    canResurrect,
    showInteract,
    credits,
    clickMutation,
    boostMutation,
    resurrectMutation,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && yarn vitest run src/hooks/__tests__/useProjectInteractions.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useProjectInteractions.ts frontend/src/hooks/__tests__/useProjectInteractions.test.tsx
git commit -m "feat(frontend): extract useProjectInteractions hook"
```

---

### Task 2: Refactor HoverCard to use the hook

**Files:**
- Modify: `frontend/src/components/HoverCard.tsx`

Behavior must stay identical (the existing HoverCard tests guard it). Read the current file first.

- [ ] **Step 1: Replace the inline logic with the hook**

In `frontend/src/components/HoverCard.tsx`:
- Remove the imports now provided by the hook: `useMutation`, `useQueryClient` from react-query, and `interact, resurrect` from `../api/interact`. Keep `useState`/`useCallback` (still used by the burst handler) and `useQuery` (still used to fetch the project) and `animate` from `motion/mini`.
- Add: `import { useProjectInteractions } from '../hooks/useProjectInteractions';`
- Delete the three `useMutation` blocks (`clickMutation`, `boostMutation`, `resurrectMutation`), the local `clickCooldownUntil` state, and the derived `const` flags (`isOwnProject`, `inCooldown`, `canBoost`, `canResurrect`, `showInteract`).
- After the existing `useQuery` that loads `project`, add:
  ```tsx
  const {
    isOwnProject, inCooldown, canBoost, canResurrect, showInteract, credits: liveCredits,
    clickMutation, boostMutation, resurrectMutation,
  } = useProjectInteractions(project);
  ```
- The `useAuth()` call currently destructures `isLoggedIn, userId, credits, adjustCredits`. Keep only what HoverCard still uses directly: `isLoggedIn` (for the "need 200₵" hint) and `credits` for that hint — but to avoid two credit sources, use `liveCredits` from the hook for the hint and drop `userId`/`adjustCredits`/`credits` from the `useAuth()` destructure. Update the insufficient-funds hint to use `liveCredits`.
- `handleClick` keeps the burst animation and calls `clickMutation.mutate()` exactly as before.
- All JSX (buttons, disabled conditions, lucide icons) stays the same, now reading the hook's flags.

- [ ] **Step 2: Verify HoverCard tests + build**

Run: `cd frontend && yarn vitest run src/components/__tests__/HoverCard.test.tsx && yarn build`
Expected: PASS (3 tests) + build success. If a test breaks, the refactor changed behavior — fix the component, not the test.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/HoverCard.tsx
git commit -m "refactor(frontend): HoverCard uses shared useProjectInteractions hook"
```

---

### Task 3: ProjectActions component

**Files:**
- Create: `frontend/src/components/ProjectActions.tsx`
- Create: `frontend/src/components/ProjectActions.css`
- Test: `frontend/src/components/__tests__/ProjectActions.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/__tests__/ProjectActions.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectActions } from '../ProjectActions';
import type { Project } from '../../types/api';

const flags = {
  isOwnProject: false, inCooldown: false, canBoost: true, canResurrect: false,
  showInteract: true, credits: 500,
  clickMutation: { mutate: vi.fn(), isPending: false },
  boostMutation: { mutate: vi.fn(), isPending: false },
  resurrectMutation: { mutate: vi.fn(), isPending: false },
};
vi.mock('../../hooks/useProjectInteractions', () => ({ useProjectInteractions: () => flags }));

function project(over: Partial<Project> = {}): Project {
  return {
    id: 'p1', name: 'X', description: null, url: null, tech_tags: [],
    owner_id: 'other', status: 'alive', expires_at: '', momentum: 50,
    territory_size: 3, color: '#ac3509', created_at: '', died_at: null, ...over,
  };
}

describe('ProjectActions', () => {
  it('renders Click and Boost for an interactable project', () => {
    render(<ProjectActions project={project()} />);
    expect(screen.getByRole('button', { name: /click/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /boost/i })).toBeInTheDocument();
  });

  it('fires the boost mutation when Boost is clicked', () => {
    render(<ProjectActions project={project()} />);
    screen.getByRole('button', { name: /boost/i }).click();
    expect(flags.boostMutation.mutate).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && yarn vitest run src/components/__tests__/ProjectActions.test.tsx`
Expected: FAIL — cannot resolve `../ProjectActions`.

- [ ] **Step 3: Implement**

Create `frontend/src/components/ProjectActions.css`:

```css
.project-actions { display: flex; flex-wrap: wrap; gap: 12px; }
.project-actions .btn { display: inline-flex; align-items: center; gap: 8px; }
.project-actions__hint { color: var(--text-muted); font-size: 13px; }
.project-actions__cost { font-family: var(--font-pixel); font-size: 16px; }
```

Create `frontend/src/components/ProjectActions.tsx`:

```tsx
import { Zap, Rocket, Sparkles, Hourglass } from 'lucide-react';
import { useProjectInteractions } from '../hooks/useProjectInteractions';
import type { Project } from '../types/api';
import './ProjectActions.css';

interface Props {
  project: Project;
}

export function ProjectActions({ project }: Props) {
  const {
    inCooldown, canBoost, canResurrect, showInteract, credits,
    clickMutation, boostMutation, resurrectMutation,
  } = useProjectInteractions(project);

  return (
    <div className="project-actions">
      {showInteract && (
        <>
          <button
            className="btn btn--secondary"
            onClick={() => clickMutation.mutate()}
            disabled={inCooldown || clickMutation.isPending}
            title={inCooldown ? 'Cooldown: wait 60s' : '+5 Momentum, +5 Credits'}
          >
            {inCooldown ? <Hourglass size={15} /> : <Zap size={15} />} Click
          </button>
          <button
            className="btn btn--primary"
            onClick={() => boostMutation.mutate()}
            disabled={!canBoost || boostMutation.isPending}
            title="Boost: 20 Credits → +25 Momentum, +30min"
          >
            <Rocket size={15} /> Boost <span className="project-actions__cost">20₵</span>
          </button>
        </>
      )}

      {canResurrect && (
        <button
          className="btn btn--primary"
          onClick={() => resurrectMutation.mutate()}
          disabled={resurrectMutation.isPending}
          title="Resurrect: 200 Credits → 24h timer, restore fossil cells"
        >
          <Sparkles size={15} /> Resurrect <span className="project-actions__cost">200₵</span>
        </button>
      )}

      {project.status === 'dead' && !canResurrect && (
        <p className="project-actions__hint">Need 200₵ to resurrect (you have {credits}).</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && yarn vitest run src/components/__tests__/ProjectActions.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ProjectActions.tsx frontend/src/components/ProjectActions.css frontend/src/components/__tests__/ProjectActions.test.tsx
git commit -m "feat(frontend): ProjectActions buttons for detail page"
```

---

### Task 4: ProjectDetailPage

**Files:**
- Create: `frontend/src/pages/ProjectDetailPage.tsx`
- Create: `frontend/src/pages/ProjectDetailPage.css`
- Test: `frontend/src/pages/__tests__/ProjectDetailPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/__tests__/ProjectDetailPage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Project } from '../../types/api';

const sample: Project = {
  id: 'p1', name: 'EchoFlow', description: 'A living knowledge agent.',
  url: 'https://echo.dev', tech_tags: ['React', 'GPT-4'], owner_id: 'me',
  status: 'alive', expires_at: new Date(Date.now() + 7200_000).toISOString(),
  momentum: 72, territory_size: 18, color: '#ac3509', created_at: '', died_at: null,
};

vi.mock('@tanstack/react-query', async (orig) => {
  const actual = await orig<typeof import('@tanstack/react-query')>();
  return { ...actual, useQuery: () => ({ data: sample, isLoading: false, isError: false }) };
});
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ isLoggedIn: true, userId: 'me', credits: 0, adjustCredits: vi.fn() }) }));
vi.mock('../../hooks/useGridPoll', () => ({ useGridPoll: () => ({ data: undefined }) }));
vi.mock('../../hooks/useTopProjects', () => ({ useTopProjects: () => [] }));
vi.mock('../../components/ProjectActions', () => ({ ProjectActions: () => <div data-testid="actions" /> }));

import ProjectDetailPage from '../ProjectDetailPage';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/p/:id" element={<ProjectDetailPage />} /></Routes>
    </MemoryRouter>
  );
}

describe('ProjectDetailPage', () => {
  it('renders the project title, story, stats and tech chips', () => {
    renderAt('/p/p1');
    expect(screen.getByRole('heading', { name: 'EchoFlow' })).toBeInTheDocument();
    expect(screen.getByText('A living knowledge agent.')).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();          // momentum
    expect(screen.getByText('18')).toBeInTheDocument();          // territory
    expect(screen.getByText('React')).toBeInTheDocument();       // tech chip
    expect(screen.getByTestId('actions')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && yarn vitest run src/pages/__tests__/ProjectDetailPage.test.tsx`
Expected: FAIL — cannot resolve `../ProjectDetailPage`.

- [ ] **Step 3: Implement the CSS**

Create `frontend/src/pages/ProjectDetailPage.css`:

```css
.detail { max-width: var(--container-max); margin: 0 auto; padding: var(--margin-desktop); }
.detail__grid { display: grid; grid-template-columns: 1fr 320px; gap: 32px; align-items: start; }
.detail__title { font-size: 40px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; margin-bottom: 12px; }
.detail__color-bar { height: 6px; width: 80px; border-radius: var(--radius-pill); margin-bottom: 20px; }
.detail__story { font-size: 18px; line-height: 1.7; color: var(--text); margin-bottom: 28px; }
.detail__stats { display: flex; gap: 28px; flex-wrap: wrap; padding: 20px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-card); margin-bottom: 28px; }
.detail__stat-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.detail__stat-value { font-family: var(--font-pixel); font-size: 28px; color: var(--text); }
.detail__chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 28px; }
.detail__chip { background: var(--surface-2); color: var(--text); border-radius: var(--radius-pill); padding: 6px 14px; font-size: 13px; font-weight: 600; }
.detail__card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-card); padding: 20px; margin-bottom: 20px; }
.detail__author-name { font-weight: 700; font-size: 16px; }
.detail__author-role { color: var(--text-muted); font-size: 13px; margin-bottom: 14px; }
.detail__link { display: flex; align-items: center; gap: 8px; color: var(--accent); text-decoration: none; font-weight: 600; padding: 8px 0; }
.detail__related-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; text-decoration: none; color: var(--text); }
.detail__related-row + .detail__related-row { border-top: 1px solid var(--border); }
.detail__status { display: inline-block; padding: 4px 12px; border-radius: var(--radius-pill); font-size: 12px; font-weight: 700; }
.detail__status--alive { background: color-mix(in srgb, var(--alive) 14%, white); color: var(--alive); }
.detail__status--dying { background: color-mix(in srgb, var(--dying) 16%, white); color: var(--dying); }
.detail__status--dead { background: var(--surface-2); color: var(--dead); }
.detail__back { color: var(--text-muted); text-decoration: none; font-size: 14px; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 20px; }
.detail__muted { color: var(--text-muted); }
```

- [ ] **Step 4: Implement the page**

Create `frontend/src/pages/ProjectDetailPage.tsx`:

```tsx
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, TrendingUp, Grid2x2, Flag, ExternalLink } from 'lucide-react';
import { fetchProject } from '../api/projects';
import { useAuth } from '../hooks/useAuth';
import { useGridPoll } from '../hooks/useGridPoll';
import { useTopProjects } from '../hooks/useTopProjects';
import { ProjectActions } from '../components/ProjectActions';
import { formatTimeLeft } from '../utils/time';
import './ProjectDetailPage.css';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { userId } = useAuth();
  const { data: snapshot } = useGridPoll();
  const top = useTopProjects(snapshot);

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });

  if (isLoading) return <main className="detail"><p className="detail__muted">Loading project…</p></main>;
  if (isError || !project) return <main className="detail"><p className="detail__muted">Project not found.</p></main>;

  const isOwn = !!userId && project.owner_id === userId;
  const related = top.filter(t => t.project && t.projectId !== project.id).slice(0, 4);

  return (
    <main className="detail">
      <Link to="/" className="detail__back"><ArrowLeft size={16} /> Back to grid</Link>
      <div className="detail__grid">
        <div>
          <h1 className="detail__title">{project.name}</h1>
          <div className="detail__color-bar" style={{ background: project.color }} />
          <span className={`detail__status detail__status--${project.status}`}>{project.status}</span>

          {project.description && <p className="detail__story" style={{ marginTop: 20 }}>{project.description}</p>}

          <div className="detail__stats">
            <div>
              <div className="detail__stat-label"><Clock size={13} /> Lifespan</div>
              <div className="detail__stat-value">{formatTimeLeft(project.expires_at)}</div>
            </div>
            <div>
              <div className="detail__stat-label"><TrendingUp size={13} /> Momentum</div>
              <div className="detail__stat-value">{project.momentum}</div>
            </div>
            <div>
              <div className="detail__stat-label"><Grid2x2 size={13} /> Territory</div>
              <div className="detail__stat-value">{project.territory_size}</div>
            </div>
          </div>

          {project.tech_tags.length > 0 && (
            <div className="detail__chips">
              {project.tech_tags.map(t => <span key={t} className="detail__chip">{t}</span>)}
            </div>
          )}

          <ProjectActions project={project} />
        </div>

        <aside>
          <div className="detail__card">
            <div className="detail__author-name">{isOwn ? 'You' : `Builder ${project.owner_id.slice(0, 6)}`}</div>
            <div className="detail__author-role">Project owner</div>
            <button className="btn btn--secondary" disabled title="Coming soon">
              <Flag size={14} /> Follow
            </button>
            {/* TODO: follow endpoint + resolve owner handle/avatar */}
          </div>

          {project.url && (
            <div className="detail__card">
              <a className="detail__link" href={project.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={16} /> {project.url.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}

          {related.length > 0 && (
            <div className="detail__card">
              <div className="detail__author-role" style={{ marginBottom: 8 }}>More on the grid</div>
              {/* TODO: real similarity-based recommendations endpoint */}
              {related.map(t => (
                <Link key={t.projectId} to={`/p/${t.projectId}`} className="detail__related-row">
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: t.color, flex: 'none' }} />
                  <span>{t.project!.name}</span>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && yarn vitest run src/pages/__tests__/ProjectDetailPage.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/ProjectDetailPage.tsx frontend/src/pages/ProjectDetailPage.css frontend/src/pages/__tests__/ProjectDetailPage.test.tsx
git commit -m "feat(frontend): project detail page"
```

---

### Task 5: Wire the route

**Files:**
- Modify: `frontend/src/routes.tsx`

- [ ] **Step 1: Point `/p/:id` at the page**

In `frontend/src/routes.tsx`, add `import ProjectDetailPage from './pages/ProjectDetailPage';` and change the `/p/:id` route element from `<Placeholder title="Project" />` to `<ProjectDetailPage />`. Leave the other placeholder routes untouched.

- [ ] **Step 2: Full suite + build**

Run: `cd frontend && yarn test && yarn build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 3: Manual smoke**

Run: `cd frontend && yarn dev`. From the home grid, click a populated cell's HoverCard project (or visit `/p/<an-id>`): the detail page shows title, color bar, status, story, stats (pixel-font numbers), tech chips, Click/Boost (or Resurrect) actions, author card with disabled Follow, project link, and "More on the grid". Verify Click/Boost still work (they share the hook with HoverCard).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes.tsx
git commit -m "feat(frontend): route /p/:id to ProjectDetailPage"
```

---

## Self-Review

- **Spec coverage:** big title + story ✓ (T4); stats lifespan/momentum/territory/status ✓ (T4); tech chips ✓ (T4); author card + Follow* (disabled, TODO) ✓ (T4); Boost/Click + Resurrect-if-dead ✓ (T3 via shared hook); "More like this" → "More on the grid" from derived data + TODO ✓ (T4); route wiring ✓ (T5).
- **DRY:** interaction logic extracted to `useProjectInteractions` (T1) and shared by HoverCard (T2) and ProjectActions (T3) — no duplicated mutation code.
- **Data honesty:** author handle/avatar and Follow are not faked (disabled + TODO); recommendations are honestly labelled "More on the grid" (territory-derived) with a TODO for a real endpoint. Matches the no-fake-facts rule.
- **Placeholder scan:** the `TODO` comments are intentional backend-gap markers; no unfinished plan steps.
- **Type consistency:** `useProjectInteractions(project)` return shape (flags + `clickMutation`/`boostMutation`/`resurrectMutation` + `credits`) is consumed identically by HoverCard (T2), ProjectActions (T3), and mocked the same way in tests. `fetchProject`, `formatTimeLeft`, `useTopProjects(snapshot)` signatures match earlier plans.
- **Risk note:** T2 refactors working code (HoverCard); the existing 3 HoverCard tests + build guard it. If they fail, fix the component, not the tests.
