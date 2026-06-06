import { describe, it, expect } from 'vitest';
import { rankByTerritory, type TerritoryEntry } from './gridStats';
import type { GridCell } from '../types/api';

function cell(project_id: string | null, state: GridCell['state'] = 'alive', color = '#ac3509'): GridCell {
  return { x: 0, y: 0, state, project_id, color: project_id ? color : null };
}

describe('rankByTerritory', () => {
  it('counts alive and dying cells per project, ignores empty/fossil/null', () => {
    const cells: GridCell[] = [
      cell('a'), cell('a'), cell('a', 'dying'),
      cell('b'),
      cell(null, 'empty'),
      cell('c', 'fossil'),
    ];
    const ranked = rankByTerritory(cells);
    expect(ranked).toEqual<TerritoryEntry[]>([
      { projectId: 'a', territory: 3, color: '#ac3509' },
      { projectId: 'b', territory: 1, color: '#ac3509' },
    ]);
  });

  it('sorts descending by territory and respects the limit', () => {
    const cells: GridCell[] = [
      cell('a'),
      cell('b'), cell('b'),
      cell('c'), cell('c'), cell('c'),
    ];
    expect(rankByTerritory(cells, 2).map(e => e.projectId)).toEqual(['c', 'b']);
  });

  it('returns an empty array when there are no live cells', () => {
    expect(rankByTerritory([cell(null, 'empty')])).toEqual([]);
  });
});
