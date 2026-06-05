# Frontend Redesign — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the shared foundation for the social-site redesign: light/warm design tokens, Inter font, routing, a shared header/layout, and the animated pixel crow mascot.

**Architecture:** Replace the dark terminal token set in `global.css` with the BuildLog cream/orange palette (keeping the pixel font as an accent only). Introduce `react-router-dom` so the 5 pages get real routes (the existing manual `pathname` check for `/auth/callback` is folded into the router). Add a shared `<Layout>` with a redesigned `<Header>`. Add a self-contained `<CrowMascot>` driven by a pure, test-first state machine plus Framer Motion (`motion`, already installed).

**Tech Stack:** React 18, Vite, TypeScript, Vitest + Testing Library, `@tanstack/react-query` (existing), `motion` (existing), `react-router-dom` (new), `lucide-react` (new).

**Spec:** `docs/superpowers/specs/2026-06-06-frontend-redesign-social-grid-design.md`

---

## File Structure

- `frontend/package.json` — add `react-router-dom`, `lucide-react`
- `frontend/src/styles/tokens.css` — **new**: the design-system CSS variables (light/warm)
- `frontend/src/styles/global.css` — modify: import Inter, import tokens, reset base body to light theme
- `frontend/src/components/crow-mascot/machine.ts` — **new**: pure state machine (TDD)
- `frontend/src/components/crow-mascot/machine.test.ts` — **new**: state machine tests
- `frontend/src/components/CrowMascot.tsx` — **new**: the visual mascot component
- `frontend/src/components/CrowMascot.css` — **new**
- `frontend/src/components/__tests__/CrowMascot.test.tsx` — **new**: render smoke + reduced-motion
- `frontend/src/components/Header.tsx` — **new**: shared top nav (replaces inline header in App)
- `frontend/src/components/Header.css` — **new**
- `frontend/src/components/Layout.tsx` — **new**: header + `<Outlet/>` + mascot
- `frontend/src/routes.tsx` — **new**: router definition
- `frontend/src/main.tsx` — modify: wrap app in `RouterProvider`
- `frontend/src/App.tsx` — modify: becomes the `/` route's page body only (grid), header/mascot move to Layout

> Subsequent plans (home sidebars, project page, submit, profile, share) build on `Layout` + tokens + routes added here. Pages not yet built get a placeholder route element in this plan so the router is valid.

---

### Task 1: Install routing + icon dependencies

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install**

```bash
cd frontend && npm install react-router-dom@^6.26.0 lucide-react@^0.400.0
```

- [ ] **Step 2: Verify install**

Run: `cd frontend && npm ls react-router-dom lucide-react`
Expected: both listed with resolved versions, no `UNMET DEPENDENCY`.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): add react-router-dom and lucide-react"
```

---

### Task 2: Design tokens (light/warm palette)

**Files:**
- Create: `frontend/src/styles/tokens.css`
- Modify: `frontend/src/styles/global.css:1-30`

- [ ] **Step 1: Create the token file**

Create `frontend/src/styles/tokens.css`:

```css
:root {
  /* Surfaces */
  --bg: #fcf8f9;
  --surface: #ffffff;
  --surface-2: #f0edee;
  --surface-well: #f6f3f4;
  --border: #e5e1da;

  /* Text */
  --text: #1b1b1c;
  --text-muted: #59413a;

  /* Brand */
  --accent: #ac3509;        /* deep orange — CTA / brand */
  --accent-2: #ff7043;      /* coral — hover / highlight */
  --on-accent: #ffffff;

  /* Secondary / status */
  --mint: #006a63;          /* alive / growth */
  --alive: #006a63;
  --dying: #ff7043;         /* faded orange */
  --dead: #b8b0ad;          /* fossil light grey */
  --error: #ba1a1a;

  /* Type */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-pixel: 'VT323', monospace;   /* accent only: grid numbers/labels */

  /* Shape */
  --radius: 16px;
  --radius-pill: 9999px;

  /* Elevation */
  --shadow-card: 0 4px 24px rgba(27, 27, 28, 0.08);

  /* Layout */
  --container-max: 1280px;
  --margin-desktop: 40px;
}
```

- [ ] **Step 2: Rewrite the top of `global.css`**

Replace `frontend/src/styles/global.css` lines 1-30 (the `@import`, `:root` block, reset, and `html, body, #root` rule) with:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=VT323&display=swap');
@import './tokens.css';

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body, #root {
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
}
```

> Leave the rest of `global.css` as-is for now; later tasks/plans restyle individual components. The old dark `.header`/`.credits-display` rules below stay until Task 5 replaces them.

- [ ] **Step 3: Verify build still compiles**

Run: `cd frontend && npm run build`
Expected: build succeeds (TypeScript + Vite), no CSS import errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/styles/tokens.css frontend/src/styles/global.css
git commit -m "feat(frontend): light/warm design tokens + Inter font"
```

