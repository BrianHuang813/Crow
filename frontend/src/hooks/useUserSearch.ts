import { useQuery } from '@tanstack/react-query';
import { searchUsers } from '../api/social';

export function useUserSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ['user-search', q],
    queryFn: () => searchUsers({ q }),
    enabled: q.length > 0,
    staleTime: 10_000,
  });
}
