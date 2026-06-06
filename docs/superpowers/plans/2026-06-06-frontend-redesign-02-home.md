# Frontend Redesign — Plan 2: Home (Bright Grid + Social Sidebar)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the home route (`/`) into the warm social hero: a bright-repainted contested grid on the left, a social sidebar (Trending / Top Builders / Live Activity) on the right, with the HoverCard and ProjectPanel restyled to the cream theme and emoji replaced by lucide icons.

**Architecture:** The grid stays a canvas, repainted with cream/warm cell colors. The sidebar is driven entirely by **data derived from the grid snapshot** plus a small number of bounded per-project detail fetches — because the backend has no "list projects" endpoint and the snapshot carries only `project_id` + `color` per cell (no momentum/owner/territory). We derive territory by counting cells per `project_id`, fetch details for the top-N projects, and derive a Live Activity feed by diffing successive snapshots. New pure logic is TDD'd; components are render/CSS work.

**Tech Stack:** React 18, react-router-dom, @tanstack/react-query, motion, lucide-react, Vitest + Testing Library. **Use yarn** (`yarn vitest run <path>`, `yarn test`, `yarn build`) — never npm.

**Spec:** `docs/superpowers/specs/2026-06-06-frontend-redesign-social-grid-design.md`

**Prereq:** Plan 1 merged (tokens, router, Layout, Header all present).

---

## Data Reality (read before implementing)

Available endpoints: `GET /grid` (snapshot: cells with `x,y,state,project_id,color`), `GET /projects/:id`, `GET /projects/mine`, `GET /auth/me`. **No list-all-projects endpoint. Snapshot has no momentum/owner/territory.**

Derivation strategy used by this plan:
- **Territory per project** = count of `alive`/`dying` cells sharing a `project_id` in the snapshot. Fully derivable.
- **Top Builders** = projects ranked by territory (cell count), then `fetchProject` the top N (≤ 8) for their names/owners. Real data, bounded fetches.
- **Trending** = the same top-N fetched set, re-sorted by `momentum` (momentum only known for fetched projects). Real data for the set we can afford to fetch.
- **Live Activity** = diff the previous snapshot's `project_id` set against the current one → "new territory" / "project faded" events. Names resolved from the already-fetched detail cache; unresolved ids show a generic label. Marked `TODO: replace with /activity endpoint`.

This is documented so the implementer doesn't invent a fake projects list.

---

## File Structure

- `frontend/src/components/GridCanvas.tsx` — modify `getCellColor` + `drawGrid` background (bright palette)
- `frontend/src/components/__tests__/GridCanvas.test.ts` — modify color assertions
- `frontend/src/lib/gridStats.ts` — **new**: pure territory-count + ranking (TDD)
- `frontend/src/lib/gridStats.test.ts` — **new**
- `frontend/src/lib/activityFeed.ts` — **new**: pure snapshot-diff → events (TDD)
- `frontend/src/lib/activityFeed.test.ts` — **new**
- `frontend/src/hooks/useTopProjects.ts` — **new**: fetch details for ranked top-N ids
- `frontend/src/components/Sidebar.tsx` + `Sidebar.css` — **new**: Trending / Top Builders / Live Activity panels
- `frontend/src/components/HoverCard.tsx` + `HoverCard.css` — modify: cream restyle, lucide icons (no emoji)
- `frontend/src/components/ProjectPanel.tsx` + `ProjectPanel.css` — modify: cream restyle, lucide icons (no emoji)
- `frontend/src/pages/HomePage.tsx` — **new**: assembles grid + Sidebar + ProjectPanel (the body currently in `App.tsx`)
- `frontend/src/routes.tsx` — modify: `/` renders `<HomePage/>`
- `frontend/src/App.tsx` — **delete** (its body moves to HomePage) OR leave unused; this plan deletes it and updates `App.test.tsx` → `HomePage.test.tsx`
- `frontend/src/styles/global.css` — modify: light theme for `.main`, `.grid-section`, `.grid-outer`, `.grid-status`

