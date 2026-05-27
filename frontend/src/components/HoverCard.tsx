import { useQuery } from '@tanstack/react-query';
import { fetchProject } from '../api/projects';
import { formatTimeLeft } from '../utils/time';
import type { GridCell } from '../types/api';
import './HoverCard.css';

const CARD_W = 230;
const CARD_H = 150;
const CANVAS_SIZE = 780;

interface Props {
  cell: GridCell;
  canvasX: number;
  canvasY: number;
}

export function HoverCard({ cell, canvasX, canvasY }: Props) {
  const { data: project } = useQuery({
    queryKey: ['project', cell.project_id],
    queryFn: () => fetchProject(cell.project_id!),
    enabled: !!cell.project_id,
    staleTime: 10_000,
  });

  if (!cell.project_id || !project) return null;

  const left =
    canvasX + 20 + CARD_W > CANVAS_SIZE ? canvasX - CARD_W - 8 : canvasX + 20;
  const top = Math.min(canvasY, CANVAS_SIZE - CARD_H);

  return (
    <div
      className={`hover-card hover-card--${project.status}`}
      style={{ left, top, '--project-color': project.color } as React.CSSProperties}
    >
      <div className="hover-card__color-bar" />
      <div className="hover-card__body">
        <p className="hover-card__name">{project.name}</p>
        <p className="hover-card__timer">{formatTimeLeft(project.expires_at)}</p>
        <div className="hover-card__momentum-wrap">
          <div
            className="hover-card__momentum-fill"
            style={{ width: `${project.momentum}%` }}
          />
        </div>
        <p className="hover-card__meta">
          <span>{project.momentum} / 100 momentum</span>
          <span>⬛ {project.territory_size}</span>
        </p>
        {project.tech_tags.length > 0 && (
          <p className="hover-card__tags">
            {project.tech_tags.slice(0, 4).join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}
