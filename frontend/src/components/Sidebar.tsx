import { Link } from 'react-router-dom';
import { TrendingUp, Trophy, Radio, Flame } from 'lucide-react';
import type { Project } from '../types/api';
import type { ActivityEventApi } from '../api/social';
import './Sidebar.css';

interface Props {
  trending: Project[];
  builders: Project[];
  activity: ActivityEventApi[];
}

function activityLabel(e: ActivityEventApi): string {
  if (e.type === 'boosted') {
    const who = e.actor_handle ? `@${e.actor_handle}` : 'Someone';
    return `${who} boosted ${e.project_name}`;
  }
  if (e.type === 'claimed') return `${e.project_name} claimed new territory`;
  return `${e.project_name} faded from the grid`;
}

const SURGE_THRESHOLD = 70;

export function Sidebar({ trending, builders, activity }: Props) {
  const maxTerritory = Math.max(1, ...builders.map(b => b.territory_size));

  return (
    <aside className="sidebar">
      <section className="side-panel">
        <h3 className="side-panel__title"><TrendingUp size={18} /> Trending</h3>
        {trending.length === 0 && <p className="side-empty">No momentum yet.</p>}
        {trending.slice(0, 5).map((p, i) => (
          <Link key={p.id} to={`/p/${p.id}`} className="side-row life life--alive">
            <span className="side-row__rank">{i + 1}</span>
            <span className="side-row__swatch" style={{ background: p.color }} />
            <span className="side-row__name">{p.name}</span>
            {p.momentum >= SURGE_THRESHOLD && (
              <span className="surge-badge" title="Surging"><Flame size={11} /></span>
            )}
            <span className="side-row__metric">{p.momentum}</span>
          </Link>
        ))}
      </section>

      <section className="side-panel">
        <h3 className="side-panel__title"><Trophy size={18} /> Leaderboard</h3>
        {builders.length === 0 && <p className="side-empty">No territory claimed yet.</p>}
        {builders.slice(0, 5).map((p, i) => (
          <Link key={p.id} to={`/p/${p.id}`} className="side-row side-row--bar">
            <span className={`side-row__rank side-row__rank--${i + 1}`}>{i + 1}</span>
            <span className="side-row__bar-col">
              <span className="side-row__bar-head">
                <span className="side-row__name">{p.name}</span>
                <span className="side-row__metric">{p.territory_size}</span>
              </span>
              <span className="terr-bar">
                <span
                  className="terr-bar__fill"
                  style={{ width: `${(p.territory_size / maxTerritory) * 100}%`, background: p.color }}
                />
              </span>
            </span>
          </Link>
        ))}
      </section>

      <section className="side-panel">
        <h3 className="side-panel__title"><Radio size={18} /> Live ticker</h3>
        {activity.length === 0 && <p className="side-empty">No activity yet.</p>}
        {activity.slice(0, 8).map((e, i) => (
          <Link key={`${e.project_id}-${e.at}-${i}`} to={`/p/${e.project_id}`} className={`ticker-row ticker-row--${e.type}`}>
            <span className="ticker-row__dot" />
            <span className="ticker-row__text">{activityLabel(e)}</span>
          </Link>
        ))}
      </section>
    </aside>
  );
}
