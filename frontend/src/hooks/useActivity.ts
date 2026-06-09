import { useQuery } from '@tanstack/react-query';
import { fetchActivity } from '../api/social';

export function useActivity(limit = 12) {
  return useQuery({
    queryKey: ['activity', limit],
    queryFn: () => fetchActivity(limit),
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
  });
}
