import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { X } from 'lucide-react';
import { pickSpawn, nextGap, FIRST_DELAY, VISIBLE_MS, type Spawn } from './mascot/spawn';
import './MascotSpawner.css';

const MUTE_KEY = 'crow_mascot_muted';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Occasionally pops a little animated crow into a random corner — it does its
 * thing for a few seconds, then leaves. Subtle and rare; click to react,
 * mute to hide for good. Decorative only (aria-hidden), pointer-events limited
 * to the mascot itself.
 */
export function MascotSpawner() {
  const reduced = prefersReducedMotion();
  const [muted, setMuted] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1'
  );
  const [spawn, setSpawn] = useState<Spawn | null>(null);

  // Active when not muted and motion is allowed.
  const active = !muted && !reduced;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const timers: number[] = [];

    function schedule(delay: number) {
      const t = window.setTimeout(() => {
        if (cancelled) return;
        setSpawn(pickSpawn());
        const hide = window.setTimeout(() => {
          if (!cancelled) setSpawn(null);
        }, VISIBLE_MS);
        timers.push(hide);
        schedule(nextGap());
      }, delay);
      timers.push(t);
    }

    schedule(FIRST_DELAY);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [active]);

  const mute = useCallback(() => {
    localStorage.setItem(MUTE_KEY, '1');
    setMuted(true);
    setSpawn(null);
  }, []);

  if (!active) return null;

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {spawn && (
          <motion.div
            key={`${spawn.leftPct}-${spawn.clip}`}
            className="mascot"
            style={{ left: `${spawn.leftPct}%` }}
            data-testid="mascot"
            initial={{ opacity: 0, y: 26, scale: 0.7 }}
            animate={{ opacity: 1, y: [26, -12, 0], scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <motion.img
              src={spawn.clip}
              alt=""
              aria-hidden
              className="mascot__img"
              draggable={false}
              whileHover={{ scale: 1.06 }}
              whileTap={{ y: -20, transition: { duration: 0.3, ease: 'easeOut' } }}
              onError={() => setSpawn(null)}
            />
            <button className="mascot__mute" aria-label="Hide the crow mascot" onClick={mute}>
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
