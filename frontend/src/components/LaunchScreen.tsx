import { useEffect, useRef, useState } from 'react';
import './LaunchScreen.css';

const SEEN_KEY = 'crow_launch_seen';
const COLS = 28;
const ROWS = 16;

// Most cells settle to the arena void; a slice "claim" a brand color, so the
// board reads as territory being taken rather than a rainbow.
const CLAIM_COLORS = ['var(--accent)', 'var(--accent-2)', 'var(--alive)', 'var(--dying)'];

function shouldShow(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem(SEEN_KEY)) return false;
  } catch {
    return false;
  }
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  return true;
}

/**
 * First-visit launch animation: a blank 60-cell arena ignites cell by cell in
 * a diagonal sweep, claiming territory, then the CROW mark emerges. Skippable,
 * shown once per browser, and silent under prefers-reduced-motion.
 */
export function LaunchScreen() {
  const [show, setShow] = useState(shouldShow);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number>();

  useEffect(() => {
    if (!show) return;
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode — show once, don't persist */ }

    const beginClose = () => {
      setClosing(true);
      closeTimer.current = window.setTimeout(() => setShow(false), 600);
    };
    const auto = window.setTimeout(beginClose, 3600);
    const onKey = () => beginClose();
    window.addEventListener('keydown', onKey);

    return () => {
      window.clearTimeout(auto);
      window.clearTimeout(closeTimer.current);
      window.removeEventListener('keydown', onKey);
    };
  }, [show]);

  if (!show) return null;

  const skip = () => {
    setClosing(true);
    closeTimer.current = window.setTimeout(() => setShow(false), 600);
  };

  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const delay = (c + r) * 24 + Math.random() * 120;
      const claimed = Math.random() < 0.5;
      const color = claimed ? CLAIM_COLORS[Math.floor(Math.random() * CLAIM_COLORS.length)] : 'var(--arena-surface)';
      cells.push(
        <span
          key={`${r}-${c}`}
          className="launch__cell"
          style={{ '--d': `${delay}ms`, '--c': color } as React.CSSProperties}
        />
      );
    }
  }

  return (
    <div className={`launch${closing ? ' launch--closing' : ''}`} role="presentation" onClick={skip}>
      <div className="launch__grid" aria-hidden>{cells}</div>
      <div className="launch__brand">
        <img src="/logo.png" alt="" className="launch__logo" />
        <div className="launch__word">CROW</div>
        <div className="launch__hud">claiming the grid…</div>
      </div>
      <button className="launch__skip" onClick={skip}>skip</button>
    </div>
  );
}
