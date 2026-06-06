import type { GridCell } from '../types/api';

export interface TerritoryEntry {
  projectId: string;
  territory: number;
  color: string;
}

/** Rank projects by how many live (alive/dying) cells they hold in the snapshot. */
export function rankByTerritory(cells: GridCell[], limit = Infinity): TerritoryEntry[] {
  const counts = new Map<string, TerritoryEntry>();
  for (const c of cells) {
    if (!c.project_id) continue;
    if (c.state !== 'alive' && c.state !== 'dying') continue;
    const entry = counts.get(c.project_id);
    if (entry) {
      entry.territory += 1;
    } else {
      counts.set(c.project_id, {
        projectId: c.project_id,
        territory: 1,
        color: c.color ?? '#888888',
      });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.territory - a.territory)
    .slice(0, limit === Infinity ? undefined : limit);
}
