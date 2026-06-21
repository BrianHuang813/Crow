import { useState, useEffect } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { Link } from 'react-router-dom';
import { X, Copy, Check, Terminal, ChevronDown } from 'lucide-react';
import './OnboardingModal.css';
import { PLUGIN_REPO, PLUGIN_INSTALL_STEPS, PLUGIN_RUN_COMMAND } from '../lib/submit';

const STORAGE_KEY = 'crow_onboarded';

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
  const [showTerminal, setShowTerminal] = useState(false);

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
              Crow is a living arena. Submit your project and the crowd keeps it
              alive — or lets it die.
            </motion.p>

            <motion.div className="onboard__actions" variants={item}>
              <Link className="btn btn--primary" to="/submit" onClick={dismiss}>
                Submit on the web
              </Link>
            </motion.div>

            <motion.button
              type="button"
              className="onboard__toggle"
              variants={item}
              onClick={() => setShowTerminal(v => !v)}
              aria-expanded={showTerminal}
            >
              <ChevronDown size={14} /> Prefer your terminal? Install the Claude Code plugin
            </motion.button>

            {showTerminal && (
              <ol className="onboard__steps">
                {PLUGIN_INSTALL_STEPS.map((cmd, i) => (
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
                <li className="onboard__then">
                  <Terminal size={14} /> Then run <code>{PLUGIN_RUN_COMMAND}</code> in any project directory.
                </li>
              </ol>
            )}

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