---

### Task 3: Crow mascot state machine (pure, TDD)

**Files:**
- Create: `frontend/src/components/crow-mascot/machine.ts`
- Test: `frontend/src/components/crow-mascot/machine.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/crow-mascot/machine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { nextCrowState, type CrowSituation } from './machine';

const base: CrowSituation = {
  current: 'idle',
  idleMs: 0,
  mouseNearby: false,
  rng: 0.9,
};

describe('nextCrowState', () => {
  it('startles when the mouse is nearby and not already startled', () => {
    expect(nextCrowState({ ...base, current: 'idle', mouseNearby: true })).toBe('startle');
    expect(nextCrowState({ ...base, current: 'walk', mouseNearby: true })).toBe('startle');
  });

  it('hops away after startling', () => {
    expect(nextCrowState({ ...base, current: 'startle', mouseNearby: true })).toBe('hop');
  });

  it('lands into a walk after a hop', () => {
    expect(nextCrowState({ ...base, current: 'hop' })).toBe('walk');
  });

  it('rests (idle) after arriving from a walk', () => {
    expect(nextCrowState({ ...base, current: 'walk' })).toBe('idle');
  });

  it('returns to idle after a peck', () => {
    expect(nextCrowState({ ...base, current: 'peck' })).toBe('idle');
  });

  it('does a bored action (peck or hop) when idle too long', () => {
    expect(nextCrowState({ ...base, current: 'idle', idleMs: 5000, rng: 0.2 })).toBe('peck');
    expect(nextCrowState({ ...base, current: 'idle', idleMs: 5000, rng: 0.8 })).toBe('hop');
  });

  it('wanders or stays when idle but not bored', () => {
    expect(nextCrowState({ ...base, current: 'idle', idleMs: 1000, rng: 0.2 })).toBe('walk');
    expect(nextCrowState({ ...base, current: 'idle', idleMs: 1000, rng: 0.8 })).toBe('idle');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/crow-mascot/machine.test.ts`
Expected: FAIL — `Failed to resolve import './machine'`.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/components/crow-mascot/machine.ts`:

```ts
export type CrowState = 'idle' | 'walk' | 'hop' | 'peck' | 'startle';

export interface CrowSituation {
  current: CrowState;
  /** ms spent in the current idle stretch */
  idleMs: number;
  /** pointer is within the avoidance radius */
  mouseNearby: boolean;
  /** deterministic randomness, 0..1 */
  rng: number;
}

const BORED_MS = 4000;