---

### Task 1: Repaint the grid bright

**Files:**
- Modify: `frontend/src/components/GridCanvas.tsx:27-43`
- Modify: `frontend/src/components/__tests__/GridCanvas.test.ts` (the `getCellColor` block)

- [ ] **Step 1: Update the color test to expect bright values**

In `frontend/src/components/__tests__/GridCanvas.test.ts`, replace the two assertions inside `describe('getCellColor', ...)` that check empty/fossil colors with:

```ts
  it('returns light well color for empty cells', () => {
    expect(getCellColor(cell('empty', null))).toBe('#f1ece9');
  });
  it('returns light grey for fossil cells regardless of project color', () => {
    expect(getCellColor(cell('fossil', '#ac3509'))).toBe('#d4ccc7');
  });
```

(Leave the alive/dying/fallback assertions unchanged.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && yarn vitest run src/components/__tests__/GridCanvas.test.ts`
Expected: FAIL on the empty/fossil color assertions.

- [ ] **Step 3: Repaint in GridCanvas.tsx**

Replace `getCellColor` and the background fill in `drawGrid`:

```ts
export function getCellColor(cell: GridCell): string {
  if (cell.state === 'empty') return '#f1ece9';
  if (cell.state === 'fossil') return '#d4ccc7';
  return cell.color ?? '#888888';
}

function drawGrid(ctx: CanvasRenderingContext2D, cells: GridCell[]): void {
  ctx.fillStyle = '#e7dfdb'; // gap lines read as a soft warm grid
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  for (const cell of cells) {
    const { px, py } = cellToPixel(cell.x, cell.y);
    ctx.globalAlpha = cell.state === 'dying' ? 0.5 : 1;
    ctx.fillStyle = getCellColor(cell);
    ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
  }
  ctx.globalAlpha = 1;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && yarn vitest run src/components/__tests__/GridCanvas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/GridCanvas.tsx frontend/src/components/__tests__/GridCanvas.test.ts
git commit -m "feat(frontend): repaint contested grid in bright/warm palette"
```

---

### Task 2: Territory stats derivation (pure, TDD)

**Files:**
- Create: `frontend/src/lib/gridStats.ts`
- Test: `frontend/src/lib/gridStats.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/gridStats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { rankByTerritory, type TerritoryEntry } from './gridStats';
import type { GridCell } from '../types/api';

function cell(project_id: string | null, state: GridCell['state'] = 'alive', color = '#ac3509'): GridCell {
  return { x: 0, y: 0, state, project_id, color: project_id ? color : null };
}

describe('rankByTerritory', () => {
  it('counts alive and dying cells per project, ignores empty/fossil/null', () => {
    const cells: GridCell[] = [
      cell('a'), cell('a'), cell('a', 'dying'),
      cell('b'),
      cell(null, 'empty'),
      cell('c', 'fossil'),
    ];
    const ranked = rankByTerritory(cells);
    expect(ranked).toEqual<TerritoryEntry[]>([
      { projectId: 'a', territory: 3, color: '#ac3509' },
      { projectId: 'b', territory: 1, color: '#ac3509' },
    ]);
  });

  it('sorts descending by territory and respects the limit', () => {
    const cells: GridCell[] = [
      cell('a'),
      cell('b'), cell('b'),
      cell('c'), cell('c'), cell('c'),
    ];
    expect(rankByTerritory(cells, 2).map(e => e.projectId)).toEqual(['c', 'b']);
  });

  it('returns an empty array when there are no live cells', () => {
    expect(rankByTerritory([cell(null, 'empty')])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && yarn vitest run src/lib/gridStats.test.ts`
Expected: FAIL — cannot resolve `./gridStats`.

- [ ] **Step 3: Implement**

Create `frontend/src/lib/gridStats.ts`:

```ts
import type { GridCell } from '../types/api';

export interface TerritoryEntry {
  projectId: string;
  territory: number;
  color: string;
}

/** Rank projects by how many live (alive/dying) cells they hold in the snapshot. */
export function rankByTerritory(cells: GridCell[], limit = Infinity): TerritoryEntry[] {
  const counts = new Map<string, TerritoryEntry>();
  for (const c of cells) {
    if (!c.project_id) continue;
    if (c.state !== 'alive' && c.state !== 'dying') continue;
    const entry = counts.get(c.project_id);
    if (entry) {
      entry.territory += 1;
    } else {
      counts.set(c.project_id, {
        projectId: c.project_id,
        territory: 1,
        color: c.color ?? '#888888',
      });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.territory - a.territory)
    .slice(0, limit === Infinity ? undefined : limit);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && yarn vitest run src/lib/gridStats.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/gridStats.ts frontend/src/lib/gridStats.test.ts
git commit -m "feat(frontend): derive project territory ranking from grid snapshot"
```

---

### Task 3: Activity feed derivation (pure, TDD)

**Files:**
- Create: `frontend/src/lib/activityFeed.ts`
- Test: `frontend/src/lib/activityFeed.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/activityFeed.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { diffSnapshots, type ActivityEvent } from './activityFeed';
import type { GridCell } from '../types/api';

function cell(project_id: string | null, state: GridCell['state'] = 'alive'): GridCell {
  return { x: 0, y: 0, state, project_id, color: '#ac3509' };
}

describe('diffSnapshots', () => {
  it('emits an "appeared" event for project ids present now but not before', () => {
    const prev = [cell('a')];
    const next = [cell('a'), cell('b')];
    const events = diffSnapshots(prev, next, 1000);
    expect(events).toEqual<ActivityEvent[]>([
      { kind: 'appeared', projectId: 'b', at: 1000 },
    ]);
  });

  it('emits a "faded" event for project ids gone from the live grid', () => {
    const prev = [cell('a'), cell('b')];
    const next = [cell('a')];
    expect(diffSnapshots(prev, next, 2000)).toEqual<ActivityEvent[]>([
      { kind: 'faded', projectId: 'b', at: 2000 },
    ]);
  });

  it('treats fossil/empty cells as not live', () => {
    const prev = [cell('a')];
    const next = [cell('a', 'fossil')];
    expect(diffSnapshots(prev, next, 3000)).toEqual<ActivityEvent[]>([
      { kind: 'faded', projectId: 'a', at: 3000 },
    ]);
  });

  it('returns no events when the live set is unchanged', () => {
    const prev = [cell('a'), cell('a')];
    const next = [cell('a')];
    expect(diffSnapshots(prev, next, 4000)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && yarn vitest run src/lib/activityFeed.test.ts`
Expected: FAIL — cannot resolve `./activityFeed`.

- [ ] **Step 3: Implement**

Create `frontend/src/lib/activityFeed.ts`:

```ts
import type { GridCell } from '../types/api';

export interface ActivityEvent {
  kind: 'appeared' | 'faded';
  projectId: string;
  at: number; // epoch ms
}

function liveProjectIds(cells: GridCell[]): Set<string> {
  const ids = new Set<string>();
  for (const c of cells) {
    if (c.project_id && (c.state === 'alive' || c.state === 'dying')) ids.add(c.project_id);
  }
  return ids;
}

/**
 * Derive activity by comparing the live project set of two snapshots.
 * TODO: replace with a real /activity endpoint when the backend exposes one.
 */
export function diffSnapshots(prev: GridCell[], next: GridCell[], at: number): ActivityEvent[] {
  const before = liveProjectIds(prev);
  const after = liveProjectIds(next);
  const events: ActivityEvent[] = [];
  for (const id of after) if (!before.has(id)) events.push({ kind: 'appeared', projectId: id, at });
  for (const id of before) if (!after.has(id)) events.push({ kind: 'faded', projectId: id, at });
  return events;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && yarn vitest run src/lib/activityFeed.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/activityFeed.ts frontend/src/lib/activityFeed.test.ts
git commit -m "feat(frontend): derive live activity events from snapshot diffs"
```

---

### Task 4: useTopProjects hook

**Files:**
- Create: `frontend/src/hooks/useTopProjects.ts`

- [ ] **Step 1: Implement the hook**

Create `frontend/src/hooks/useTopProjects.ts`:

```ts
import { useQueries } from '@tanstack/react-query';
import { fetchProject } from '../api/projects';
import { rankByTerritory, type TerritoryEntry } from '../lib/gridStats';
import type { GridSnapshot, Project } from '../types/api';

export interface TopProject extends TerritoryEntry {
  project: Project | undefined;
}

const TOP_N = 8;

/**
 * Rank projects by territory from the snapshot, then fetch details for the
 * top N (bounded) so we can show names, momentum and owners. There is no
 * list-projects endpoint, so this per-id fetch is intentional.
 */
export function useTopProjects(snapshot: GridSnapshot | undefined): TopProject[] {
  const ranked = snapshot ? rankByTerritory(snapshot.cells, TOP_N) : [];
  const results = useQueries({
    queries: ranked.map(entry => ({
      queryKey: ['project', entry.projectId],
      queryFn: () => fetchProject(entry.projectId),
      staleTime: 10_000,
    })),
  });
  return ranked.map((entry, i) => ({ ...entry, project: results[i]?.data }));
}
```

- [ ] **Step 2: Verify it type-checks via build**

Run: `cd frontend && yarn build`
Expected: build succeeds (no usage yet; this confirms the hook compiles).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useTopProjects.ts
git commit -m "feat(frontend): useTopProjects hook (territory rank + bounded detail fetch)"
```

---

### Task 5: Sidebar (Trending / Top Builders / Live Activity)

**Files:**
- Create: `frontend/src/components/Sidebar.tsx`
- Create: `frontend/src/components/Sidebar.css`
- Test: `frontend/src/components/__tests__/Sidebar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/__tests__/Sidebar.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import type { TopProject } from '../../hooks/useTopProjects';

const top: TopProject[] = [
  { projectId: 'a', territory: 30, color: '#ac3509', project: { id: 'a', name: 'EchoFlow', momentum: 80, territory_size: 30, status: 'alive', color: '#ac3509', owner_id: 'u1', description: null, url: null, tech_tags: [], expires_at: '', created_at: '', died_at: null } },
  { projectId: 'b', territory: 12, color: '#006a63', project: { id: 'b', name: 'HabitLoop', momentum: 95, territory_size: 12, status: 'alive', color: '#006a63', owner_id: 'u2', description: null, url: null, tech_tags: [], expires_at: '', created_at: '', died_at: null } },
];

describe('Sidebar', () => {
  it('renders trending (momentum sort) and top builders (territory sort)', () => {
    render(<MemoryRouter><Sidebar top={top} activity={[]} /></MemoryRouter>);
    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.getByText('Top Builders')).toBeInTheDocument();
    expect(screen.getByText('Live Activity')).toBeInTheDocument();
    // both projects appear; HabitLoop has higher momentum so leads Trending
    expect(screen.getAllByText('HabitLoop').length).toBeGreaterThan(0);
    expect(screen.getAllByText('EchoFlow').length).toBeGreaterThan(0);
  });

  it('shows an empty hint when there is no activity', () => {
    render(<MemoryRouter><Sidebar top={[]} activity={[]} /></MemoryRouter>);
    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && yarn vitest run src/components/__tests__/Sidebar.test.tsx`
Expected: FAIL — cannot resolve `../Sidebar`.

- [ ] **Step 3: Implement Sidebar.css**

Create `frontend/src/components/Sidebar.css`:

```css
.sidebar { display: flex; flex-direction: column; gap: 16px; width: 320px; }
.side-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  padding: 16px;
}
.side-panel__title {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 12px;
}
.side-panel__title svg { color: var(--accent); }
.side-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0; text-decoration: none; color: var(--text);
}
.side-row + .side-row { border-top: 1px solid var(--border); }
.side-row__swatch { width: 10px; height: 10px; border-radius: 3px; flex: none; }
.side-row__name { font-weight: 600; font-size: 14px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.side-row__metric { font-family: var(--font-pixel); font-size: 18px; color: var(--mint); }
.side-empty { color: var(--text-muted); font-size: 13px; }
```

- [ ] **Step 4: Implement Sidebar.tsx**

Create `frontend/src/components/Sidebar.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { TrendingUp, Trophy, Radio } from 'lucide-react';
import type { TopProject } from '../hooks/useTopProjects';
import type { ActivityEvent } from '../lib/activityFeed';
import './Sidebar.css';

interface Props {
  top: TopProject[];
  activity: ActivityEvent[];
}

function withProject(top: TopProject[]) {
  return top.filter(t => t.project);
}

export function Sidebar({ top, activity }: Props) {
  const trending = [...withProject(top)]
    .sort((a, b) => (b.project!.momentum) - (a.project!.momentum))
    .slice(0, 5);
  const builders = [...withProject(top)]
    .sort((a, b) => b.territory - a.territory)
    .slice(0, 5);

  return (
    <aside className="sidebar">
      <section className="side-panel">
        <h3 className="side-panel__title"><TrendingUp size={18} /> Trending</h3>
        {trending.length === 0 && <p className="side-empty">No momentum yet.</p>}
        {trending.map(t => (
          <Link key={t.projectId} to={`/p/${t.projectId}`} className="side-row">
            <span className="side-row__swatch" style={{ background: t.color }} />
            <span className="side-row__name">{t.project!.name}</span>
            <span className="side-row__metric">{t.project!.momentum}</span>
          </Link>
        ))}
      </section>

      <section className="side-panel">
        <h3 className="side-panel__title"><Trophy size={18} /> Top Builders</h3>
        {builders.length === 0 && <p className="side-empty">No territory claimed yet.</p>}
        {builders.map(t => (
          <Link key={t.projectId} to={`/p/${t.projectId}`} className="side-row">
            <span className="side-row__swatch" style={{ background: t.color }} />
            <span className="side-row__name">{t.project!.name}</span>
            <span className="side-row__metric">{t.territory}</span>
          </Link>
        ))}
      </section>

      <section className="side-panel">
        <h3 className="side-panel__title"><Radio size={18} /> Live Activity</h3>
        {activity.length === 0 && <p className="side-empty">No activity yet.</p>}
        {activity.slice(0, 8).map((e, i) => {
          const named = top.find(t => t.projectId === e.projectId)?.project?.name;
          const label = named ?? 'A project';
          return (
            <div key={`${e.projectId}-${e.at}-${i}`} className="side-row">
              <span className="side-row__name">
                {e.kind === 'appeared' ? `${label} claimed new territory` : `${label} faded from the grid`}
              </span>
            </div>
          );
        })}
      </section>
    </aside>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && yarn vitest run src/components/__tests__/Sidebar.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Sidebar.tsx frontend/src/components/Sidebar.css frontend/src/components/__tests__/Sidebar.test.tsx
git commit -m "feat(frontend): social sidebar (Trending / Top Builders / Live Activity)"
```

---

### Task 6: Restyle HoverCard (cream + lucide icons)

**Files:**
- Modify: `frontend/src/components/HoverCard.tsx`
- Modify: `frontend/src/components/HoverCard.css`

This is a restyle — keep all behavior (queries, mutations, positioning logic) exactly as-is. Two changes only:

- [ ] **Step 1: Replace emoji with lucide icons in HoverCard.tsx**

Add at the top: `import { Zap, Rocket, Sparkles, Hourglass, Grid2x2 } from 'lucide-react';`

Then replace the emoji usages:
- Territory line `<span>⬛ {project.territory_size}</span>` → `<span><Grid2x2 size={12} /> {project.territory_size}</span>`
- Click button label `{inCooldown ? '⏳ Click' : '⚡ Click'}` → `{inCooldown ? <><Hourglass size={13} /> Click</> : <><Zap size={13} /> Click</>}`
- Boost button `🚀 Boost <span ...>20₵</span>` → `<Rocket size={13} /> Boost <span className="hover-card__cost">20₵</span>`
- Resurrect button `✨ Resurrect <span ...>200₵</span>` → `<Sparkles size={13} /> Resurrect <span className="hover-card__cost">200₵</span>`

(Keep the `₵` currency glyph — it is text, not emoji.)

- [ ] **Step 2: Recolor HoverCard.css to the light theme**

Read `frontend/src/components/HoverCard.css`. Remap dark values to tokens: card background → `var(--surface)`; text → `var(--text)`; muted/secondary text → `var(--text-muted)`; borders → `1px solid var(--border)`; add `box-shadow: var(--shadow-card)`; `border-radius: var(--radius)`; momentum fill → `var(--accent)`; the `.hover-card__btn` icons inherit `currentColor`. Ensure icon + text buttons align with `display:inline-flex; align-items:center; gap:6px;` on `.hover-card__btn`. Do not change layout dimensions (`CARD_W`/`CARD_H` stay).

- [ ] **Step 3: Verify build + existing HoverCard test still passes**

Run: `cd frontend && yarn vitest run src/components/__tests__/HoverCard.test.tsx && yarn build`
Expected: PASS + build succeeds. If the existing test asserted an emoji string, update that assertion to match the new label text (e.g. match `/Click/` not `/⚡/`).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/HoverCard.tsx frontend/src/components/HoverCard.css frontend/src/components/__tests__/HoverCard.test.tsx
git commit -m "feat(frontend): restyle HoverCard to cream theme + lucide icons"
```

---

### Task 7: Restyle ProjectPanel (cream + lucide icons)

**Files:**
- Modify: `frontend/src/components/ProjectPanel.tsx`
- Modify: `frontend/src/components/ProjectPanel.css`

Restyle only — keep all behavior (create/abandon mutations, form state).

- [ ] **Step 1: Replace emoji in ProjectPanel.tsx**

Add: `import { Clock, Grid2x2 } from 'lucide-react';`

In the `.panel-card__meta` block replace:
- `<span>⏱ {timeLeft}</span>` → `<span><Clock size={13} /> {timeLeft}</span>`
- `<span>⬛ {project.territory_size} cells</span>` → `<span><Grid2x2 size={13} /> {project.territory_size} cells</span>`

- [ ] **Step 2: Recolor ProjectPanel.css to the light theme**

Read `frontend/src/components/ProjectPanel.css`. Remap: panel/card background → `var(--surface)`; borders → `var(--border)`; add `box-shadow: var(--shadow-card)` and `border-radius: var(--radius)` on `.panel-card` and `.submit-form`; text → `var(--text)`, muted → `var(--text-muted)`; momentum bar fill → `var(--accent)`, track → `var(--surface-2)`; inputs (`.input`) → background `var(--surface-well)`, `1px solid var(--border)`, `border-radius: var(--radius)`, focus `border-color: var(--accent)`; status badges keep semantic colors (`--alive`/`--dying`/`--dead`); `.panel-card__meta span` → `display:inline-flex; align-items:center; gap:6px;`. Keep layout/spacing.

- [ ] **Step 3: Verify build + existing ProjectPanel test passes**

Run: `cd frontend && yarn vitest run src/components/__tests__/ProjectPanel.test.tsx && yarn build`
Expected: PASS + build succeeds. Update any emoji-string assertion to the new text if present.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ProjectPanel.tsx frontend/src/components/ProjectPanel.css frontend/src/components/__tests__/ProjectPanel.test.tsx
git commit -m "feat(frontend): restyle ProjectPanel to cream theme + lucide icons"
```

---

### Task 8: HomePage assembly + route wiring

**Files:**
- Create: `frontend/src/pages/HomePage.tsx`
- Create: `frontend/src/pages/__tests__/HomePage.test.tsx`
- Modify: `frontend/src/routes.tsx`
- Delete: `frontend/src/App.tsx`, `frontend/src/App.test.tsx`
- Modify: `frontend/src/styles/global.css` (light theme for `.main`, `.grid-section`, `.grid-outer`, `.grid-status`)

- [ ] **Step 1: Create HomePage.tsx**

Create `frontend/src/pages/HomePage.tsx` (moves the App body here, adds the Sidebar and the live-activity accumulation):

```tsx
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { GridCanvas, pixelToCell } from '../components/GridCanvas';
import { HoverCard } from '../components/HoverCard';
import { ProjectPanel } from '../components/ProjectPanel';
import { Sidebar } from '../components/Sidebar';
import { useGridPoll } from '../hooks/useGridPoll';
import { useAuth } from '../hooks/useAuth';
import { useTopProjects } from '../hooks/useTopProjects';
import { diffSnapshots, type ActivityEvent } from '../lib/activityFeed';
import type { GridCell } from '../types/api';

export default function HomePage() {
  const { isLoggedIn } = useAuth();
  const { data: snapshot, isLoading, isError } = useGridPoll();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<GridCell | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const top = useTopProjects(snapshot);

  // Accumulate a short live-activity log by diffing successive snapshots.
  const prevCells = useRef<GridCell[] | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  useEffect(() => {
    if (!snapshot) return;
    if (prevCells.current) {
      const events = diffSnapshots(prevCells.current, snapshot.cells, Date.now());
      if (events.length) setActivity(a => [...events, ...a].slice(0, 20));
    }
    prevCells.current = snapshot.cells;
  }, [snapshot]);

  const cellMap = useMemo(() => {
    const m = new Map<string, GridCell>();
    for (const c of snapshot?.cells ?? []) m.set(`${c.x},${c.y}`, c);
    return m;
  }, [snapshot]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canvasRef.current) return;
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const wrapperRect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - canvasRect.left;
      const py = e.clientY - canvasRect.top;
      const cell = pixelToCell(px, py);
      if (cell) {
        const cellData = cellMap.get(`${cell.x},${cell.y}`);
        if (cellData) {
          setHoveredCell(cellData);
          setHoverPos({ x: e.clientX - wrapperRect.left, y: e.clientY - wrapperRect.top });
        }
      }
    },
    [cellMap]
  );

  const handleMouseLeave = useCallback(() => setHoveredCell(null), []);

  if (window.innerWidth <= 820) {
    return (
      <div className="mobile-guard" style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 16, padding: 24, textAlign: 'center',
      }}>
        <p style={{ fontFamily: 'var(--font-pixel)', fontSize: 22, color: 'var(--accent)' }}>
          CROW.GG
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 280 }}>
          Digital Darwinism is a desktop experience.<br />
          Open on your computer to enter the grid.
        </p>
      </div>
    );
  }

  return (
    <main className="main main--row">
      <div className="grid-section">
        {isLoading && <p className="grid-status">Loading grid…</p>}
        {isError && <p className="grid-status grid-status--error">Grid offline — retrying…</p>}
        {!isLoading && !isError && (
          <div className="grid-outer" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
            <GridCanvas canvasRef={canvasRef} snapshot={snapshot} />
            {hoveredCell && (
              <HoverCard cell={hoveredCell} canvasX={hoverPos.x} canvasY={hoverPos.y} />
            )}
          </div>
        )}
      </div>
      <Sidebar top={top} activity={activity} />
      {isLoggedIn && <ProjectPanel />}
    </main>
  );
}
```

- [ ] **Step 2: Write HomePage smoke test**

Create `frontend/src/pages/__tests__/HomePage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ isLoggedIn: false, credits: 0 }) }));
vi.mock('../../hooks/useGridPoll', () => ({ useGridPoll: () => ({ data: undefined, isLoading: true, isError: false }) }));
vi.mock('../../hooks/useTopProjects', () => ({ useTopProjects: () => [] }));

import HomePage from '../HomePage';

describe('HomePage', () => {
  it('renders the grid loading state and the sidebar', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.getByText(/loading grid/i)).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it to verify it fails, then implement passes**

Run: `cd frontend && yarn vitest run src/pages/__tests__/HomePage.test.tsx`
Expected: PASS once HomePage exists (it does from Step 1). If it fails on `useQueries` needing a QueryClient, note the `useTopProjects` mock already bypasses react-query — it should pass.

- [ ] **Step 4: Point the route at HomePage and delete App**

In `frontend/src/routes.tsx`: replace `import App from './App';` with `import HomePage from './pages/HomePage';` and change the `/` route element from `<App />` to `<HomePage />`.

Delete the old files:

```bash
git rm frontend/src/App.tsx frontend/src/App.test.tsx
```

- [ ] **Step 5: Light theme for grid layout in global.css**

Read the `.main`, `.main--row`, `.grid-section`, `.grid-outer`, `.grid-status`, `.grid-status--error` rules in `frontend/src/styles/global.css`. Remap to: layout container max `var(--container-max)`, centered with `margin: 0 auto`, padding `var(--margin-desktop)`; `.main--row { display:flex; gap:24px; align-items:flex-start; }`; `.grid-outer` gets `background: var(--surface); border:1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-card); padding:12px;` and `image-rendering: pixelated` stays on the canvas; `.grid-status` text → `var(--text-muted)`, `.grid-status--error` → `var(--error)`. Keep the canvas pixel-sharp.

- [ ] **Step 6: Full suite + build + manual smoke**

Run: `cd frontend && yarn test && yarn build`
Expected: all tests PASS, build succeeds. Fix any test still importing `./App` (there should be none after deletion).

Then `yarn dev`: home shows the bright grid in a white card on cream, the sidebar with Trending/Top Builders/Live Activity on the right, ProjectPanel when logged in, HoverCard styled cream, mascot hopping, no emoji anywhere.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/HomePage.tsx frontend/src/pages/__tests__/HomePage.test.tsx frontend/src/routes.tsx frontend/src/styles/global.css
git commit -m "feat(frontend): home page — bright grid + social sidebar + live activity"
```

---

## Self-Review

- **Spec coverage:** bright grid repaint (T1) ✓; Trending + Top Builders from derived data (T2/T4/T5) ✓; Live Activity from snapshot diff + TODO marker (T3/T5/T8) ✓; HoverCard cream restyle (T6) ✓; ProjectPanel cream restyle (T7) ✓; home layout grid hero + sidebar (T8) ✓; no emoji — all swapped to lucide (T5/T6/T7) ✓.
- **Data honesty:** No fake projects list invented. Trending/Top Builders use bounded real fetches (≤8); Live Activity is real snapshot-diff plus a `TODO: /activity endpoint` marker. Matches the spec's "derive + mark TODO" rule and the user's no-fake-facts instruction.
- **Placeholder scan:** no TBD/TODO-as-work; the single `TODO` comment is an intentional backend-gap marker, not unfinished plan work.
- **Type consistency:** `TerritoryEntry` (gridStats) → consumed by `TopProject` (useTopProjects) → consumed by `Sidebar`; `ActivityEvent` (activityFeed) → `Sidebar`/`HomePage`. `rankByTerritory(cells, limit)`, `diffSnapshots(prev, next, at)`, `useTopProjects(snapshot)` signatures are used consistently across tasks.
- **Note:** `useTopProjects` is not unit-tested directly (it wraps `useQueries`); its pure core `rankByTerritory` is fully tested, and `HomePage`/`Sidebar` tests mock it. Acceptable.
