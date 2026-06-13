// Animated, transparent WebP clips placed in public/mascot/.
export const CLIPS = ['/mascot/dance.webp', '/mascot/soccer.webp'];

// Timing (ms) — "subtle & rare": first appearance ~30s in, then long gaps,
// each visit brief.
export const FIRST_DELAY = 30_000;
export const GAP_MIN = 90_000;
export const GAP_MAX = 120_000;
export const VISIBLE_MS = 4_500;

// Horizontal range (% of viewport width) for the random spot along the bottom
// edge. Bounded so the ~112px crow stays fully on screen.
export const MIN_LEFT = 4;
export const MAX_LEFT = 84;

export interface Spawn {
  /** horizontal position along the bottom edge, in % of viewport width */
  leftPct: number;
  clip: string;
}

/** Pick a random spot along the bottom edge + a clip for the next appearance. */
export function pickSpawn(rng: () => number = Math.random): Spawn {
  const leftPct = MIN_LEFT + rng() * (MAX_LEFT - MIN_LEFT);
  const clip = CLIPS[Math.floor(rng() * CLIPS.length)] ?? CLIPS[0];
  return { leftPct, clip };
}

/** Next gap before the mascot reappears. */
export function nextGap(rng: () => number = Math.random): number {
  return GAP_MIN + rng() * (GAP_MAX - GAP_MIN);
}
