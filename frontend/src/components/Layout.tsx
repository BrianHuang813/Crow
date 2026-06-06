import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { CrowMascot } from './CrowMascot';

export function Layout() {
  return (
    <>
      <Header />
      <Outlet />
      <CrowMascot />
    </>
  );
}
