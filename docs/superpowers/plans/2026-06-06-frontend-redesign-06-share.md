# Frontend Redesign — Plan 6: Share Card (`/share/:id`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shareable achievement card at `/share/:id`: a live card preview (project name, color, tech chips, lifespan, territory) with customization controls (background style, show/hide tech + stats) and Download-PNG / Copy-link actions. Image generation is pure frontend (`html-to-image`).

**Architecture:** A new `ShareCardPage` fetches the project (`fetchProject`), renders a `ShareCard` preview component plus a controls panel. Controls are local state passed into `ShareCard` as props. Download captures the card DOM node with `html-to-image`'s `toPng` and triggers a browser download; Copy uses the clipboard API. No backend image endpoint is needed (the spec already says this is pure frontend). A "Share" link is added on the project detail page so the card is reachable.

**Tech Stack:** React 18, react-router-dom, @tanstack/react-query, lucide-react, `html-to-image` (new), Vitest + Testing Library. **Use yarn.**

**Spec:** `docs/superpowers/specs/2026-06-06-frontend-redesign-social-grid-design.md`

**Prereq:** Built on branch `redesign/social-ui` (Plans 1–5 present).

---

## Data Reality

`fetchProject(id)` provides everything the card needs: `name`, `color`, `tech_tags`, `expires_at` (→ lifespan via `formatTimeLeft`), `territory_size`, `status`. Image rendering and the share URL are pure client-side. No fabricated data; no backend gap here.

---

## File Structure

- `frontend/package.json` — add `html-to-image`
- `frontend/src/components/ShareCard.tsx` + `ShareCard.css` — **new**: the visual card (forwardRef so it can be captured)
- `frontend/src/components/__tests__/ShareCard.test.tsx` — **new**
- `frontend/src/pages/SharePage.tsx` + `SharePage.css` — **new**: preview + controls + actions
- `frontend/src/pages/__tests__/SharePage.test.tsx` — **new**
- `frontend/src/pages/ProjectDetailPage.tsx` — modify: add a "Share" link to `/share/:id`
- `frontend/src/routes.tsx` — modify: `/share/:id` → `<SharePage/>`

---

### Task 1: Install html-to-image

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install**

```bash
cd frontend && yarn add html-to-image@^1.11.0
```

- [ ] **Step 2: Verify**

Run: `cd frontend && yarn ls html-to-image 2>/dev/null || cat frontend/package.json | grep html-to-image`
Expected: `html-to-image` present in dependencies.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/yarn.lock
git commit -m "chore(frontend): add html-to-image for share card export"
```

---

### Task 2: ShareCard component (TDD)

**Files:**
- Create: `frontend/src/components/ShareCard.tsx`
- Create: `frontend/src/components/ShareCard.css`
- Test: `frontend/src/components/__tests__/ShareCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/__tests__/ShareCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShareCard } from '../ShareCard';
import type { Project } from '../../types/api';

const project: Project = {
  id: 'p1', name: 'EchoFlow', description: null, url: null,
  tech_tags: ['React', 'GPT-4'], owner_id: 'u1', status: 'alive',
  expires_at: new Date(Date.now() + 7200_000).toISOString(),
  momentum: 60, territory_size: 24, color: '#ac3509', created_at: '', died_at: null,
};

