import type { GridCell } from '../types/api';

export interface ActivityEvent {
  kind: 'appeared' | 'faded';
  projectId: string;
  at: number; // epoch ms
}

function liveProjectIds(cells: GridCell[]): Set<string> {
  const ids = new Set<string>();
  for (const c of cells) {
    if (c.project_id && (c.state === 'alive' || c.state === 'dying')) ids.add(c.project_id);
  }
  return ids;
}

/**
 * Derive activity by comparing the live project set of two snapshots.
 * TODO: replace with a real /activity endpoint when the backend exposes one.
 */
export function diffSnapshots(prev: GridCell[], next: GridCell[], at: number): ActivityEvent[] {
  const before = liveProjectIds(prev);
  const after = liveProjectIds(next);
  const events: ActivityEvent[] = [];
  for (const id of after) if (!before.has(id)) events.push({ kind: 'appeared', projectId: id, at });
  for (const id of before) if (!after.has(id)) events.push({ kind: 'faded', projectId: id, at });
  return events;
}
