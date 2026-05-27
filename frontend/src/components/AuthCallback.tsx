import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export function AuthCallback() {
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const handle = params.get('handle');
    if (token && handle) {
      login(token, handle);
    }
    window.location.replace('/');
  }, [login]);

  return <div className="auth-loading">Authenticating…</div>;
}
