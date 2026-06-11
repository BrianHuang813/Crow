import { Link } from 'react-router-dom';
import './Footer.css';

export function Footer() {
  return (
    <footer className="app-footer">
      <div>
        <Link to="/" className="app-footer__brand">CROW</Link>
        <p className="app-footer__copy">Projects compete for momentum, lifespan, and territory.</p>
      </div>
      <nav className="app-footer__nav" aria-label="Footer navigation">
        <Link to="/explore">Explore</Link>
        <Link to="/grid">Grid</Link>
      </nav>
    </footer>
  );
}
