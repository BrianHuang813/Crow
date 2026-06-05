import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('./hooks/useAuth', () => ({ useAuth: () => ({ isLoggedIn: false, credits: 0 }) }));
vi.mock('./hooks/useGridPoll', () => ({ useGridPoll: () => ({ data: undefined, isLoading: true, isError: false }) }));

import App from './App';

describe('App grid page', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });
});
