import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createProject } from '../api/projects';
import { ApiError } from '../api/client';
import { startLogin } from '../utils/loginRedirect';
import './SubmitPage.css';

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
        <h1>Submit a project</h1>
        <p className="submit__lead">Log in with GitHub to claim a cell on the Grid.</p>
        <button className="btn btn--primary" onClick={() => startLogin('/submit')}>Log in with GitHub</button>
      </main>
    );
  }

  const status = error instanceof ApiError ? error.status : null;

  return (
    <main className="submit page-container">
      <h1>Submit a project</h1>
      <p className="submit__lead">Claim a cell. The crowd decides if it survives.</p>
      <form className="submit__form" onSubmit={onSubmit}>
        <label className="submit__field" htmlFor="sp-name">
          <span>Project name *</span>
          <input id="sp-name" value={name} onChange={e => setName(e.target.value)} maxLength={120} required />
        </label>
        <label className="submit__field" htmlFor="sp-desc">
          <span>Description <small>{description.length}/200</small></span>
          <textarea id="sp-desc" value={description} onChange={e => setDescription(e.target.value.slice(0, 200))} rows={3} />
        </label>
        <label className="submit__field" htmlFor="sp-url">
          <span>Homepage URL</span>
          <input id="sp-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" />
          {urlInvalid && <em className="submit__error">URL must start with http:// or https://</em>}
        </label>
        <label className="submit__field" htmlFor="sp-repo">
          <span>GitHub repo <small>(optional — public, enables collaboration)</small></span>
          <input id="sp-repo" value={repo} onChange={e => setRepo(e.target.value)} placeholder="https://github.com/owner/repo" />
          {repoInvalid && <em className="submit__error">Repo must be a https://github.com/ URL</em>}
        </label>
        <label className="submit__field" htmlFor="sp-tags">
          <span>Tech tags <small>(comma-separated, up to 5)</small></span>
          <input id="sp-tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="React, FastAPI, Postgres" />
        </label>
        {status === 409 && (
          <p className="submit__error">You already have an active project. <Link to="/explore">Find it</Link> or abandon it before submitting a new one.</p>
        )}
        {status === 503 && <p className="submit__error">The Grid is full right now — try again when a project dies.</p>}
        {error != null && status !== 409 && status !== 503 && <p className="submit__error">Couldn’t submit. Please try again.</p>}
        <button type="submit" className="btn btn--primary" disabled={!canSubmit || pending}>
          {pending ? 'Submitting…' : 'Submit project'}
        </button>
      </form>
    </main>
  );
}
