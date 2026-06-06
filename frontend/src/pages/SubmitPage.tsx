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
