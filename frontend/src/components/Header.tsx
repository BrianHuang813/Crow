import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginButton } from './LoginButton';
import './Header.css';

export function Header() {
  const { isLoggedIn, credits } = useAuth();
  return (
    <header className="app-header">
      <Link to="/" className="app-header__brand">
        <img src="/logo.png" alt="" />
        <span className="app-header__name">CROW</span>
      </Link>
      <nav className="app-header__nav">
        <NavLink to="/" end className={({ isActive }) => `app-header__link${isActive ? ' is-active' : ''}`}>Grid</NavLink>
      </nav>
      <div className="app-header__right">
        {isLoggedIn && <span className="app-header__credits">₵ {credits}</span>}
        {isLoggedIn && <Link to="/submit" className="app-header__cta">Submit Project</Link>}
        <LoginButton />
      </div>
    </header>
  );
}
