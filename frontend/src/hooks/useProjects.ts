import { useQuery } from '@tanstack/react-query';
import { listProjects, type ListParams } from '../api/social';

export function useProjects(params: ListParams) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => listProjects(params),
    staleTime: 10_000,
  });
}
