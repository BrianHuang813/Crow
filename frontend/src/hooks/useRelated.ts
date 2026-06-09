import { useQuery } from '@tanstack/react-query';
import { fetchRelated } from '../api/social';

export function useRelated(id: string | undefined, limit = 4) {
  return useQuery({
    queryKey: ['related', id, limit],
    queryFn: () => fetchRelated(id!, limit),
    enabled: !!id,
    staleTime: 30_000,
  });
}
