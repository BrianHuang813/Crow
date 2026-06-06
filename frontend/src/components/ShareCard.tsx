import { forwardRef } from 'react';
import { formatTimeLeft } from '../utils/time';
import type { Project } from '../types/api';
import './ShareCard.css';

export type ShareBackground = 'cream' | 'white' | 'dark';

interface Props {
  project: Project;
  background: ShareBackground;
  showTech: boolean;
  showStats: boolean;
}

export const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard(
  { project, background, showTech, showStats }, ref
) {
  return (
    <div ref={ref} className={`share-card share-card--${background}`}>
      <span className="share-card__badge">DIGITAL DARWINISM</span>
      <span className="share-card__brand">CROW</span>

      <div className="share-card__center">
        <div className="share-card__swatch" style={{ background: project.color }} />
        <div className="share-card__name">{project.name}</div>
        {showTech && project.tech_tags.length > 0 && (
          <div className="share-card__chips">
            {project.tech_tags.map(t => <span key={t} className="share-card__chip">{t}</span>)}
          </div>
        )}
      </div>

      {showStats && (
        <div className="share-card__stats">
          <div>
            <div className="share-card__stat-label">Lifespan</div>
            <div className="share-card__stat-value">{formatTimeLeft(project.expires_at)}</div>
          </div>
          <div>
            <div className="share-card__stat-label">Territory</div>
            <div className="share-card__stat-value">{project.territory_size}</div>
          </div>
        </div>
      )}
    </div>
  );
});
