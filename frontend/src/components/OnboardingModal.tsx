import { useState, useEffect } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { X, Copy, Check, Terminal } from 'lucide-react';
import './OnboardingModal.css';

const STORAGE_KEY = 'crow_onboarded';
const PLUGIN_REPO = 'https://github.com/BrianHuang813/crow-plugins';

const STEPS = [
  '/plugin marketplace add BrianHuang813/crow-plugins',
  '/plugin install crow-submit@crow',
];

// Stagger the content in; the crow gets a little welcome hop.
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};
const crow = {
  hidden: { opacity: 0, scale: 0.5 },
  show: {
    opacity: 1,
    scale: 1,
    y: [0, -22, 0, -8, 0],
    rotate: [-10, 6, -4, 0],
    transition: { duration: 0.7, ease: 'easeOut' },
  },
};

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  // Show once, shortly after the first page render.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  }

  async function copyCmd(cmd: string, i: number) {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(i);
      setTimeout(() => setCopied(c => (c === i ? null : c)), 1500);
    } catch {
      /* clipboard unavailable — the command is still visible to copy manually */
    }
  }

  if (!open) return null;

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="onboard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboard-title"
        onClick={dismiss}
      >
        <motion.div
          className="onboard__card"
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <button className="onboard__close" aria-label="Close" onClick={dismiss}>
            <X size={18} />
          </button>

          <motion.div variants={container} initial="hidden" animate="show">
            <motion.img
              className="onboard__logo"
              src="/logo.png"
              alt=""
              variants={crow}
              style={{ originY: 1 }}
            />
            <motion.h2 className="onboard__title" id="onboard-title" variants={item}>
              Welcome, builder
            </motion.h2>
            <motion.p className="onboard__lead" variants={item}>
              Projects join the grid through the <strong>crow-submit</strong> Claude Code
              plugin — install it once, then submit from any repo.
            </motion.p>

            <motion.ol className="onboard__steps" variants={item}>
              {STEPS.map((cmd, i) => (
                <li key={cmd} className="onboard__step">
                  <span className="onboard__num">{i + 1}</span>
                  <code className="onboard__cmd">{cmd}</code>
                  <button
                    className="onboard__copy"
                    aria-label={`Copy command ${i + 1}`}
                    onClick={() => copyCmd(cmd, i)}
                  >
                    {copied === i ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                </li>
              ))}
            </motion.ol>

            <motion.p className="onboard__then" variants={item}>
              <Terminal size={14} /> Then run <code>/crow-submit:submit</code> in any project directory.
            </motion.p>

            <motion.div className="onboard__actions" variants={item}>
              <a
                className="btn btn--ghost"
                href={PLUGIN_REPO}
                target="_blank"
                rel="noopener noreferrer"
              >
                View the plugin
              </a>
              <button className="btn btn--primary" onClick={dismiss}>
                Got it
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </MotionConfig>
  );
}
