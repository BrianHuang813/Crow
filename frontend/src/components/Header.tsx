import { FormEvent, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { LoginButton } from './LoginButton';
import './Header.css';

export function Header() {
  const { isLoggedIn, credits } = useAuth();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/explore?q=${encodeURIComponent(value)}` : '/explore');
  }

  return (
    <header className="app-header">
      <Link to="/" className="app-header__brand">
        <img src="/logo.png" alt="" />
        <span className="app-header__name">CROW</span>
      </Link>
      <nav className="app-header__nav">
        <NavLink to="/" end className={({ isActive }) => `app-header__link${isActive ? ' is-active' : ''}`}>Home</NavLink>
        <NavLink to="/explore" className={({ isActive }) => `app-header__link${isActive ? ' is-active' : ''}`}>Explore</NavLink>
        <NavLink to="/grid" className={({ isActive }) => `app-header__link${isActive ? ' is-active' : ''}`}>Grid</NavLink>
        <NavLink to="/how-it-works" className={({ isActive }) => `app-header__link${isActive ? ' is-active' : ''}`}>How it works</NavLink>
      </nav>
      <form className="app-header__search" role="search" onSubmit={handleSearch}>
        <Search size={18} aria-hidden />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search projects..."
          aria-label="Search projects"
        />
      </form>
      <div className="app-header__right">
        {isLoggedIn && <span className="app-header__credits">₵ {credits}</span>}
        <Link to="/submit" className="btn btn--primary app-header__submit">Submit</Link>
        <LoginButton />
      </div>
    </header>
  );
}
