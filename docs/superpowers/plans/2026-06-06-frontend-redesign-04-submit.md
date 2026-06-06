# Frontend Redesign — Plan 4: Submit Page (`/submit`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the BuildLog-style sectioned submit page at `/submit`: Core Identity (name, description, project URL), Build Process (tech-stack chip input), and a Visual Evidence section that is visibly present but disabled (no upload endpoint). Submitting claims grid territory via `createProject`.

**Architecture:** A new `SubmitPage` renders a sectioned form on the cream theme. A reusable `TagInput` chip component handles the tech-stack field. On submit, `createProject({ name, description, url, tech_tags })` runs and navigates home on success. The page guards three states: not logged in (prompt to log in), already holding territory (one project per user — show the existing project), and the form.

**Tech Stack:** React 18, react-router-dom, @tanstack/react-query, lucide-react, Vitest + Testing Library + user-event. **Use yarn.**

**Spec:** `docs/superpowers/specs/2026-06-06-frontend-redesign-social-grid-design.md`

**Prereq:** Built on branch `redesign/social-ui` (Plans 1–3 present).

---

## Data Reality

`createProject(data: ProjectCreate)` accepts ONLY `{ name, description?, url?, tech_tags? }`. The backend has **no separate demo/repo URL fields** (single `url`), **no screenshot upload endpoint**, and **no build-duration/story field** beyond `description`. So:
- The form submits exactly those four fields. "Project URL" maps to `url`; "Description" maps to `description`.
- The **Visual Evidence** section (screenshot upload) is rendered as a disabled dropzone with `TODO: upload endpoint` — it is part of the target design, shown but inert, never faking success.
- A user holds at most one live project (`fetchMyProject` returns it). If one exists, the page shows it instead of the form rather than letting a doomed create through.

No fields that the backend can't persist are added as if functional.

---

## File Structure

- `frontend/src/components/TagInput.tsx` + `TagInput.css` — **new**: chip/tag input
- `frontend/src/components/__tests__/TagInput.test.tsx` — **new**
- `frontend/src/pages/SubmitPage.tsx` + `SubmitPage.css` — **new**
- `frontend/src/pages/__tests__/SubmitPage.test.tsx` — **new**
- `frontend/src/routes.tsx` — modify: `/submit` → `<SubmitPage/>`

---

### Task 1: TagInput chip component (TDD)

**Files:**
- Create: `frontend/src/components/TagInput.tsx`
- Create: `frontend/src/components/TagInput.css`
- Test: `frontend/src/components/__tests__/TagInput.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/__tests__/TagInput.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TagInput } from '../TagInput';

function Harness({ initial = [] as string[] }) {
  const [tags, setTags] = useState<string[]>(initial);
  return <TagInput value={tags} onChange={setTags} placeholder="Add a tool…" />;
}

describe('TagInput', () => {
  it('adds a trimmed tag on Enter and clears the input', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByPlaceholderText('Add a tool…');
    await user.type(input, '  React  {Enter}');
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('ignores duplicate and empty tags', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['React']} />);
    const input = screen.getByPlaceholderText('Add a tool…');
    await user.type(input, 'React{Enter}');
    await user.type(input, '   {Enter}');
    expect(screen.getAllByText('React')).toHaveLength(1);
  });

  it('removes a tag when its remove button is clicked', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['React', 'GPT-4']} />);
    await user.click(screen.getByRole('button', { name: /remove React/i }));
    expect(screen.queryByText('React')).not.toBeInTheDocument();
    expect(screen.getByText('GPT-4')).toBeInTheDocument();
  });

  it('removes the last tag on Backspace when the input is empty', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['React', 'GPT-4']} />);
    const input = screen.getByPlaceholderText('Add a tool…');
    input.focus();
    await user.keyboard('{Backspace}');
    expect(screen.queryByText('GPT-4')).not.toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && yarn vitest run src/components/__tests__/TagInput.test.tsx`
Expected: FAIL — cannot resolve `../TagInput`.

- [ ] **Step 3: Implement**

Create `frontend/src/components/TagInput.css`:

```css
.tag-input {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  background: var(--surface-well);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
}
.tag-input:focus-within { border-color: var(--accent); }
.tag-input__chip {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--surface-2); color: var(--text);
  border-radius: var(--radius-pill); padding: 4px 10px; font-size: 13px; font-weight: 600;
}
.tag-input__remove {
  display: inline-flex; border: none; background: none; cursor: pointer;
  color: var(--text-muted); padding: 0;
}
.tag-input__remove:hover { color: var(--accent); }
.tag-input__field {
  flex: 1; min-width: 120px; border: none; outline: none; background: transparent;
  font-size: 14px; color: var(--text);
}
```

Create `frontend/src/components/TagInput.tsx`:

