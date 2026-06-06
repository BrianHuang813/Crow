import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, TrendingUp, Grid2x2, Flag, ExternalLink } from 'lucide-react';
import { fetchProject } from '../api/projects';
import { useAuth } from '../hooks/useAuth';
import { useGridPoll } from '../hooks/useGridPoll';
import { useTopProjects } from '../hooks/useTopProjects';
import { ProjectActions } from '../components/ProjectActions';
import { formatTimeLeft } from '../utils/time';
import './ProjectDetailPage.css';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { userId } = useAuth();
  const { data: snapshot } = useGridPoll();
  const top = useTopProjects(snapshot);

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });

  if (isLoading) return <main className="detail"><p className="detail__muted">Loading project…</p></main>;
  if (isError || !project) return <main className="detail"><p className="detail__muted">Project not found.</p></main>;

  const isOwn = !!userId && project.owner_id === userId;
  const related = top.filter(t => t.project && t.projectId !== project.id).slice(0, 4);

  return (
    <main className="detail">
      <Link to="/" className="detail__back"><ArrowLeft size={16} /> Back to grid</Link>
      <div className="detail__grid">
        <div>
          <h1 className="detail__title">{project.name}</h1>
          <div className="detail__color-bar" style={{ background: project.color }} />
          <span className={`detail__status detail__status--${project.status}`}>{project.status}</span>

          {project.description && <p className="detail__story" style={{ marginTop: 20 }}>{project.description}</p>}

          <div className="detail__stats">
            <div>
              <div className="detail__stat-label"><Clock size={13} /> Lifespan</div>
              <div className="detail__stat-value">{formatTimeLeft(project.expires_at)}</div>
            </div>
            <div>
              <div className="detail__stat-label"><TrendingUp size={13} /> Momentum</div>
              <div className="detail__stat-value">{project.momentum}</div>
            </div>
            <div>
              <div className="detail__stat-label"><Grid2x2 size={13} /> Territory</div>
              <div className="detail__stat-value">{project.territory_size}</div>
            </div>
          </div>

          {project.tech_tags.length > 0 && (
            <div className="detail__chips">
              {project.tech_tags.map(t => <span key={t} className="detail__chip">{t}</span>)}
            </div>
          )}

          <ProjectActions project={project} />
        </div>

        <aside>
          <div className="detail__card">
            <div className="detail__author-name">{isOwn ? 'You' : `Builder ${project.owner_id.slice(0, 6)}`}</div>
            <div className="detail__author-role">Project owner</div>
            <button className="btn btn--secondary" disabled title="Coming soon">
              <Flag size={14} /> Follow
            </button>
            {/* TODO: follow endpoint + resolve owner handle/avatar */}
          </div>

          {project.url && (
            <div className="detail__card">
              <a className="detail__link" href={project.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={16} /> {project.url.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}

          {related.length > 0 && (
            <div className="detail__card">
              <div className="detail__author-role" style={{ marginBottom: 8 }}>More on the grid</div>
              {/* TODO: real similarity-based recommendations endpoint */}
              {related.map(t => (
                <Link key={t.projectId} to={`/p/${t.projectId}`} className="detail__related-row">
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: t.color, flex: 'none' }} />
                  <span>{t.project!.name}</span>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
