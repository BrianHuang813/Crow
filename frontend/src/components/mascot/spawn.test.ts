import { describe, it, expect } from 'vitest';
import { pickSpawn, nextGap, CORNERS, CLIPS, GAP_MIN, GAP_MAX } from './spawn';

describe('pickSpawn', () => {
  it('picks a valid corner and clip', () => {
    const s = pickSpawn(() => 0);
    expect(CORNERS).toContain(s.corner);
    expect(CLIPS).toContain(s.clip);
  });

  it('uses the rng to index corner and clip', () => {
    // rng=0 → first of each
    expect(pickSpawn(() => 0)).toEqual({ corner: 'tl', clip: '/mascot/dance.webp' });
    // rng≈0.99 → last of each
    expect(pickSpawn(() => 0.99)).toEqual({ corner: 'br', clip: '/mascot/soccer.webp' });
  });
});

describe('nextGap', () => {
  it('stays within the configured gap range', () => {
    expect(nextGap(() => 0)).toBe(GAP_MIN);
    expect(nextGap(() => 1)).toBeCloseTo(GAP_MAX);
    expect(nextGap(() => 0.5)).toBe((GAP_MIN + GAP_MAX) / 2);
  });
});
