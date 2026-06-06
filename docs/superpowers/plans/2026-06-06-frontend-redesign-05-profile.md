# Frontend Redesign — Plan 5: Profile Page (`/u/:handle`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the profile page at `/u/:handle`: avatar, handle, and stats (credits, resurrections, current project's territory & status) plus the user's project card. Fully real for the **logged-in user's own** profile; gracefully degraded for other handles (no backend endpoint yet).

**Architecture:** A new `ProfilePage` reads the `:handle` route param and compares it to the logged-in user's handle (`useAuth`). For the own profile it fetches `Me` via a new `useMe` hook (`fetchMe`, gives avatar/credits/resurrection_count) and the user's project via `useMyProject`. For any other handle there is no fetch-by-handle endpoint, so it renders an honest "not available yet" state with a `TODO`. The header's `@handle` becomes a link to the own profile so the page is reachable.

**Tech Stack:** React 18, react-router-dom, @tanstack/react-query, lucide-react, Vitest + Testing Library. **Use yarn.**

**Spec:** `docs/superpowers/specs/2026-06-06-frontend-redesign-social-grid-design.md`

**Prereq:** Built on branch `redesign/social-ui` (Plans 1–4 present).

---

## Data Reality

Available: `GET /auth/me` (`fetchMe` → `Me { id, handle, email, avatar_url, credits, resurrection_count }`) — **self only**; `GET /projects/mine` (`fetchMyProject` → `Project | null`). There is **no fetch-user-by-handle endpoint** and **no list of a user's past/dead projects**. Therefore:
- **Own profile** (`:handle` === your handle, logged in): fully real — avatar, handle, credits, resurrections, and your current project (territory, status). A "fossil graveyard" of past dead projects is **omitted** (no endpoint) with a `TODO`; the single current project is shown whatever its status.
- **Other handle:** rendered as "This builder's profile isn't public yet" with the `@handle` echoed and a `TODO: user-by-handle endpoint`. No fabricated stats.

---

## File Structure

- `frontend/src/hooks/useMe.ts` — **new**: react-query wrapper over `fetchMe`
- `frontend/src/pages/ProfilePage.tsx` + `ProfilePage.css` — **new**
- `frontend/src/pages/__tests__/ProfilePage.test.tsx` — **new**
- `frontend/src/components/LoginButton.tsx` — modify: make `@handle` a Link to `/u/:handle`
- `frontend/src/routes.tsx` — modify: `/u/:handle` → `<ProfilePage/>`

---

### Task 1: useMe hook

**Files:**
- Create: `frontend/src/hooks/useMe.ts`

- [ ] **Step 1: Implement**

Create `frontend/src/hooks/useMe.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '../api/projects';
import { useAuth } from './useAuth';

/** The logged-in user's full account record (avatar, credits, resurrections). */
export function useMe() {
  const { isLoggedIn } = useAuth();
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: isLoggedIn,
    staleTime: 30_000,
  });
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && yarn build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useMe.ts
git commit -m "feat(frontend): useMe hook"
```

---

### Task 2: ProfilePage

**Files:**
- Create: `frontend/src/pages/ProfilePage.tsx`
- Create: `frontend/src/pages/ProfilePage.css`
- Test: `frontend/src/pages/__tests__/ProfilePage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/__tests__/ProfilePage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Me, Project } from '../../types/api';

let auth = { isLoggedIn: true, handle: 'alice' };
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => auth }));

const me: Me = { id: 'u1', handle: 'alice', email: null, avatar_url: null, credits: 320, resurrection_count: 2 };
let meData: Me | undefined = me;
vi.mock('../../hooks/useMe', () => ({ useMe: () => ({ data: meData, isLoading: false }) }));

const project: Project = {
  id: 'p1', name: 'EchoFlow', description: null, url: null, tech_tags: [],
  owner_id: 'u1', status: 'alive', expires_at: '', momentum: 50, territory_size: 24,
  color: '#ac3509', created_at: '', died_at: null,
};
let myProjectData: Project | null = project;
vi.mock('../../hooks/useMyProject', () => ({ useMyProject: () => ({ data: myProjectData, isLoading: false }) }));

import ProfilePage from '../ProfilePage';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/u/:handle" element={<ProfilePage />} /></Routes>
    </MemoryRouter>
  );
}

describe('ProfilePage', () => {
  beforeEach(() => { auth = { isLoggedIn: true, handle: 'alice' }; meData = me; myProjectData = project; });

  it('shows own profile with handle, stats and project', () => {
    renderAt('/u/alice');
    expect(screen.getByRole('heading', { name: /alice/ })).toBeInTheDocument();
    expect(screen.getByText('320')).toBeInTheDocument();   // credits
    expect(screen.getByText('2')).toBeInTheDocument();     // resurrections
    expect(screen.getByText('24')).toBeInTheDocument();    // territory
    expect(screen.getByText('EchoFlow')).toBeInTheDocument();
  });

  it('shows a degraded state for another builder', () => {
    renderAt('/u/bob');
    expect(screen.getByText(/isn't public yet/i)).toBeInTheDocument();
    expect(screen.getByText(/@bob/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && yarn vitest run src/pages/__tests__/ProfilePage.test.tsx`
