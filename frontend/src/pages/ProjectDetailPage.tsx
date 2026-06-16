import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Clock, TrendingUp, Grid2x2, ExternalLink, Share2 } from 'lucide-react';
import { fetchProject } from '../api/projects';
import { useAuth } from '../hooks/useAuth';
import { useRelated } from '../hooks/useRelated';
import { ProjectActions } from '../components/ProjectActions';
import { ProjectArtwork } from '../components/ProjectArtwork';
import { formatTimeLeft } from '../utils/time';
import './ProjectDetailPage.css';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { userId } = useAuth();
  const { data: relatedData } = useRelated(id);

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });

  if (isLoading) return <main className="detail page-container"><div className="page-message">Loading project...</div></main>;
  if (isError || !project) return <main className="detail page-container"><div className="page-message">Project not found.</div></main>;

  const isOwn = !!userId && project.owner_id === userId;
  const related = (relatedData?.items ?? []).filter(p => p.id !== project.id).slice(0, 4);

  return (
    <main className="detail page-container">
      <Link to="/explore" className="detail__back"><ArrowLeft size={16} /> Back to Explore</Link>
      <div className="detail__grid">
        <div className="detail__main">
          <ProjectArtwork project={project} className="detail__artwork" />

          <section className="detail__intro">
            <span className={`status status--${project.status}`}>{project.status}</span>
            <h1 className="detail__title">{project.name}</h1>
            {project.description && <p className="detail__story">{project.description}</p>}
          </section>

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
            <section className="detail__stack">
              <h2>Stack &amp; Tools</h2>
              <div className="tech-tags">
                {project.tech_tags.map(tag => <span key={tag}>{tag}</span>)}
              </div>
            </section>
          )}

          <section className="detail__interactions">
            <h2>Support this Project</h2>
            <ProjectActions project={project} />
          </section>
        </div>

        <aside className="detail__aside">
          <div className="detail__action-card">
            {isOwn && <p className="detail__owner-label">This is your Project</p>}
            {project.url && (
              <a href={project.url} target="_blank" rel="noopener noreferrer">
                <span><ExternalLink size={18} /> Open Project</span>
                <ArrowRight size={18} />
              </a>
            )}
            <Link to={`/share/${project.id}`}>
              <span><Share2 size={18} /> Share &amp; rally friends</span>
              <ArrowRight size={18} />
            </Link>
          </div>

          {related.length > 0 && (
            <section className="detail__related">
              <h2>More like this</h2>
              {related.map(p => (
                <Link key={p.id} to={`/p/${p.id}`} className="detail__related-row">
                  <span className="detail__related-swatch" style={{ background: p.color }} />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.description ?? `${p.momentum} momentum`}</small>
                  </span>
                </Link>
              ))}
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
