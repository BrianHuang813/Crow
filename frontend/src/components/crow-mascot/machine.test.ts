import { describe, it, expect } from 'vitest';
import { nextCrowState, type CrowSituation } from './machine';

const base: CrowSituation = {
  current: 'idle',
  idleMs: 0,
  mouseNearby: false,
  rng: 0.9,
};

describe('nextCrowState', () => {
  it('startles when the mouse is nearby and not already startled', () => {
    expect(nextCrowState({ ...base, current: 'idle', mouseNearby: true })).toBe('startle');
    expect(nextCrowState({ ...base, current: 'walk', mouseNearby: true })).toBe('startle');
  });

  it('hops away after startling', () => {
    expect(nextCrowState({ ...base, current: 'startle', mouseNearby: true })).toBe('hop');
  });

  it('lands into a walk after a hop', () => {
    expect(nextCrowState({ ...base, current: 'hop' })).toBe('walk');
  });

  it('rests (idle) after arriving from a walk', () => {
    expect(nextCrowState({ ...base, current: 'walk' })).toBe('idle');
  });

  it('returns to idle after a peck', () => {
    expect(nextCrowState({ ...base, current: 'peck' })).toBe('idle');
  });

  it('does a bored action (peck or hop) when idle too long', () => {
    expect(nextCrowState({ ...base, current: 'idle', idleMs: 5000, rng: 0.2 })).toBe('peck');
    expect(nextCrowState({ ...base, current: 'idle', idleMs: 5000, rng: 0.8 })).toBe('hop');
  });

  it('wanders or stays when idle but not bored', () => {
    expect(nextCrowState({ ...base, current: 'idle', idleMs: 1000, rng: 0.2 })).toBe('walk');
    expect(nextCrowState({ ...base, current: 'idle', idleMs: 1000, rng: 0.8 })).toBe('idle');
  });
});
