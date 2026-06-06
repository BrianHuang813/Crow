import { Link } from 'react-router-dom';
import { TrendingUp, Trophy, Radio } from 'lucide-react';
import type { TopProject } from '../hooks/useTopProjects';
import type { ActivityEvent } from '../lib/activityFeed';
import './Sidebar.css';

interface Props {
  top: TopProject[];
  activity: ActivityEvent[];
}

function withProject(top: TopProject[]) {
  return top.filter(t => t.project);
}

export function Sidebar({ top, activity }: Props) {
  const trending = [...withProject(top)]
    .sort((a, b) => (b.project!.momentum) - (a.project!.momentum))
    .slice(0, 5);
  const builders = [...withProject(top)]
    .sort((a, b) => b.territory - a.territory)
    .slice(0, 5);

  return (
    <aside className="sidebar">
      <section className="side-panel">
        <h3 className="side-panel__title"><TrendingUp size={18} /> Trending</h3>
        {trending.length === 0 && <p className="side-empty">No momentum yet.</p>}
        {trending.map(t => (
          <Link key={t.projectId} to={`/p/${t.projectId}`} className="side-row">
            <span className="side-row__swatch" style={{ background: t.color }} />
            <span className="side-row__name">{t.project!.name}</span>
            <span className="side-row__metric">{t.project!.momentum}</span>
          </Link>
        ))}
      </section>

      <section className="side-panel">
        <h3 className="side-panel__title"><Trophy size={18} /> Top Builders</h3>
        {builders.length === 0 && <p className="side-empty">No territory claimed yet.</p>}
        {builders.map(t => (
          <Link key={t.projectId} to={`/p/${t.projectId}`} className="side-row">
            <span className="side-row__swatch" style={{ background: t.color }} />
            <span className="side-row__name">{t.project!.name}</span>
            <span className="side-row__metric">{t.territory}</span>
          </Link>
        ))}
      </section>

      <section className="side-panel">
        <h3 className="side-panel__title"><Radio size={18} /> Live Activity</h3>
        {activity.length === 0 && <p className="side-empty">No activity yet.</p>}
        {activity.slice(0, 8).map((e, i) => {
          const named = top.find(t => t.projectId === e.projectId)?.project?.name;
          const label = named ?? 'A project';
          return (
            <div key={`${e.projectId}-${e.at}-${i}`} className="side-row">
              <span className="side-row__name">
                {e.kind === 'appeared' ? `${label} claimed new territory` : `${label} faded from the grid`}
              </span>
            </div>
          );
        })}
      </section>
    </aside>
  );
}
