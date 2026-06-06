import { useParams, Link } from 'react-router-dom';
import { Coins, Sparkles, Grid2x2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMe } from '../hooks/useMe';
import { useMyProject } from '../hooks/useMyProject';
import './ProfilePage.css';

export default function ProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const { isLoggedIn, handle: myHandle } = useAuth();
  const { data: me, isLoading: meLoading } = useMe();
  const { data: project, isLoading: projectLoading } = useMyProject();

  const isOwn = isLoggedIn && !!handle && handle === myHandle;

  if (!isOwn) {
    // No fetch-user-by-handle endpoint exists yet.
    // TODO: real user-by-handle endpoint for viewing other builders.
    return (
      <main className="profile">
        <div className="profile__degraded">
          <h1>@{handle}</h1>
          <p>This builder's profile isn't public yet.</p>
        </div>
      </main>
    );
  }

  if (meLoading || projectLoading) return <main className="profile"><p className="profile__empty">Loading…</p></main>;

  const initial = (me?.handle ?? handle ?? '?').charAt(0).toUpperCase();

  return (
    <main className="profile">
      <header className="profile__header">
        {me?.avatar_url
          ? <img className="profile__avatar" src={me.avatar_url} alt="" />
          : <div className="profile__avatar">{initial}</div>}
        <div>
          <h1 className="profile__handle">@{me?.handle ?? handle}</h1>
          <p className="profile__sub">Digital Darwinism builder</p>
        </div>
      </header>

      <div className="profile__stats">
        <div className="profile__stat">
          <div className="profile__stat-label"><Coins size={13} /> Credits</div>
          <div className="profile__stat-value">{me?.credits ?? 0}</div>
        </div>
        <div className="profile__stat">
          <div className="profile__stat-label"><Sparkles size={13} /> Resurrections</div>
          <div className="profile__stat-value">{me?.resurrection_count ?? 0}</div>
        </div>
        <div className="profile__stat">
          <div className="profile__stat-label"><Grid2x2 size={13} /> Territory</div>
          <div className="profile__stat-value">{project?.territory_size ?? 0}</div>
        </div>
      </div>

      <h2 className="profile__section-title">Project</h2>
      {/* TODO: fossil graveyard of past dead projects needs a backend endpoint */}
      {project ? (
        <Link to={`/p/${project.id}`} className="profile__project">
          <span className="profile__project-swatch" style={{ background: project.color }} />
          <span className="profile__project-name">{project.name}</span>
          <span className={`profile__status profile__status--${project.status}`}>{project.status}</span>
        </Link>
      ) : (
        <p className="profile__empty">No territory claimed yet. <Link to="/submit">Claim a cell →</Link></p>
      )}
    </main>
  );
}
