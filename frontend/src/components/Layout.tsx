import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { OnboardingModal } from './OnboardingModal';
import { MascotSpawner } from './MascotSpawner';

export function Layout() {
  return (
    <div className="site-shell">
      <Header />
      <div className="site-shell__content">
        <Outlet />
      </div>
      <Footer />
      <OnboardingModal />
      <MascotSpawner />
    </div>
  );
}