Expected: FAIL — cannot resolve `../ProfilePage`.

- [ ] **Step 3: Implement the CSS**

Create `frontend/src/pages/ProfilePage.css`:

```css
.profile { max-width: 920px; margin: 0 auto; padding: var(--margin-desktop); }
.profile__header { display: flex; align-items: center; gap: 20px; margin-bottom: 32px; }
.profile__avatar {
  width: 80px; height: 80px; border-radius: var(--radius-pill);
  object-fit: cover; background: var(--surface-2);
  display: flex; align-items: center; justify-content: center;
  font-size: 32px; font-weight: 700; color: var(--accent); flex: none;
}
.profile__handle { font-size: 32px; font-weight: 700; letter-spacing: -0.02em; }
.profile__sub { color: var(--text-muted); font-size: 14px; }
.profile__stats { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 32px; }
.profile__stat {
  flex: 1; min-width: 140px;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  box-shadow: var(--shadow-card); padding: 18px;
}
.profile__stat-label { display: flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
.profile__stat-value { font-family: var(--font-pixel); font-size: 30px; color: var(--text); }
.profile__section-title { font-size: 18px; font-weight: 700; margin-bottom: 14px; }
.profile__project {
  display: flex; align-items: center; gap: 14px; text-decoration: none; color: var(--text);
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  box-shadow: var(--shadow-card); padding: 18px;
}
.profile__project-swatch { width: 14px; height: 14px; border-radius: 4px; flex: none; }
.profile__project-name { font-weight: 700; font-size: 16px; flex: 1; }
.profile__status { padding: 3px 10px; border-radius: var(--radius-pill); font-size: 12px; font-weight: 700; }
.profile__status--alive { background: color-mix(in srgb, var(--alive) 14%, white); color: var(--alive); }
.profile__status--dying { background: color-mix(in srgb, var(--dying) 16%, white); color: var(--dying); }
.profile__status--dead { background: var(--surface-2); color: var(--dead); }
.profile__empty, .profile__degraded { color: var(--text-muted); padding: 48px; text-align: center; }
.profile__degraded h1 { color: var(--text); font-size: 28px; margin-bottom: 8px; }
```

- [ ] **Step 4: Implement the page**

Create `frontend/src/pages/ProfilePage.tsx`:

