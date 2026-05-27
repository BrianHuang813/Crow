import { useQuery } from '@tanstack/react-query';
import { fetchMyProject } from '../api/projects';
import { useAuth } from './useAuth';

export function useMyProject() {
  const { isLoggedIn } = useAuth();
  return useQuery({
    queryKey: ['myProject'],
    queryFn: fetchMyProject,
    enabled: isLoggedIn,
    refetchInterval: 30_000,
    staleTime: 10_000,
    refetchIntervalInBackground: false,
  });
}
