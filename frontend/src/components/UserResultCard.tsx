import { Link } from 'react-router-dom';
import { Coins, Grid2x2, Users } from 'lucide-react';
import type { UserSearchItem } from '../api/social';

export function UserResultCard({ user }: { user: UserSearchItem }) {
  const initial = user.handle.charAt(0).toUpperCase();
  return (
    <Link to={`/u/${user.handle}`} className="user-result">
      {user.avatar_url
        ? <img className="user-result__avatar" src={user.avatar_url} alt="" />
        : <div className="user-result__avatar">{initial}</div>}
      <div className="user-result__identity">
        <span className="user-result__handle">@{user.handle}</span>
      </div>
      <div className="user-result__stats">
        <span className="user-result__stat"><Coins size={13} /> {user.project_count}</span>
        <span className="user-result__stat"><Grid2x2 size={13} /> {user.territory_total}</span>
        <span className="user-result__stat"><Users size={13} /> {user.follower_count}</span>
      </div>
    </Link>
  );
}
