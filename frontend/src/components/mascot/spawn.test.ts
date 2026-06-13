import { describe, it, expect } from 'vitest';
import { pickSpawn, nextGap, CLIPS, MIN_LEFT, MAX_LEFT, GAP_MIN, GAP_MAX } from './spawn';

describe('pickSpawn', () => {
  it('picks a valid bottom-edge position and clip', () => {
    const s = pickSpawn(() => 0.5);
    expect(s.leftPct).toBeGreaterThanOrEqual(MIN_LEFT);
    expect(s.leftPct).toBeLessThanOrEqual(MAX_LEFT);
    expect(CLIPS).toContain(s.clip);
  });

  it('maps rng to the edge range and clip index', () => {
    expect(pickSpawn(() => 0)).toEqual({ leftPct: MIN_LEFT, clip: '/mascot/dance.webp' });
    expect(pickSpawn(() => 0.99)).toEqual({ leftPct: MIN_LEFT + 0.99 * (MAX_LEFT - MIN_LEFT), clip: '/mascot/soccer.webp' });
  });
});

describe('nextGap', () => {
  it('stays within the configured gap range', () => {
    expect(nextGap(() => 0)).toBe(GAP_MIN);
    expect(nextGap(() => 1)).toBeCloseTo(GAP_MAX);
    expect(nextGap(() => 0.5)).toBe((GAP_MIN + GAP_MAX) / 2);
  });
});
