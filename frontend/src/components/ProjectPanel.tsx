import { Clock, Grid2x2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMyProject } from '../hooks/useMyProject';
import { abandonProject } from '../api/projects';
import { formatTimeLeft } from '../utils/time';
import './ProjectPanel.css';

export function ProjectPanel() {
  const { data: project, isLoading } = useMyProject();
  const queryClient = useQueryClient();

  const abandonMutation = useMutation({
    mutationFn: () => abandonProject(project!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProject'] });
      queryClient.invalidateQueries({ queryKey: ['grid'] });
    },
  });

  if (isLoading) return null;

  if (!project) return null;

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
