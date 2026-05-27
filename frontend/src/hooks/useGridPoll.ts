import { useQuery } from '@tanstack/react-query';
import { fetchGrid } from '../api/grid';

export function useGridPoll() {
  return useQuery({
    queryKey: ['grid'],
    queryFn: fetchGrid,
    refetchInterval: 15_000,
    staleTime: 5_000,
    refetchIntervalInBackground: false,
  });
}
