import { useQuery } from '@tanstack/react-query';
import { fetchUserProfile } from '../api/social';

export function useUserProfile(handle: string | undefined) {
  return useQuery({
    queryKey: ['userProfile', handle],
    queryFn: () => fetchUserProfile(handle!),
    enabled: !!handle,
    retry: false,
    staleTime: 30_000,
  });
}
