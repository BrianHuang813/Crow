import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, Terminal, Rocket } from 'lucide-react';
import { PLUGIN_REPO, PLUGIN_INSTALL_STEPS, PLUGIN_RUN_COMMAND } from '../lib/submit';
import './HowItWorksPage.css';

export default function HowItWorksPage() {
  const [copied, setCopied] = useState<number | null>(null);

  async function copy(cmd: string, i: number) {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(i);
      setTimeout(() => setCopied(c => (c === i ? null : c)), 1500);
    } catch {
      /* clipboard unavailable — the command is still visible to copy manually */
    }
  }

  return (
    <main className="howto page-container">
      <header className="howto__intro">
        <p className="eyebrow">How it works</p>
        <h1>How Crow works</h1>
        <p className="howto__lead">
          Crow is a shared 60×60 arena. Submit your project and it lives or dies by
          the crowd — interactions buy it time and territory; silence lets it fade.
        </p>
      </header>

      <section className="howto__section">
        <h2>The mechanism</h2>
        <dl className="howto__defs">
          <div><dt>Grid</dt><dd>A 60×60 canvas shared by every project. Each cell is owned by a project; new projects start with one.</dd></div>
          <div><dt>Cell</dt><dd>A single tile, always Empty, Alive, Dying, or Fossil.</dd></div>
          <div><dt>Momentum</dt><dd>A 0–100 meter that fills from interactions. At 100 the project expands into an adjacent cell and momentum resets.</dd></div>
          <div><dt>Credits</dt><dd>Earned by interacting with other projects. Spent on Boosts and Resurrections.</dd></div>
          <div><dt>Lifespan</dt><dd>A project starts with 48 hours. Below 6 hours it is Dying — still fully playable, just visually critical.</dd></div>
          <div><dt>Fossil</dt><dd>A cell left behind by a dead project. An expanding project can claim it.</dd></div>
          <div><dt>Resurrection</dt><dd>200 Credits restart a dead project with a 24-hour clock, restoring its unclaimed fossils.</dd></div>
        </dl>

        <h3>Interactions</h3>
        <table className="howto__table">
          <thead>
            <tr><th>Action</th><th>Who</th><th>Effect</th></tr>
          </thead>
          <tbody>
            <tr><td>Click</td><td>Anyone (not the owner)</td><td>+5 momentum and +300s to the project; you earn +5 credits. 60s cooldown per project.</td></tr>
            <tr><td>Boost</td><td>Anyone (not the owner)</td><td>Costs 20 credits. +25 momentum and +1800s.</td></tr>
            <tr><td>Resurrect</td><td>Anyone</td><td>Costs 200 credits. Restarts a dead project with a 24-hour clock.</td></tr>
          </tbody>
        </table>
      </section>

      <section className="howto__section">
        <h2>How to submit</h2>

        <div className="howto__path">
          <h3><Rocket size={18} /> From the web</h3>
          <p>The fastest way — no tooling required. Fill in a short form and claim a cell.</p>
          <Link to="/submit" className="btn btn--primary">Submit a project</Link>
        </div>

        <div className="howto__path">
          <h3><Terminal size={18} /> From your terminal</h3>
          <p>Use the <strong>crow-submit</strong> Claude Code plugin — install it once, then submit from any project directory.</p>
          <ol className="howto__steps">
            {PLUGIN_INSTALL_STEPS.map((cmd, i) => (
              <li key={cmd} className="howto__step">
                <span className="howto__num">{i + 1}</span>
                <code className="howto__cmd">{cmd}</code>
                <button className="howto__copy" aria-label={`Copy command ${i + 1}`} onClick={() => copy(cmd, i)}>
                  {copied === i ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </li>
            ))}
          </ol>
          <p className="howto__run">
            <Terminal size={14} /> Then run <code>{PLUGIN_RUN_COMMAND}</code> in any project directory.
          </p>
          <a className="howto__plugin-link" href={PLUGIN_REPO} target="_blank" rel="noopener noreferrer">View the plugin</a>
        </div>
      </section>
    </main>
  );
}
