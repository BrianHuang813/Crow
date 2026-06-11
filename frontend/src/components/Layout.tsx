import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

export function Layout() {
  return (
    <div className="site-shell">
      <Header />
      <div className="site-shell__content">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