describe('ShareCard', () => {
  it('shows name, tech chips and stats by default', () => {
    render(<ShareCard project={project} background="cream" showTech showStats />);
    expect(screen.getByText('EchoFlow')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument(); // territory
  });

  it('hides tech chips and stats when toggled off', () => {
    render(<ShareCard project={project} background="cream" showTech={false} showStats={false} />);
    expect(screen.queryByText('React')).not.toBeInTheDocument();
    expect(screen.queryByText('24')).not.toBeInTheDocument();
  });

  it('applies the background variant class', () => {
    const { container } = render(<ShareCard project={project} background="dark" showTech showStats />);
    expect(container.querySelector('.share-card--dark')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && yarn vitest run src/components/__tests__/ShareCard.test.tsx`
Expected: FAIL — cannot resolve `../ShareCard`.

- [ ] **Step 3: Implement the CSS**

Create `frontend/src/components/ShareCard.css`:

```css
.share-card {
  width: 360px; height: 640px;
  border-radius: 20px; padding: 32px;
  display: flex; flex-direction: column;
  position: relative; overflow: hidden;
  border: 1px solid var(--border);
}
.share-card--cream { background: var(--bg); color: var(--text); }
.share-card--white { background: #ffffff; color: var(--text); }
.share-card--dark { background: #1b1b1c; color: #f3f0f1; border-color: #303031; }
.share-card__badge {
  align-self: flex-start; display: inline-flex; align-items: center; gap: 6px;
  background: var(--accent); color: var(--on-accent);
  border-radius: var(--radius-pill); padding: 6px 12px; font-size: 12px; font-weight: 700;
}
.share-card__brand { position: absolute; top: 32px; right: 32px; font-family: var(--font-pixel); font-size: 22px; opacity: 0.6; }
.share-card__center { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 18px; }
.share-card__swatch { width: 72px; height: 72px; border-radius: 18px; }
.share-card__name { font-size: 34px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; }
.share-card__chips { display: flex; flex-wrap: wrap; gap: 8px; }
.share-card__chip { border: 1px solid currentColor; opacity: 0.8; border-radius: var(--radius-pill); padding: 4px 12px; font-size: 13px; font-weight: 600; }
.share-card__stats { display: flex; gap: 32px; border-top: 1px solid currentColor; padding-top: 18px; }
.share-card__stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.7; }
.share-card__stat-value { font-family: var(--font-pixel); font-size: 26px; }
```

Create `frontend/src/components/ShareCard.tsx`:

```tsx
import { forwardRef } from 'react';
import { formatTimeLeft } from '../utils/time';
import type { Project } from '../types/api';
import './ShareCard.css';

export type ShareBackground = 'cream' | 'white' | 'dark';

interface Props {
  project: Project;
  background: ShareBackground;
  showTech: boolean;
  showStats: boolean;
}

export const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard(
  { project, background, showTech, showStats }, ref
) {
  return (
    <div ref={ref} className={`share-card share-card--${background}`}>
      <span className="share-card__badge">DIGITAL DARWINISM</span>
      <span className="share-card__brand">CROW</span>

      <div className="share-card__center">
        <div className="share-card__swatch" style={{ background: project.color }} />
        <div className="share-card__name">{project.name}</div>
        {showTech && project.tech_tags.length > 0 && (
          <div className="share-card__chips">
            {project.tech_tags.map(t => <span key={t} className="share-card__chip">{t}</span>)}
          </div>
        )}
      </div>

      {showStats && (
        <div className="share-card__stats">
          <div>
            <div className="share-card__stat-label">Lifespan</div>
            <div className="share-card__stat-value">{formatTimeLeft(project.expires_at)}</div>
          </div>
          <div>
            <div className="share-card__stat-label">Territory</div>
            <div className="share-card__stat-value">{project.territory_size}</div>
          </div>
        </div>
      )}
    </div>
  );
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && yarn vitest run src/components/__tests__/ShareCard.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ShareCard.tsx frontend/src/components/ShareCard.css frontend/src/components/__tests__/ShareCard.test.tsx
git commit -m "feat(frontend): ShareCard preview component"
```

---

### Task 3: SharePage (TDD)

**Files:**
- Create: `frontend/src/pages/SharePage.tsx`
- Create: `frontend/src/pages/SharePage.css`
- Test: `frontend/src/pages/__tests__/SharePage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/__tests__/SharePage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Project } from '../../types/api';

const sample: Project = {
  id: 'p1', name: 'EchoFlow', description: null, url: null,
  tech_tags: ['React'], owner_id: 'u1', status: 'alive',
  expires_at: new Date(Date.now() + 7200_000).toISOString(),
  momentum: 60, territory_size: 24, color: '#ac3509', created_at: '', died_at: null,
};

vi.mock('@tanstack/react-query', async (orig) => {
  const actual = await orig<typeof import('@tanstack/react-query')>();
  return { ...actual, useQuery: () => ({ data: sample, isLoading: false, isError: false }) };
});

const toPng = vi.fn().mockResolvedValue('data:image/png;base64,xxx');
vi.mock('html-to-image', () => ({ toPng: (...a: unknown[]) => toPng(...a) }));

import SharePage from '../SharePage';

function renderAt(path = '/share/p1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/share/:id" element={<SharePage />} /></Routes>
    </MemoryRouter>
  );
}

describe('SharePage', () => {
  it('renders the card preview and controls', () => {
    renderAt();
    expect(screen.getByText('EchoFlow')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
  });

  it('hides tech chips when the Show tech toggle is unchecked', async () => {
    const user = userEvent.setup();
    renderAt();
    expect(screen.getByText('React')).toBeInTheDocument();
    await user.click(screen.getByLabelText(/show tech stack/i));
    expect(screen.queryByText('React')).not.toBeInTheDocument();
  });

  it('captures the card to PNG when Download is clicked', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole('button', { name: /download/i }));
    expect(toPng).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && yarn vitest run src/pages/__tests__/SharePage.test.tsx`
Expected: FAIL — cannot resolve `../SharePage`.

- [ ] **Step 3: Implement the CSS**

Create `frontend/src/pages/SharePage.css`:

```css
.share { max-width: var(--container-max); margin: 0 auto; padding: var(--margin-desktop); }
.share__grid { display: grid; grid-template-columns: 1fr 320px; gap: 40px; align-items: start; }
.share__preview { display: flex; justify-content: center; padding: 32px; background: var(--surface-well); border-radius: var(--radius); }
.share__panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-card); padding: 24px; }
.share__panel-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; }
.share__group { margin-bottom: 20px; }
.share__group-label { font-weight: 600; font-size: 13px; margin-bottom: 8px; }
.share__bg-options { display: flex; gap: 10px; }
.share__bg-swatch { width: 40px; height: 40px; border-radius: 10px; border: 2px solid var(--border); cursor: pointer; }
.share__bg-swatch--active { border-color: var(--accent); }
.share__toggle { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; font-size: 14px; }
.share__actions { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
.share__muted { color: var(--text-muted); padding: 48px; text-align: center; }
```

- [ ] **Step 4: Implement the page**

Create `frontend/src/pages/SharePage.tsx`:

```tsx
import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toPng } from 'html-to-image';
import { Download, Link2 } from 'lucide-react';
import { fetchProject } from '../api/projects';
import { ShareCard, type ShareBackground } from '../components/ShareCard';
import './SharePage.css';

const BACKGROUNDS: { key: ShareBackground; color: string }[] = [
  { key: 'cream', color: '#fcf8f9' },
  { key: 'white', color: '#ffffff' },
  { key: 'dark', color: '#1b1b1c' },
];

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const cardRef = useRef<HTMLDivElement>(null);
  const [background, setBackground] = useState<ShareBackground>('cream');
  const [showTech, setShowTech] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [copied, setCopied] = useState(false);

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });

  if (isLoading) return <main className="share"><p className="share__muted">Loading…</p></main>;
  if (isError || !project) return <main className="share"><p className="share__muted">Project not found.</p></main>;

  async function handleDownload() {
    if (!cardRef.current) return;
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${project!.name}-crow.png`;
    a.click();
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="share">
      <div className="share__grid">
        <div className="share__preview">
          <ShareCard ref={cardRef} project={project} background={background} showTech={showTech} showStats={showStats} />
        </div>

        <aside className="share__panel">
          <h2 className="share__panel-title">Customize Card</h2>

          <div className="share__group">
            <div className="share__group-label">Background</div>
            <div className="share__bg-options">
              {BACKGROUNDS.map(b => (
                <button
                  key={b.key}
                  type="button"
                  aria-label={`Background ${b.key}`}
                  className={`share__bg-swatch${background === b.key ? ' share__bg-swatch--active' : ''}`}
                  style={{ background: b.color }}
                  onClick={() => setBackground(b.key)}
                />
              ))}
            </div>
          </div>

          <div className="share__group">
            <label className="share__toggle">
              Show tech stack
              <input type="checkbox" checked={showTech} onChange={e => setShowTech(e.target.checked)} aria-label="Show tech stack" />
            </label>
            <label className="share__toggle">
              Show stats
              <input type="checkbox" checked={showStats} onChange={e => setShowStats(e.target.checked)} aria-label="Show stats" />
            </label>
          </div>

          <div className="share__actions">
            <button className="btn btn--primary" onClick={handleDownload}>
              <Download size={15} /> Download PNG
            </button>
            <button className="btn btn--secondary" onClick={handleCopy}>
              <Link2 size={15} /> {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && yarn vitest run src/pages/__tests__/SharePage.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/SharePage.tsx frontend/src/pages/SharePage.css frontend/src/pages/__tests__/SharePage.test.tsx
git commit -m "feat(frontend): share card page with PNG export"
```

---

### Task 4: Wire route + share link on detail page

**Files:**
- Modify: `frontend/src/routes.tsx`
- Modify: `frontend/src/pages/ProjectDetailPage.tsx`

- [ ] **Step 1: Point `/share/:id` at the page**

In `frontend/src/routes.tsx`, add `import SharePage from './pages/SharePage';` and change the `/share/:id` route element from `<Placeholder title="Share Card" />` to `<SharePage />`. Leave other routes untouched.

- [ ] **Step 2: Add a Share link on the detail page**

In `frontend/src/pages/ProjectDetailPage.tsx`, read the file and add a `Share2` icon to the existing lucide import line, then add a Share link inside the author/aside `detail__card` area (or just below the project url card). Add this card block in the `<aside>` (after the url card, before the related card):

```tsx
<div className="detail__card">
  <Link className="detail__link" to={`/share/${project.id}`}>
    <Share2 size={16} /> Share this project
  </Link>
</div>
```

Ensure `Share2` is imported from `lucide-react` (add to the existing import).

- [ ] **Step 3: Full suite + build**

Run: `cd frontend && yarn test && yarn build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 4: Manual smoke**

Run: `cd frontend && yarn dev`. From a project detail page click "Share this project" → `/share/:id` shows the card preview; switching background swatches restyles it; toggling Show tech/stats updates the card; Download PNG saves an image; Copy link copies the URL.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/routes.tsx frontend/src/pages/ProjectDetailPage.tsx
git commit -m "feat(frontend): route /share/:id; add Share link on detail page"
```

---

## Self-Review

- **Spec coverage:** downloadable card (name/tech/lifespan/territory) ✓ (T2); customization — background + show tech/stats toggles ✓ (T3); download + copy link ✓ (T3); route + reachable from detail page ✓ (T4). (The spec's "layout variant" dropdown is intentionally trimmed to background + toggles per YAGNI; note below.)
- **Data honesty:** all card data is real from `fetchProject`; export and share URL are pure client-side. No backend gap.
- **Placeholder scan:** no TODO-as-work; no placeholders.
- **Type consistency:** `ShareBackground` union ('cream'|'white'|'dark') shared between `ShareCard` and `SharePage`; `ShareCard` is a `forwardRef<HTMLDivElement>` captured by `SharePage`'s `cardRef` and passed to `toPng`. `formatTimeLeft(expires_at)` reused.
- **Scope note:** dropped the BuildLog "Layout Variant" select (Standard/Compact) to keep scope tight — background + two toggles already deliver meaningful customization. Easy to add later if wanted.
- **Test note:** `toPng` and `useQuery` are mocked in the SharePage test (jsdom can't rasterize DOM); the test verifies the wiring (capture called, toggles drive the card), not the pixel output.
