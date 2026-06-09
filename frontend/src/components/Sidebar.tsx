import { Link } from 'react-router-dom';
import { TrendingUp, Trophy, Radio } from 'lucide-react';
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

export function Sidebar({ trending, builders, activity }: Props) {
  return (
    <aside className="sidebar">
      <section className="side-panel">
        <h3 className="side-panel__title"><TrendingUp size={18} /> Trending</h3>
        {trending.length === 0 && <p className="side-empty">No momentum yet.</p>}
        {trending.slice(0, 5).map(p => (
          <Link key={p.id} to={`/p/${p.id}`} className="side-row">
            <span className="side-row__swatch" style={{ background: p.color }} />
            <span className="side-row__name">{p.name}</span>
            <span className="side-row__metric">{p.momentum}</span>
          </Link>
        ))}
      </section>

      <section className="side-panel">
        <h3 className="side-panel__title"><Trophy size={18} /> Top Builders</h3>
        {builders.length === 0 && <p className="side-empty">No territory claimed yet.</p>}
        {builders.slice(0, 5).map(p => (
          <Link key={p.id} to={`/p/${p.id}`} className="side-row">
            <span className="side-row__swatch" style={{ background: p.color }} />
            <span className="side-row__name">{p.name}</span>
            <span className="side-row__metric">{p.territory_size}</span>
          </Link>
        ))}
      </section>

      <section className="side-panel">
        <h3 className="side-panel__title"><Radio size={18} /> Live Activity</h3>
        {activity.length === 0 && <p className="side-empty">No activity yet.</p>}
        {activity.slice(0, 8).map((e, i) => (
          <Link key={`${e.project_id}-${e.at}-${i}`} to={`/p/${e.project_id}`} className="side-row">
            <span className="side-row__name">{activityLabel(e)}</span>
          </Link>
        ))}
      </section>
    </aside>
  );
}
