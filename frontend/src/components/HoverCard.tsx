import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { animate } from 'motion/mini';
import { fetchProject } from '../api/projects';
import { interact, resurrect } from '../api/interact';
import { useAuth } from '../hooks/useAuth';
import { CANVAS_SIZE } from './GridCanvas';
import { formatTimeLeft } from '../utils/time';
import type { GridCell } from '../types/api';
import './HoverCard.css';

const CARD_W = 250;
const CARD_H = 200;

interface Props {
  cell: GridCell;
  canvasX: number;
  canvasY: number;
}

export function HoverCard({ cell, canvasX, canvasY }: Props) {
  const { isLoggedIn, userId, credits, adjustCredits } = useAuth();
  const queryClient = useQueryClient();
  const [clickCooldownUntil, setClickCooldownUntil] = useState<number | null>(null);

  const { data: project } = useQuery({
    queryKey: ['project', cell.project_id],
    queryFn: () => fetchProject(cell.project_id!),
    enabled: !!cell.project_id,
    staleTime: 10_000,
  });

  const clickMutation = useMutation({
    mutationFn: () => interact(cell.project_id!, 'click'),
    onSuccess: (result) => {
      adjustCredits(result.credits_earned);
      setClickCooldownUntil(Date.now() + 60_000);
      queryClient.invalidateQueries({ queryKey: ['project', cell.project_id] });
      queryClient.invalidateQueries({ queryKey: ['grid'] });
      setTimeout(() => setClickCooldownUntil(null), 60_000);
    },
  });

  const boostMutation = useMutation({
    mutationFn: () => interact(cell.project_id!, 'boost'),
    onSuccess: () => {
      adjustCredits(-20);
      queryClient.invalidateQueries({ queryKey: ['project', cell.project_id] });
      queryClient.invalidateQueries({ queryKey: ['grid'] });
    },
  });

  const resurrectMutation = useMutation({
    mutationFn: () => resurrect(cell.project_id!),
    onSuccess: () => {
      adjustCredits(-200);
      queryClient.invalidateQueries({ queryKey: ['project', cell.project_id] });
      queryClient.invalidateQueries({ queryKey: ['grid'] });
      queryClient.invalidateQueries({ queryKey: ['myProject'] });
    },
  });

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const burst = document.createElement('div');
      burst.style.cssText = `
        position:fixed;left:${e.clientX}px;top:${e.clientY}px;
        width:8px;height:8px;border-radius:50%;
        background:var(--accent-2);pointer-events:none;z-index:9999;
        transform:translate(-50%,-50%);
      `;
      document.body.appendChild(burst);
      animate(
        burst,
        { scale: [0.5, 3], opacity: [1, 0] },
        { duration: 0.35, ease: 'easeOut' }
      ).then(() => burst.remove());
      clickMutation.mutate();
    },
    [clickMutation]
  );

  if (!cell.project_id || !project) return null;

  const left = canvasX + 20 + CARD_W > CANVAS_SIZE ? canvasX - CARD_W - 8 : canvasX + 20;
  const top = Math.min(canvasY, CANVAS_SIZE - CARD_H);

  const isOwnProject = !!userId && project.owner_id === userId;
  const inCooldown = !!clickCooldownUntil && Date.now() < clickCooldownUntil;
  const canBoost = isLoggedIn && !isOwnProject && credits >= 20 && project.status !== 'dead';
  const canResurrect = isLoggedIn && project.status === 'dead' && credits >= 200;
  // Show interaction buttons only for other people's alive/dying projects
  const showInteract = isLoggedIn && !isOwnProject && project.status !== 'dead';

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
          <div className="hover-card__momentum-fill" style={{ width: `${project.momentum}%` }} />
        </div>

        <p className="hover-card__meta">
          <span>{project.momentum} / 100</span>
          <span>⬛ {project.territory_size}</span>
        </p>

        {project.tech_tags.length > 0 && (
          <p className="hover-card__tags">
            {project.tech_tags.slice(0, 4).join(' · ')}
          </p>
        )}

        {showInteract && (
          <div className="hover-card__actions">
            <button
              className="btn btn--secondary hover-card__btn"
              onClick={handleClick}
              disabled={inCooldown || clickMutation.isPending}
              title={inCooldown ? 'Cooldown: wait 60s' : '+5 Momentum, +5 Credits'}
            >
              {inCooldown ? '⏳ Click' : '⚡ Click'}
            </button>
            <button
              className="btn btn--primary hover-card__btn"
              onClick={() => boostMutation.mutate()}
              disabled={!canBoost || boostMutation.isPending}
              title="Boost: 20 Credits → +25 Momentum, +30min"
            >
              🚀 Boost <span className="hover-card__cost">20₵</span>
            </button>
          </div>
        )}

        {canResurrect && (
          <button
            className="btn btn--primary hover-card__btn"
            onClick={() => resurrectMutation.mutate()}
            disabled={resurrectMutation.isPending}
            title="Resurrect: 200 Credits → 24h timer, restore fossil cells"
          >
            ✨ Resurrect <span className="hover-card__cost">200₵</span>
          </button>
        )}

        {project.status === 'dead' && !canResurrect && isLoggedIn && !isOwnProject && (
          <p className="hover-card__insufficient">Need 200₵ to resurrect (you have {credits})</p>
        )}
      </div>
    </div>
  );
}
