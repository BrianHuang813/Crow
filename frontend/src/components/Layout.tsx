import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { OnboardingModal } from './OnboardingModal';

export function Layout() {
  return (
    <div className="site-shell">
      <Header />
      <div className="site-shell__content">
        <Outlet />
      </div>
      <Footer />
      <OnboardingModal />
    </div>
  );
}
