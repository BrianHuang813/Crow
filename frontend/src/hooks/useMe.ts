import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '../api/projects';
import { useAuth } from './useAuth';

/** The logged-in user's full account record (avatar, credits, resurrections). */
export function useMe() {
  const { isLoggedIn } = useAuth();
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: isLoggedIn,
    staleTime: 30_000,
  });
}
