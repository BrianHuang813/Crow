import { useQueries } from '@tanstack/react-query';
import { fetchProject } from '../api/projects';
import { rankByTerritory, type TerritoryEntry } from '../lib/gridStats';
import type { GridSnapshot, Project } from '../types/api';

export interface TopProject extends TerritoryEntry {
  project: Project | undefined;
}

const TOP_N = 8;

/**
 * Rank projects by territory from the snapshot, then fetch details for the
 * top N (bounded) so we can show names, momentum and owners. There is no
 * list-projects endpoint, so this per-id fetch is intentional.
 */
export function useTopProjects(snapshot: GridSnapshot | undefined): TopProject[] {
  const ranked = snapshot ? rankByTerritory(snapshot.cells, TOP_N) : [];
  const results = useQueries({
    queries: ranked.map(entry => ({
      queryKey: ['project', entry.projectId],
      queryFn: () => fetchProject(entry.projectId),
      staleTime: 10_000,
    })),
  });
  return ranked.map((entry, i) => ({ ...entry, project: results[i]?.data }));
}