export function nextCrowState(s: CrowSituation): CrowState {
  if (s.mouseNearby && s.current !== 'startle') return 'startle';

  switch (s.current) {
    case 'startle':
      return 'hop';
    case 'hop':
      return 'walk';
    case 'walk':
      return 'idle';
    case 'peck':
      return 'idle';
    case 'idle':
      if (s.idleMs >= BORED_MS) return s.rng < 0.5 ? 'peck' : 'hop';
      return s.rng < 0.5 ? 'walk' : 'idle';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/crow-mascot/machine.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/crow-mascot/
git commit -m "feat(frontend): crow mascot state machine"
```

---

### Task 4: CrowMascot component

**Files:**
- Create: `frontend/src/components/CrowMascot.tsx`
- Create: `frontend/src/components/CrowMascot.css`
- Test: `frontend/src/components/__tests__/CrowMascot.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/__tests__/CrowMascot.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/__tests__/CrowMascot.test.tsx`
Expected: FAIL — cannot resolve `../CrowMascot`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/components/CrowMascot.css`:

```css
.crow-mascot {
  position: fixed;
  bottom: 12px;
  left: 24px;
  width: 56px;
  height: 56px;
  z-index: 40;
  pointer-events: auto;
  image-rendering: pixelated;
}
.crow-mascot img {
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  user-select: none;
  -webkit-user-drag: none;
}
```

Create `frontend/src/components/CrowMascot.tsx`:

```tsx
import { useEffect, useReducer, useRef } from 'react';
import { motion, useAnimationControls } from 'motion/react';
import { nextCrowState, type CrowState } from './crow-mascot/machine';
import './CrowMascot.css';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function CrowMascot() {
  const reduced = prefersReducedMotion();
  const controls = useAnimationControls();
  const stateRef = useRef<CrowState>('idle');
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const mouseNearby = useRef(false);

  // Avoidance: flag when pointer gets close to the mascot.
  useEffect(() => {
    if (reduced) return;
    function onMove(e: PointerEvent) {
      const el = document.querySelector('.crow-mascot');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      mouseNearby.current = Math.hypot(dx, dy) < 120;
    }
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduced]);

  // Behaviour loop: advance the state machine and run the matching animation.
  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    let idleStart = Date.now();

    async function loop() {
      while (!cancelled) {
        const current = stateRef.current;
        const idleMs = current === 'idle' ? Date.now() - idleStart : 0;
        const next = nextCrowState({
          current,
          idleMs,
          mouseNearby: mouseNearby.current,
          rng: Math.random(),
        });
        stateRef.current = next;
        if (next === 'idle') idleStart = Date.now();
        tick();

        switch (next) {
          case 'hop':
          case 'startle':
            await controls.start({
              y: [0, -28, 0],
              scaleY: [1, 1.15, 0.85, 1],
              transition: { duration: 0.5, ease: 'easeOut' },
            });
            break;
          case 'walk':
            await controls.start({
              x: (Math.random() - 0.5) * 240,
              transition: { type: 'spring', stiffness: 120, damping: 14 },
            });
            break;
          case 'peck':
            await controls.start({
              rotate: [0, 18, 0],
              transition: { duration: 0.4 },
            });
            break;
          case 'idle':
            await controls.start({
              y: [0, -3, 0],
              transition: { duration: 1.2, repeat: 1 },
            });
            break;
        }
      }
    }
    loop();
    return () => { cancelled = true; };
  }, [reduced, controls]);

  return (
    <motion.div
      className="crow-mascot"
      data-testid="crow-mascot"
      data-static={reduced ? 'true' : 'false'}
      animate={controls}
      aria-hidden
    >
      <img src="/logo.png" alt="" data-testid="crow-mascot-img" />
    </motion.div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/__tests__/CrowMascot.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/CrowMascot.tsx frontend/src/components/CrowMascot.css frontend/src/components/__tests__/CrowMascot.test.tsx
git commit -m "feat(frontend): animated pixel crow mascot"
```

---

### Task 5: Shared Header + Layout

**Files:**
- Create: `frontend/src/components/Header.tsx`
- Create: `frontend/src/components/Header.css`
- Create: `frontend/src/components/Layout.tsx`
- Test: `frontend/src/components/__tests__/Header.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/__tests__/Header.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '../Header';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ isLoggedIn: true, credits: 42 }),
}));
vi.mock('../LoginButton', () => ({ LoginButton: () => <button>Login</button> }));

describe('Header', () => {
  it('shows brand, nav links, and credits when logged in', () => {
    render(<MemoryRouter><Header /></MemoryRouter>);
    expect(screen.getByText('crow.gg')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /grid/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /explore/i })).toHaveAttribute('href', '/explore');
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/__tests__/Header.test.tsx`
Expected: FAIL — cannot resolve `../Header`.

- [ ] **Step 3: Write Header + CSS + Layout**

Create `frontend/src/components/Header.css`:

```css
.app-header {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 12px 40px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 30;
}
.app-header__brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.app-header__brand img { width: 32px; height: 32px; image-rendering: pixelated; }
.app-header__name { font-weight: 700; color: var(--accent); font-size: 18px; }
.app-header__nav { display: flex; gap: 24px; }
.app-header__link {
  color: var(--text); text-decoration: none; font-weight: 600; font-size: 15px;
  padding-bottom: 2px; border-bottom: 2px solid transparent;
}
.app-header__link.is-active { color: var(--accent); border-bottom-color: var(--accent); }
.app-header__right { margin-left: auto; display: flex; align-items: center; gap: 16px; }
.app-header__credits { font-family: var(--font-pixel); font-size: 20px; color: var(--mint); }
.app-header__cta {
  background: var(--accent); color: var(--on-accent); text-decoration: none;
  font-weight: 600; padding: 9px 16px; border-radius: var(--radius);
}
```

Create `frontend/src/components/Header.tsx`:

```tsx
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginButton } from './LoginButton';
import './Header.css';

export function Header() {
  const { isLoggedIn, credits } = useAuth();
  return (
    <header className="app-header">
      <Link to="/" className="app-header__brand">
        <img src="/logo.png" alt="" />
        <span className="app-header__name">crow.gg</span>
      </Link>
      <nav className="app-header__nav">
        <NavLink to="/" end className={({ isActive }) => `app-header__link${isActive ? ' is-active' : ''}`}>Grid</NavLink>
        <NavLink to="/explore" className={({ isActive }) => `app-header__link${isActive ? ' is-active' : ''}`}>Explore</NavLink>
      </nav>
      <div className="app-header__right">
        {isLoggedIn && <span className="app-header__credits">₵ {credits}</span>}
        {isLoggedIn && <Link to="/submit" className="app-header__cta">Submit Project</Link>}
        <LoginButton />
      </div>
    </header>
  );
}
```

Create `frontend/src/components/Layout.tsx`:

```tsx
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { CrowMascot } from './CrowMascot';

export function Layout() {
  return (
    <>
      <Header />
      <Outlet />
      <CrowMascot />
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/__tests__/Header.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Header.tsx frontend/src/components/Header.css frontend/src/components/Layout.tsx frontend/src/components/__tests__/Header.test.tsx
git commit -m "feat(frontend): shared Header and Layout"
```

---

### Task 6: Wire the router

**Files:**
- Create: `frontend/src/routes.tsx`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Trim App.tsx to the grid page body**

In `frontend/src/App.tsx`, remove the inline `<header>` block, the `<CrowLogo>`/`<LoginButton>` imports used only there, the `/auth/callback` branch (router handles it now), and the `CodeRain` usage. Keep the mobile guard and the grid/ProjectPanel `<main>`.

Replace the contents of `App.tsx` with:

```tsx
import { useState, useCallback, useMemo, useRef } from 'react';
import { GridCanvas, pixelToCell } from './components/GridCanvas';
import { HoverCard } from './components/HoverCard';
import { ProjectPanel } from './components/ProjectPanel';
import { useGridPoll } from './hooks/useGridPoll';
import { useAuth } from './hooks/useAuth';
import type { GridCell } from './types/api';

export default function App() {
  const { isLoggedIn } = useAuth();
  const { data: snapshot, isLoading, isError } = useGridPoll();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<GridCell | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

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
        {isLoading && <p className="grid-status">LOADING GRID...</p>}
        {isError && <p className="grid-status grid-status--error">GRID OFFLINE — retrying...</p>}
        {!isLoading && !isError && (
          <div className="grid-outer" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
            <GridCanvas canvasRef={canvasRef} snapshot={snapshot} />
            {hoveredCell && (
              <HoverCard cell={hoveredCell} canvasX={hoverPos.x} canvasY={hoverPos.y} />
            )}
          </div>
        )}
      </div>
      {isLoggedIn && <ProjectPanel />}
    </main>
  );
}
```

- [ ] **Step 2: Create the router**

Create `frontend/src/routes.tsx`:

```tsx
import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import App from './App';
import { AuthCallback } from './components/AuthCallback';

function Placeholder({ title }: { title: string }) {
  return <main style={{ padding: 40 }}><h1>{title}</h1><p>Coming soon.</p></main>;
}

export const router = createBrowserRouter([
  { path: '/auth/callback', element: <AuthCallback /> },
  {
    element: <Layout />,
    children: [
      { path: '/', element: <App /> },
      { path: '/explore', element: <Placeholder title="Explore" /> },
      { path: '/submit', element: <Placeholder title="Submit Project" /> },
      { path: '/p/:id', element: <Placeholder title="Project" /> },
      { path: '/u/:handle', element: <Placeholder title="Profile" /> },
      { path: '/share/:id', element: <Placeholder title="Share Card" /> },
    ],
  },
]);
```

- [ ] **Step 3: Wire RouterProvider in main.tsx**

In `frontend/src/main.tsx`, replace `import App from './App';` with `import { RouterProvider } from 'react-router-dom';` and `import { router } from './routes';`, then replace `<App />` inside `<AuthProvider>` with `<RouterProvider router={router} />`.

Result of `frontend/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import { router } from './routes';
import './styles/global.css';
import './styles/animations.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 4: Fix the existing App test**

`frontend/src/App.test.tsx` likely renders `<App/>` expecting the header. Since header moved to Layout, update any header assertion. Run it first to see the failure:

Run: `cd frontend && npx vitest run src/App.test.tsx`
Expected: may FAIL on header/logo assertions.

If it asserts header/logo/login text, replace those assertions with a grid-status assertion. Minimal passing version of `frontend/src/App.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('./hooks/useAuth', () => ({ useAuth: () => ({ isLoggedIn: false, credits: 0 }) }));
vi.mock('./hooks/useGridPoll', () => ({ useGridPoll: () => ({ data: undefined, isLoading: true, isError: false }) }));

import App from './App';

describe('App grid page', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });
});
```

- [ ] **Step 5: Run full test suite + build**

Run: `cd frontend && npm test && npm run build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 6: Manual smoke check**

