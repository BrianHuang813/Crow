import { Link } from 'react-router-dom';
import { Clock, Grid2x2, TrendingUp } from 'lucide-react';
import type { Project } from '../types/api';
import { formatTimeLeft } from '../utils/time';
import { ProjectArtwork } from './ProjectArtwork';
import './ProjectCard.css';

interface Props {
  project: Project;
  featured?: boolean;
}

export function ProjectCard({ project, featured = false }: Props) {
  return (
    <article className={`project-card${featured ? ' project-card--featured' : ''}`}>
      <Link to={`/p/${project.id}`} aria-label={`View ${project.name}`}>
        <ProjectArtwork project={project} className="project-card__artwork" />
      </Link>
      <div className="project-card__body">
        <div className="project-card__heading">
          <div>
            <span className={`status status--${project.status}`}>{project.status}</span>
            <Link to={`/p/${project.id}`} className="project-card__title">{project.name}</Link>
          </div>
          <div className="project-card__momentum" title="Momentum">
            <TrendingUp size={16} />
            <strong>{project.momentum}</strong>
          </div>
        </div>

        {project.description && <p className="project-card__description">{project.description}</p>}

        {project.tech_tags.length > 0 && (
          <div className="tech-tags">
            {project.tech_tags.slice(0, 4).map(tag => <span key={tag}>{tag}</span>)}
          </div>
        )}

        <div className="project-card__meta">
          <span><Clock size={15} /> {formatTimeLeft(project.expires_at)}</span>
          <span><Grid2x2 size={15} /> {project.territory_size} cells</span>
        </div>
      </div>
    </article>
  );
}
