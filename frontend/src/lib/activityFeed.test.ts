import { describe, it, expect } from 'vitest';
import { diffSnapshots, type ActivityEvent } from './activityFeed';
import type { GridCell } from '../types/api';

function cell(project_id: string | null, state: GridCell['state'] = 'alive'): GridCell {
  return { x: 0, y: 0, state, project_id, color: '#ac3509' };
}

describe('diffSnapshots', () => {
  it('emits an "appeared" event for project ids present now but not before', () => {
    const prev = [cell('a')];
    const next = [cell('a'), cell('b')];
    const events = diffSnapshots(prev, next, 1000);
    expect(events).toEqual<ActivityEvent[]>([
      { kind: 'appeared', projectId: 'b', at: 1000 },
    ]);
  });

  it('emits a "faded" event for project ids gone from the live grid', () => {
    const prev = [cell('a'), cell('b')];
    const next = [cell('a')];
    expect(diffSnapshots(prev, next, 2000)).toEqual<ActivityEvent[]>([
      { kind: 'faded', projectId: 'b', at: 2000 },
    ]);
  });

  it('treats fossil/empty cells as not live', () => {
    const prev = [cell('a')];
    const next = [cell('a', 'fossil')];
    expect(diffSnapshots(prev, next, 3000)).toEqual<ActivityEvent[]>([
      { kind: 'faded', projectId: 'a', at: 3000 },
    ]);
  });

  it('returns no events when the live set is unchanged', () => {
    const prev = [cell('a'), cell('a')];
    const next = [cell('a')];
    expect(diffSnapshots(prev, next, 4000)).toEqual([]);
  });
});