Run: `cd frontend && npm run dev`, open the local URL.
Expected: cream background; sticky header with crow logo, Grid/Explore links, Submit CTA; the grid renders in the body; the pixel crow mascot sits bottom-left and hops/wanders; `/explore` shows the placeholder.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/routes.tsx frontend/src/main.tsx frontend/src/App.tsx frontend/src/App.test.tsx
git commit -m "feat(frontend): router with shared layout; move header/mascot out of App"
```

---

## Self-Review

- **Spec coverage (Plan 1 scope):** tokens (Task 2) ✓, Inter + pixel-accent font (Task 2) ✓, lucide-react + react-router (Task 1) ✓, routes for all 5 pages (Task 6) ✓, shared header (Task 5) ✓, crow mascot state machine + component + reduced-motion (Tasks 3–4) ✓. Page bodies (home sidebars, project/submit/profile/share) are deferred to Plans 2–6 — placeholders keep the router valid here.
- **Placeholder scan:** the `Placeholder` route element is intentional and labelled; no TBD/TODO steps.
- **Type consistency:** `CrowState`/`CrowSituation`/`nextCrowState` names match across `machine.ts`, its test, and `CrowMascot.tsx`. `motion/react` import path matches the installed `motion` v11 package.
- **Note:** `CodeRain` and `CrowLogo` components are no longer used by `App.tsx` after Task 6. They are left in the tree (not deleted) — Plan 2 decides whether the home page keeps a faint code-rain accent or removes it.
