import { useState, useEffect } from 'react';
import { X, Copy, Check, Terminal } from 'lucide-react';
import './OnboardingModal.css';

const STORAGE_KEY = 'crow_onboarded';
const PLUGIN_REPO = 'https://github.com/BrianHuang813/crow-plugins';

const STEPS = [
  '/plugin marketplace add BrianHuang813/crow-plugins',
  '/plugin install crow-submit@crow',
];

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
    <div
      className="onboard"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboard-title"
      onClick={dismiss}
    >
      <div className="onboard__card" onClick={e => e.stopPropagation()}>
        <button className="onboard__close" aria-label="Close" onClick={dismiss}>
          <X size={18} />
        </button>

        <img className="onboard__logo" src="/logo.png" alt="" />
        <h2 className="onboard__title" id="onboard-title">
          Submit your project from the terminal
        </h2>
        <p className="onboard__lead">
          Projects join the grid through the <strong>crow-submit</strong> Claude Code
          plugin — install it once, then submit from any repo.
        </p>

        <ol className="onboard__steps">
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
        </ol>

        <p className="onboard__then">
          <Terminal size={14} /> Then run <code>/crow-submit:submit</code> in any project directory.
        </p>

        <div className="onboard__actions">
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
        </div>
      </div>
    </div>
  );
}
