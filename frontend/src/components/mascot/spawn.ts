export type Corner = 'tl' | 'tr' | 'bl' | 'br';

export const CORNERS: Corner[] = ['tl', 'tr', 'bl', 'br'];

// Animated, transparent WebP clips placed in public/mascot/.
export const CLIPS = ['/mascot/dance.webp', '/mascot/soccer.webp'];

// Timing (ms) — "subtle & rare": first appearance ~30s in, then long gaps,
// each visit brief.
export const FIRST_DELAY = 30_000;
export const GAP_MIN = 90_000;
export const GAP_MAX = 120_000;
export const VISIBLE_MS = 4_500;

export interface Spawn {
  corner: Corner;
  clip: string;
}

/** Pick a random corner + clip for the next appearance. */
export function pickSpawn(rng: () => number = Math.random): Spawn {
  const corner = CORNERS[Math.floor(rng() * CORNERS.length)] ?? 'br';
  const clip = CLIPS[Math.floor(rng() * CLIPS.length)] ?? CLIPS[0];
  return { corner, clip };
}

/** Next gap before the mascot reappears. */
export function nextGap(rng: () => number = Math.random): number {
  return GAP_MIN + rng() * (GAP_MAX - GAP_MIN);
}
