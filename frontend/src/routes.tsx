import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import GridPage from './pages/GridPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProfilePage from './pages/ProfilePage';
import SharePage from './pages/SharePage';
import { AuthCallback } from './components/AuthCallback';

export const router = createBrowserRouter([
  { path: '/auth/callback', element: <AuthCallback /> },
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/explore', element: <ExplorePage /> },
      { path: '/grid', element: <GridPage /> },
      { path: '/p/:id', element: <ProjectDetailPage /> },
      { path: '/u/:handle', element: <ProfilePage /> },
      { path: '/share/:id', element: <SharePage /> },
    ],
  },
]);
