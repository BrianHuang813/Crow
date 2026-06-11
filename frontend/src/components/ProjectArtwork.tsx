import { API_BASE } from '../api/client';
import type { Project } from '../types/api';
import './ProjectArtwork.css';

interface Props {
  project: Project;
  className?: string;
}

export function ProjectArtwork({ project, className = '' }: Props) {
  return (
    <div
      className={`project-artwork ${className}`.trim()}
      style={{ '--project-color': project.color } as React.CSSProperties}
    >
      <img src={`${API_BASE}/api/og/${project.id}`} alt="" loading="lazy" />
    </div>
  );
}