```tsx
import { useParams, Link } from 'react-router-dom';
import { Coins, Sparkles, Grid2x2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMe } from '../hooks/useMe';
import { useMyProject } from '../hooks/useMyProject';
import './ProfilePage.css';

export default function ProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const { isLoggedIn, handle: myHandle } = useAuth();
  const { data: me, isLoading: meLoading } = useMe();
  const { data: project, isLoading: projectLoading } = useMyProject();

  const isOwn = isLoggedIn && !!handle && handle === myHandle;

  if (!isOwn) {
    // No fetch-user-by-handle endpoint exists yet.
    // TODO: real user-by-handle endpoint for viewing other builders.
    return (
      <main className="profile">
        <div className="profile__degraded">
          <h1>@{handle}</h1>
          <p>This builder's profile isn't public yet.</p>
        </div>
      </main>
    );
  }

  if (meLoading || projectLoading) return <main className="profile"><p className="profile__empty">Loading…</p></main>;

  const initial = (me?.handle ?? handle ?? '?').charAt(0).toUpperCase();

  return (
    <main className="profile">
      <header className="profile__header">
        {me?.avatar_url
          ? <img className="profile__avatar" src={me.avatar_url} alt="" />
          : <div className="profile__avatar">{initial}</div>}
        <div>
          <h1 className="profile__handle">@{me?.handle ?? handle}</h1>
          <p className="profile__sub">Digital Darwinism builder</p>
        </div>
      </header>

      <div className="profile__stats">
        <div className="profile__stat">
          <div className="profile__stat-label"><Coins size={13} /> Credits</div>
          <div className="profile__stat-value">{me?.credits ?? 0}</div>
        </div>
        <div className="profile__stat">
          <div className="profile__stat-label"><Sparkles size={13} /> Resurrections</div>
          <div className="profile__stat-value">{me?.resurrection_count ?? 0}</div>
        </div>
        <div className="profile__stat">
          <div className="profile__stat-label"><Grid2x2 size={13} /> Territory</div>
          <div className="profile__stat-value">{project?.territory_size ?? 0}</div>
        </div>
      </div>

      <h2 className="profile__section-title">Project</h2>
      {/* TODO: fossil graveyard of past dead projects needs a backend endpoint */}
      {project ? (
        <Link to={`/p/${project.id}`} className="profile__project">
          <span className="profile__project-swatch" style={{ background: project.color }} />
          <span className="profile__project-name">{project.name}</span>
          <span className={`profile__status profile__status--${project.status}`}>{project.status}</span>
        </Link>
      ) : (
        <p className="profile__empty">No territory claimed yet. <Link to="/submit">Claim a cell →</Link></p>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && yarn vitest run src/pages/__tests__/ProfilePage.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/ProfilePage.tsx frontend/src/pages/ProfilePage.css frontend/src/pages/__tests__/ProfilePage.test.tsx
git commit -m "feat(frontend): profile page (own profile real, others degraded)"
```

---

### Task 3: Wire route + make profile reachable from the header

**Files:**
- Modify: `frontend/src/routes.tsx`
- Modify: `frontend/src/components/LoginButton.tsx`

- [ ] **Step 1: Point `/u/:handle` at the page**

In `frontend/src/routes.tsx`, add `import ProfilePage from './pages/ProfilePage';` and change the `/u/:handle` route element from `<Placeholder title="Profile" />` to `<ProfilePage />`. Leave other placeholder routes untouched.

- [ ] **Step 2: Link the header handle to the own profile**

In `frontend/src/components/LoginButton.tsx`, the logged-in branch currently renders `<span style={{...}}>@{handle}</span>`. Wrap that handle in a react-router `Link` to the profile. Add `import { Link } from 'react-router-dom';` at the top, and replace the span with:

```tsx
<Link to={`/u/${handle}`} style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>
  @{handle}
</Link>
```

(Keep the surrounding `div` and the Logout button unchanged.)

- [ ] **Step 3: Full suite + build**

Run: `cd frontend && yarn test && yarn build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 4: Manual smoke**

Run: `cd frontend && yarn dev`. Click `@yourhandle` in the header → your profile shows avatar/initial, credits, resurrections, territory, and your project card (click → detail). Visit `/u/someoneelse` → the degraded "not public yet" state.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/routes.tsx frontend/src/components/LoginButton.tsx
git commit -m "feat(frontend): route /u/:handle to ProfilePage; link header handle to profile"
```

---

## Self-Review

- **Spec coverage:** avatar + handle ✓; stats credits/resurrections/territory ✓; project card ✓ (T2); fossil graveyard omitted with explicit `TODO` (no endpoint) ✓; route ✓ + reachable from header ✓ (T3).
- **Data honesty:** own profile uses real `fetchMe` + `fetchMyProject`; other handles are honestly degraded with a `TODO`, no fabricated stats; graveyard not faked. Matches the no-fake-facts rule.
- **Placeholder scan:** the two `TODO` comments are intentional backend-gap markers; no unfinished plan steps.
- **Type consistency:** `useMe()` returns `{ data: Me | undefined, isLoading }`; `Me` fields (`handle`, `avatar_url`, `credits`, `resurrection_count`) used as defined in `types/api.ts`. `useMyProject()` returns `{ data: Project | null, isLoading }`. `useAuth()` `handle` used for the own-profile check and the header link.
- **Note:** the own/other split keys on `handle === myHandle`. If the backend later adds fetch-by-handle, the `!isOwn` branch becomes the place to wire it.
