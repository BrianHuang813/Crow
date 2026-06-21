import { API_BASE } from '../api/client';

const REDIRECT_KEY = 'crow_post_login_redirect';

/** Remember where to return after GitHub OAuth, then start the login redirect. */
export function startLogin(returnPath?: string): void {
  const path = returnPath ?? window.location.pathname + window.location.search;
  try {
    localStorage.setItem(REDIRECT_KEY, path);
  } catch {
    /* localStorage unavailable — fall back to the default post-login route */
  }
  window.location.href = `${API_BASE}/api/auth/github`;
}

/** Consume the stored post-login path, if any. Returns null when none set. */
export function consumeLoginRedirect(): string | null {
  try {
    const path = localStorage.getItem(REDIRECT_KEY);
    if (path) localStorage.removeItem(REDIRECT_KEY);
    return path;
  } catch {
    return null;
  }
}
