import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Coins, Sparkles, Grid2x2 } from 'lucide-react';
import { useUserProfile } from '../hooks/useUserProfile';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../hooks/useAuth';
import { followUser, unfollowUser, type FollowState } from '../api/social';
import './ProfilePage.css';

export default function ProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const { handle: myHandle, isLoggedIn } = useAuth();
  const { data: profile, isLoading, isError } = useUserProfile(handle);
  const { data: projectsData } = useProjects({ owner_handle: handle, status: 'all', sort: 'recent' });
  const [override, setOverride] = useState<FollowState | null>(null);

  const followMutation = useMutation({
    mutationFn: (currentlyFollowing: boolean) =>
      currentlyFollowing ? unfollowUser(handle!) : followUser(handle!),
    onSuccess: (res) => setOverride(res),
  });

  if (isLoading) return <main className="profile"><p className="profile__empty">Loading…</p></main>;
  if (isError || !profile) {
    return (
      <main className="profile">
        <div className="profile__degraded">
          <h1>@{handle}</h1>
          <p>Builder not found.</p>
        </div>
      </main>
    );
  }

  const projects = projectsData?.items ?? [];
  const living = projects.filter(p => p.status !== 'dead');
  const fossils = projects.filter(p => p.status === 'dead');
  const initial = profile.handle.charAt(0).toUpperCase();

  const follow = override ?? { is_following: profile.is_following, follower_count: profile.follower_count };
  const isSelf = !!myHandle && !!handle && handle.toLowerCase() === myHandle.toLowerCase();
  const canFollow = isLoggedIn && !isSelf;

  return (
    <main className="profile">
      <header className="profile__header">
        {profile.avatar_url
          ? <img className="profile__avatar" src={profile.avatar_url} alt="" />
          : <div className="profile__avatar">{initial}</div>}
        <div className="profile__identity">
          <h1 className="profile__handle">@{profile.handle}</h1>
          <p className="profile__sub">
            {follow.follower_count} followers · {profile.following_count} following
          </p>
        </div>
        {canFollow && (
          <button
            className={`btn ${follow.is_following ? 'btn--secondary' : 'btn--primary'} profile__follow`}
            onClick={() => followMutation.mutate(follow.is_following)}
            disabled={followMutation.isPending}
          >
            {follow.is_following ? 'Following' : 'Follow'}
          </button>
        )}
      </header>

      <div className="profile__stats">
        <div className="profile__stat">
          <div className="profile__stat-label"><Coins size={13} /> Projects</div>
          <div className="profile__stat-value">{profile.project_count}</div>
        </div>
        <div className="profile__stat">
          <div className="profile__stat-label"><Sparkles size={13} /> Resurrections</div>
          <div className="profile__stat-value">{profile.resurrection_count}</div>
        </div>
        <div className="profile__stat">
          <div className="profile__stat-label"><Grid2x2 size={13} /> Territory</div>
          <div className="profile__stat-value">{profile.territory_total}</div>
        </div>
      </div>

      <h2 className="profile__section-title">Projects</h2>
      {living.length === 0 && <p className="profile__empty">No active projects.</p>}
      {living.map(p => (
        <Link key={p.id} to={`/p/${p.id}`} className="profile__project">
          <span className="profile__project-swatch" style={{ background: p.color }} />
          <span className="profile__project-name">{p.name}</span>
          <span className={`profile__status profile__status--${p.status}`}>{p.status}</span>
        </Link>
      ))}

      {fossils.length > 0 && (
        <>
          <h2 className="profile__section-title" style={{ marginTop: 28 }}>Fossil graveyard</h2>
          {fossils.map(p => (
            <Link key={p.id} to={`/p/${p.id}`} className="profile__project">
              <span className="profile__project-swatch" style={{ background: p.color }} />
              <span className="profile__project-name">{p.name}</span>
              <span className="profile__status profile__status--dead">dead</span>
            </Link>
          ))}
        </>
      )}
    </main>
  );
}
