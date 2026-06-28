import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Copy, Check, Terminal, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { createProject } from '../api/projects';
import { ApiError } from '../api/client';
import { startLogin } from '../utils/loginRedirect';
import { PLUGIN_REPO, PLUGIN_INSTALL_STEPS, PLUGIN_RUN_COMMAND } from '../lib/submit';
import './SubmitPage.css';

function TerminalPanel() {
  const [copied, setCopied] = useState<number | null>(null);

  async function copy(cmd: string, i: number) {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(i);
      setTimeout(() => setCopied(c => (c === i ? null : c)), 1500);
    } catch {
      /* clipboard unavailable — the command is still visible to copy manually */
    }
  }

  return (
    <section className="submit__terminal" aria-label="Submit from the terminal">
      <h2 className="submit__terminal-title"><Terminal size={16} /> Prefer the terminal?</h2>
      <p className="submit__terminal-lead">
        Install the <strong>crow-submit</strong> Claude Code plugin once, then submit from any project directory.
      </p>
      <ol className="submit__steps">
        {PLUGIN_INSTALL_STEPS.map((cmd, i) => (
          <li key={cmd} className="submit__step">
            <span className="submit__num">{i + 1}</span>
            <code className="submit__cmd">{cmd}</code>
            <button
              type="button"
              className="submit__copy"
              aria-label={`Copy command ${i + 1}`}
              onClick={() => copy(cmd, i)}
            >
              {copied === i ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </li>
        ))}
      </ol>
      <p className="submit__run">
        Then run <code>{PLUGIN_RUN_COMMAND}</code> in any project directory.
      </p>
      <a className="submit__plugin-link" href={PLUGIN_REPO} target="_blank" rel="noopener noreferrer">
        View the plugin <ArrowRight size={14} />
      </a>
    </section>
  );
}

export default function SubmitPage() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [repo, setRepo] = useState('');
  const [tags, setTags] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const urlInvalid = url.trim() !== '' && !/^https?:\/\//.test(url.trim());
  const repoInvalid = repo.trim() !== '' && !repo.trim().startsWith('https://github.com/');
  const canSubmit = name.trim() !== '' && !urlInvalid && !repoInvalid;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || pending) return;
    setPending(true);
    setError(null);
    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        url: url.trim() || undefined,
        repo: repo.trim() || undefined,
        tech_tags: tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5),
      });
      navigate(`/p/${project.id}`);
    } catch (err) {
      setError(err);
      setPending(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <main className="submit page-container">
        <div className="submit__wrap">
          <header className="submit__head">
            <p className="eyebrow">Join the grid</p>
            <h1>Submit a project</h1>
            <p className="submit__lead">Log in with GitHub to claim a cell on the Grid.</p>
          </header>
          <div className="submit__card submit__card--login">
            <p>Crow uses your GitHub account to attribute projects and credits. One click and you're in.</p>
            <button className="btn btn--primary" onClick={() => startLogin('/submit')}>Log in with GitHub</button>
          </div>
          <TerminalPanel />
        </div>
      </main>
    );
  }

  const status = error instanceof ApiError ? error.status : null;

  return (
    <main className="submit page-container">
      <div className="submit__wrap">
        <header className="submit__head">
          <p className="eyebrow">Join the grid</p>
          <h1>Submit a project</h1>
          <p className="submit__lead">Claim a cell. The crowd decides if it survives.</p>
        </header>

        <form className="submit__card" onSubmit={onSubmit} noValidate>
          <label className="submit__field" htmlFor="sp-name">
            <span className="submit__label">Project name <em>required</em></span>
            <input id="sp-name" value={name} onChange={e => setName(e.target.value)} maxLength={120} placeholder="e.g. EchoFlow" required />
          </label>

          <label className="submit__field" htmlFor="sp-desc">
            <span className="submit__label">Description <small>{description.length}/200</small></span>
            <textarea id="sp-desc" value={description} onChange={e => setDescription(e.target.value.slice(0, 200))} rows={3} placeholder="One or two sentences on what it does." />
          </label>

          <label className="submit__field" htmlFor="sp-url">
            <span className="submit__label">Homepage URL <small>optional</small></span>
            <input id="sp-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" aria-invalid={urlInvalid} />
            {urlInvalid && <em className="submit__error">URL must start with http:// or https://</em>}
          </label>

          <label className="submit__field" htmlFor="sp-repo">
            <span className="submit__label">GitHub repo <small>optional · public, enables collaboration</small></span>
            <input id="sp-repo" value={repo} onChange={e => setRepo(e.target.value)} placeholder="https://github.com/owner/repo" aria-invalid={repoInvalid} />
            {repoInvalid && <em className="submit__error">Repo must be a https://github.com/ URL</em>}
          </label>

          <label className="submit__field" htmlFor="sp-tags">
            <span className="submit__label">Tech tags <small>comma-separated, up to 5</small></span>
            <input id="sp-tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="React, FastAPI, Postgres" />
          </label>

          {status === 409 && (
            <p className="submit__error" role="alert">You already have an active project. <Link to="/explore">Find it</Link> or abandon it before submitting a new one.</p>
          )}
          {status === 503 && <p className="submit__error" role="alert">The Grid is full right now — try again when a project dies.</p>}
          {error != null && status !== 409 && status !== 503 && <p className="submit__error" role="alert">We couldn't submit your project. Please try again.</p>}

          <div className="submit__actions">
            <button type="submit" className="btn btn--primary submit__go" disabled={!canSubmit || pending}>
              {pending ? 'Submitting…' : 'Submit project'}
            </button>
          </div>
        </form>

        <TerminalPanel />
      </div>
    </main>
  );
}
