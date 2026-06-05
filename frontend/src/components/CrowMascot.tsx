import { useEffect, useReducer, useRef } from 'react';
import { motion, useAnimationControls } from 'motion/react';
import { nextCrowState, type CrowState } from './crow-mascot/machine';
import './CrowMascot.css';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function CrowMascot() {
  const reduced = prefersReducedMotion();
  const controls = useAnimationControls();
  const stateRef = useRef<CrowState>('idle');
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const mouseNearby = useRef(false);

  // Avoidance: flag when pointer gets close to the mascot.
  useEffect(() => {
    if (reduced) return;
    function onMove(e: PointerEvent) {
      const el = document.querySelector('.crow-mascot');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      mouseNearby.current = Math.hypot(dx, dy) < 120;
    }
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduced]);

  // Behaviour loop: advance the state machine and run the matching animation.
  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    let idleStart = Date.now();

    async function loop() {
      while (!cancelled) {
        const current = stateRef.current;
        const idleMs = current === 'idle' ? Date.now() - idleStart : 0;
        const next = nextCrowState({
          current,
          idleMs,
          mouseNearby: mouseNearby.current,
          rng: Math.random(),
        });
        stateRef.current = next;
        if (next === 'idle') idleStart = Date.now();
        tick();

        switch (next) {
          case 'hop':
          case 'startle':
            await controls.start({
              y: [0, -28, 0],
              scaleY: [1, 1.15, 0.85, 1],
              transition: { duration: 0.5, ease: 'easeOut' },
            });
            break;
          case 'walk':
            await controls.start({
              x: (Math.random() - 0.5) * 240,
              transition: { type: 'spring', stiffness: 120, damping: 14 },
            });
            break;
          case 'peck':
            await controls.start({
              rotate: [0, 18, 0],
              transition: { duration: 0.4 },
            });
            break;
          case 'idle':
            await controls.start({
              y: [0, -3, 0],
              transition: { duration: 1.2, repeat: 1 },
            });
            break;
        }
      }
    }
    loop();
    return () => { cancelled = true; };
  }, [reduced, controls]);

  return (
    <motion.div
      className="crow-mascot"
      data-testid="crow-mascot"
      data-static={reduced ? 'true' : 'false'}
      animate={controls}
      aria-hidden
    >
      <img src="/logo.png" alt="" data-testid="crow-mascot-img" />
    </motion.div>
  );
}
