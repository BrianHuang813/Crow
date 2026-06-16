import { Link } from 'react-router-dom';
import './Footer.css';

export function Footer() {
  return (
    <footer className="app-footer">
      <Link to="/" className="app-footer__brand">CROW</Link>
      <p className="app-footer__sign">claim territory · gain momentum · or fade</p>
    </footer>
  );
}
