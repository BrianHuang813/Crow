import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import HomePage from './pages/HomePage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import SubmitPage from './pages/SubmitPage';
import ProfilePage from './pages/ProfilePage';
import SharePage from './pages/SharePage';
import { AuthCallback } from './components/AuthCallback';

export const router = createBrowserRouter([
  { path: '/auth/callback', element: <AuthCallback /> },
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/submit', element: <SubmitPage /> },
      { path: '/p/:id', element: <ProjectDetailPage /> },
      { path: '/u/:handle', element: <ProfilePage /> },
      { path: '/share/:id', element: <SharePage /> },
    ],
  },
]);