```tsx
import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import './TagInput.css';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState('');

  function addTag() {
    const tag = draft.trim();
    if (!tag || value.includes(tag)) {
      setDraft('');
      return;
    }
    onChange([...value, tag]);
    setDraft('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="tag-input">
      {value.map(tag => (
        <span key={tag} className="tag-input__chip">
          {tag}
          <button
            type="button"
            className="tag-input__remove"
            aria-label={`Remove ${tag}`}
            onClick={() => onChange(value.filter(t => t !== tag))}
          >
            <X size={13} />
          </button>
        </span>
      ))}
      <input
        className="tag-input__field"
        value={draft}
        placeholder={placeholder}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && yarn vitest run src/components/__tests__/TagInput.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/TagInput.tsx frontend/src/components/TagInput.css frontend/src/components/__tests__/TagInput.test.tsx
git commit -m "feat(frontend): TagInput chip component"
```

---

### Task 2: SubmitPage (TDD)

**Files:**
- Create: `frontend/src/pages/SubmitPage.tsx`
- Create: `frontend/src/pages/SubmitPage.css`
- Test: `frontend/src/pages/__tests__/SubmitPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/__tests__/SubmitPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => {
  const actual = await orig<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

let auth = { isLoggedIn: true };
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => auth }));

let myProject: unknown = null;
vi.mock('../../hooks/useMyProject', () => ({ useMyProject: () => ({ data: myProject, isLoading: false }) }));

const createProject = vi.fn().mockResolvedValue({ id: 'new1' });
vi.mock('../../api/projects', () => ({ createProject: (...a: unknown[]) => createProject(...a) }));

import SubmitPage from '../SubmitPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderPage() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><SubmitPage /></MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SubmitPage', () => {
  beforeEach(() => { auth = { isLoggedIn: true }; myProject = null; createProject.mockClear(); navigate.mockClear(); });

  it('prompts to log in when logged out', () => {
    auth = { isLoggedIn: false };
    renderPage();
    expect(screen.getByText(/log in to claim/i)).toBeInTheDocument();
  });

  it('shows the existing project when the user already holds territory', () => {
    myProject = { id: 'mine', name: 'MyThing' };
    renderPage();
    expect(screen.getByText(/already hold territory/i)).toBeInTheDocument();
  });

  it('submits name + description + tags and navigates home on success', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/project name/i), 'EchoFlow');
    await user.type(screen.getByLabelText(/description/i), 'A living agent.');
    await user.type(screen.getByPlaceholderText(/add a tool/i), 'React{Enter}');
    await user.click(screen.getByRole('button', { name: /post to grid/i }));
    expect(createProject).toHaveBeenCalledWith({
      name: 'EchoFlow', description: 'A living agent.', url: undefined, tech_tags: ['React'],
    });
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && yarn vitest run src/pages/__tests__/SubmitPage.test.tsx`
Expected: FAIL — cannot resolve `../SubmitPage`.

- [ ] **Step 3: Implement the CSS**

Create `frontend/src/pages/SubmitPage.css`:

```css
.submit { max-width: 760px; margin: 0 auto; padding: var(--margin-desktop); }
.submit__title { font-size: 40px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 8px; }
.submit__lead { color: var(--text-muted); font-size: 16px; margin-bottom: 32px; }
.submit__section {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  box-shadow: var(--shadow-card); padding: 24px; margin-bottom: 24px;
}
.submit__section-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.submit__section-hint { color: var(--text-muted); font-size: 13px; margin-bottom: 18px; }
.submit__field { margin-bottom: 16px; }
.submit__label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 6px; }
.submit__dropzone {
  border: 2px dashed var(--border); border-radius: var(--radius);
  padding: 32px; text-align: center; color: var(--text-muted); opacity: 0.7;
}
.submit__row { display: flex; justify-content: flex-end; gap: 12px; }
.submit__notice { text-align: center; padding: 48px; }
.submit__notice .btn { margin-top: 16px; }
```

- [ ] **Step 4: Implement the page**

