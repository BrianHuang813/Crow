export type CrowState = 'idle' | 'walk' | 'hop' | 'peck' | 'startle';

export interface CrowSituation {
  current: CrowState;
  /** ms spent in the current idle stretch */
  idleMs: number;
  /** pointer is within the avoidance radius */
  mouseNearby: boolean;
  /** deterministic randomness, 0..1 */
  rng: number;
}

const BORED_MS = 4000;

export function nextCrowState(s: CrowSituation): CrowState {
  if (s.mouseNearby && s.current !== 'startle') return 'startle';

  switch (s.current) {
    case 'startle':
      return 'hop';
    case 'hop':
      return 'walk';
    case 'walk':
      return 'idle';
    case 'peck':
      return 'idle';
    case 'idle':
      if (s.idleMs >= BORED_MS) return s.rng < 0.5 ? 'peck' : 'hop';
      return s.rng < 0.5 ? 'walk' : 'idle';
  }
}
