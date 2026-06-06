import { Clock, Grid2x2 } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMyProject } from '../hooks/useMyProject';
import { createProject, abandonProject } from '../api/projects';
import { formatTimeLeft } from '../utils/time';
import './ProjectPanel.css';

export function ProjectPanel() {
  const { data: project, isLoading } = useMyProject();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    description: '',
    url: '',
    tech_tags: '',
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      createProject({
        name: form.name,
        description: form.description || undefined,
        url: form.url || undefined,
        tech_tags: form.tech_tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProject'] });
      queryClient.invalidateQueries({ queryKey: ['grid'] });
    },
  });

  const abandonMutation = useMutation({
    mutationFn: () => abandonProject(project!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProject'] });
      queryClient.invalidateQueries({ queryKey: ['grid'] });
    },
  });

  if (isLoading) return null;

  if (project) {
    const timeLeft = formatTimeLeft(project.expires_at);
    return (
      <aside className="project-panel">
        <div
          className={`panel-card panel-card--${project.status}`}
          style={{ '--project-color': project.color } as React.CSSProperties}
        >
          <header className="panel-card__header">
            <h3 className="panel-card__name">{project.name}</h3>
            <span className={`badge badge--${project.status}`}>{project.status}</span>
          </header>

          <div className="panel-card__momentum">
            <div className="momentum-bar">
              <div
                className="momentum-bar__fill"
                style={{ width: `${project.momentum}%` }}
              />
            </div>
            <span className="panel-card__momentum-label">
              {project.momentum} / 100 momentum
            </span>
          </div>

          <div className="panel-card__meta">
            <span><Clock size={13} /> {timeLeft}</span>
            <span><Grid2x2 size={13} /> {project.territory_size} cells</span>
          </div>

          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="panel-card__link"
            >
              {project.url.replace(/^https?:\/\//, '')}
            </a>
          )}

          <button
            className="btn btn--danger"
            onClick={() => {
              if (
                window.confirm(
                  `Abandon "${project.name}"? This cannot be undone. All cells become Fossil.`
                )
              ) {
                abandonMutation.mutate();
              }
            }}
            disabled={abandonMutation.isPending}
          >
            {abandonMutation.isPending ? 'Abandoning…' : 'Abandon'}
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="project-panel">
      <form
        className="submit-form"
        onSubmit={e => {
          e.preventDefault();
          submitMutation.mutate();
        }}
      >
        <h3 className="submit-form__title">Submit Your Project</h3>
        <input
          required
          className="input"
          placeholder="Project name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        <textarea
          className="input"
          placeholder="Description (optional)"
          rows={3}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        />
        <input
          className="input"
          placeholder="URL (optional)"
          value={form.url}
          onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
        />
        <input
          className="input"
          placeholder="Tech stack (comma-separated)"
          value={form.tech_tags}
          onChange={e => setForm(f => ({ ...f, tech_tags: e.target.value }))}
        />
        {submitMutation.error && (
          <p className="error">{(submitMutation.error as Error).message}</p>
        )}
        <button
          type="submit"
          className="btn btn--primary"
          disabled={submitMutation.isPending || !form.name.trim()}
        >
          {submitMutation.isPending ? 'Submitting…' : 'Submit to Grid'}
        </button>
      </form>
    </aside>
  );
}