Create `frontend/src/pages/SubmitPage.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Send } from 'lucide-react';
import { createProject } from '../api/projects';
import { useAuth } from '../hooks/useAuth';
import { useMyProject } from '../hooks/useMyProject';
import { LoginButton } from '../components/LoginButton';
import { TagInput } from '../components/TagInput';
import './SubmitPage.css';

export default function SubmitPage() {
  const { isLoggedIn } = useAuth();
  const { data: myProject, isLoading } = useMyProject();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const submit = useMutation({
    mutationFn: () =>
      createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        url: url.trim() || undefined,
        tech_tags: tags,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProject'] });
      queryClient.invalidateQueries({ queryKey: ['grid'] });
      navigate('/');
    },
  });

  if (!isLoggedIn) {
    return (
      <main className="submit">
        <div className="submit__notice">
          <h1 className="submit__title">Claim your territory</h1>
          <p className="submit__lead">Log in to claim a spot on the grid.</p>
          <LoginButton />
        </div>
      </main>
    );
  }

  if (isLoading) return <main className="submit"><p className="submit__lead">Loading…</p></main>;

  if (myProject) {
    return (
      <main className="submit">
        <div className="submit__notice">
          <h1 className="submit__title">You already hold territory</h1>
          <p className="submit__lead">Each builder holds one project at a time.</p>
          <Link to={`/p/${myProject.id}`} className="btn btn--primary">View “{myProject.name}”</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="submit">
      <h1 className="submit__title">Claim your territory</h1>
      <p className="submit__lead">Submit a project to stake a living cell on the grid.</p>

      <form
        onSubmit={e => { e.preventDefault(); submit.mutate(); }}
      >
        <section className="submit__section">
          <h2 className="submit__section-title">Core Identity</h2>
          <p className="submit__section-hint">The basics of what you're building.</p>

          <div className="submit__field">
            <label className="submit__label" htmlFor="name">Project name</label>
            <input id="name" className="input" required value={name}
              onChange={e => setName(e.target.value)} placeholder="e.g. EchoFlow" />
          </div>

          <div className="submit__field">
            <label className="submit__label" htmlFor="desc">Description</label>
            <textarea id="desc" className="input" rows={3} value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="A brief summary of what it does and who it's for." />
          </div>

          <div className="submit__field">
            <label className="submit__label" htmlFor="url">Project URL</label>
            <input id="url" className="input" value={url}
              onChange={e => setUrl(e.target.value)} placeholder="https://… (demo or repo)" />
          </div>
        </section>

        <section className="submit__section">
          <h2 className="submit__section-title">Visual Evidence</h2>
          <p className="submit__section-hint">Show, don't just tell. (Coming soon.)</p>
          <div className="submit__dropzone">
            <ImagePlus size={28} />
            {/* TODO: screenshot upload endpoint not available yet */}
            <p>Screenshot upload coming soon</p>
          </div>
        </section>

        <section className="submit__section">
          <h2 className="submit__section-title">The Build Process</h2>
          <p className="submit__section-hint">What did you build it with?</p>
          <div className="submit__field">
            <label className="submit__label">Tech stack &amp; AI tools</label>
            <TagInput value={tags} onChange={setTags} placeholder="Add a tool (press enter)…" />
          </div>
        </section>

        {submit.error && <p className="error">{(submit.error as Error).message}</p>}

        <div className="submit__row">
          <button type="submit" className="btn btn--primary"
            disabled={submit.isPending || !name.trim()}>
            <Send size={15} /> {submit.isPending ? 'Posting…' : 'Post to Grid'}
          </button>
        </div>
      </form>
    </main>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && yarn vitest run src/pages/__tests__/SubmitPage.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/SubmitPage.tsx frontend/src/pages/SubmitPage.css frontend/src/pages/__tests__/SubmitPage.test.tsx
git commit -m "feat(frontend): submit page (sectioned create-project form)"
```

---

### Task 3: Wire the route

**Files:**
- Modify: `frontend/src/routes.tsx`

- [ ] **Step 1: Point `/submit` at the page**

In `frontend/src/routes.tsx`, add `import SubmitPage from './pages/SubmitPage';` and change the `/submit` route element from `<Placeholder title="Submit Project" />` to `<SubmitPage />`. Leave other placeholder routes untouched.

- [ ] **Step 2: Full suite + build**

Run: `cd frontend && yarn test && yarn build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 3: Manual smoke**

Run: `cd frontend && yarn dev`. Visit `/submit`: logged out → login prompt; logged in with no project → the three sectioned cards (Core Identity, Visual Evidence disabled dropzone, Build Process with chip input), Post to Grid disabled until a name is entered; submitting navigates home and the new cell appears. Logged in with an existing project → "already hold territory" with a link to it.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes.tsx
git commit -m "feat(frontend): route /submit to SubmitPage"
```

---

## Self-Review

- **Spec coverage:** sectioned form (Core Identity / Visual / Build Process) ✓ (T2); tech-stack chip input ✓ (T1/T2); submit = createProject ✓ (T2); route ✓ (T3).
- **Data honesty:** only `{name, description, url, tech_tags}` submitted (the four fields the backend accepts); the screenshot dropzone is disabled with a `TODO` and never fakes upload; one-project-per-user is respected by showing the existing project. No non-persisted fields presented as functional.
- **Placeholder scan:** `TODO` is an intentional backend-gap marker; no unfinished plan steps.
- **Type consistency:** `TagInput` props (`value: string[]`, `onChange: (tags: string[]) => void`, `placeholder?`) used consistently in SubmitPage and tests. `createProject(ProjectCreate)` called with exactly `{ name, description?, url?, tech_tags }`. `useMyProject()` returns `{ data, isLoading }` as consumed.
- **Note:** SubmitPage overlaps with the inline create form in `ProjectPanel` (home sidebar). Both are intentionally kept — the sidebar is a quick inline path, `/submit` is the full page. Not consolidating now to avoid scope creep; flagged for a possible later cleanup.
