import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import HomePage from './pages/HomePage';
import { AuthCallback } from './components/AuthCallback';

function Placeholder({ title }: { title: string }) {
  return <main style={{ padding: 40 }}><h1>{title}</h1><p>Coming soon.</p></main>;
}

export const router = createBrowserRouter([
  { path: '/auth/callback', element: <AuthCallback /> },
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/explore', element: <Placeholder title="Explore" /> },
      { path: '/submit', element: <Placeholder title="Submit Project" /> },
      { path: '/p/:id', element: <Placeholder title="Project" /> },
      { path: '/u/:handle', element: <Placeholder title="Profile" /> },
      { path: '/share/:id', element: <Placeholder title="Share Card" /> },
    ],
  },
]);
