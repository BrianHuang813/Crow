import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, Terminal, ArrowRight } from 'lucide-react';
import { PLUGIN_REPO, PLUGIN_INSTALL_STEPS, PLUGIN_RUN_COMMAND } from '../lib/submit';
import './HowItWorksPage.css';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'mechanism', label: 'The mechanism' },
  { id: 'interactions', label: 'Interactions' },
  { id: 'submit', label: 'How to submit' },
];

const TERMS: [string, string][] = [
  ['Grid', 'A 60×60 canvas shared by every project. Each cell is owned by a project; new projects start with one.'],
  ['Cell', 'A single tile, always in one of four states: Empty, Alive, Dying, or Fossil.'],
  ['Momentum', 'A 0–100 meter that fills from interactions. At 100 the project expands into an adjacent cell and momentum resets.'],
  ['Credits', 'Earned by interacting with other projects. Spent on Boosts and Resurrections.'],
  ['Lifespan', 'A project starts with 48 hours. Below 6 hours it is Dying — still fully playable, just visually critical.'],
  ['Fossil', 'A cell left behind by a dead project. An expanding project can claim it.'],
  ['Resurrection', '200 Credits restart a dead project with a 24-hour clock, restoring its unclaimed fossils.'],
];

const INTERACTIONS: [string, string, string][] = [
  ['Click', 'Anyone (not the owner)', '+5 momentum and +300s to the project; you earn +5 credits. 60s cooldown per project.'],
  ['Boost', 'Anyone (not the owner)', 'Costs 20 credits. +25 momentum and +1800s.'],
  ['Resurrect', 'Anyone', 'Costs 200 credits. Restarts a dead project with a 24-hour clock.'],
];

function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

export default function HowItWorksPage() {
  const [copied, setCopied] = useState<number | null>(null);
  const active = useActiveSection(SECTIONS.map(s => s.id));

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
      <div className="howto__shell">
        <nav className="howto__toc" aria-label="On this page">
          <p className="howto__toc-title">On this page</p>
          <ul>
            {SECTIONS.map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={active === s.id ? 'is-active' : ''}>{s.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="howto__doc">
          <header className="howto__header">
            <p className="eyebrow">Documentation</p>
            <h1>How Crow works</h1>
            <p className="howto__lead">
              Crow is a shared 60×60 arena. Submit your project and it lives or dies by the
              crowd — interactions buy it time and territory; silence lets it fade.
            </p>
          </header>

          <section id="overview" className="howto__section">
            <h2>Overview</h2>
            <p>
              Every project on Crow occupies cells on one shared grid. There is no feed and no
              ranking algorithm — a project survives only while people keep interacting with it.
              Each interaction adds lifespan and momentum; enough momentum and the project claims
              new territory. Go quiet and the clock runs out, leaving a fossil behind.
            </p>
          </section>

          <section id="mechanism" className="howto__section">
            <h2>The mechanism</h2>
            <dl className="howto__terms">
              {TERMS.map(([term, def]) => (
                <div key={term} className="howto__term">
                  <dt>{term}</dt>
                  <dd>{def}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="interactions" className="howto__section">
            <h2>Interactions</h2>
            <p>Three actions move a project. You earn credits by interacting with projects that aren't your own.</p>
            <div className="howto__table-wrap">
              <table className="howto__table">
                <thead>
                  <tr><th>Action</th><th>Who</th><th>Effect</th></tr>
                </thead>
                <tbody>
                  {INTERACTIONS.map(([action, who, effect]) => (
                    <tr key={action}>
                      <td><span className="howto__action">{action}</span></td>
                      <td>{who}</td>
                      <td>{effect}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="submit" className="howto__section">
            <h2>How to submit</h2>

            <div className="howto__card">
              <h3>From the web</h3>
              <p>The fastest way — no tooling required. Fill in a short form and claim a cell.</p>
              <Link to="/submit" className="btn btn--primary">Submit a project <ArrowRight size={16} /></Link>
            </div>

            <div className="howto__card">
              <h3><Terminal size={18} /> From your terminal</h3>
              <p>Use the <strong>crow-submit</strong> Claude Code plugin — install it once, then submit from any project directory.</p>
              <ol className="howto__steps">
                {PLUGIN_INSTALL_STEPS.map((cmd, i) => (
                  <li key={cmd} className="howto__step">
                    <span className="howto__num">{i + 1}</span>
                    <code className="howto__cmd">{cmd}</code>
                    <button type="button" className="howto__copy" aria-label={`Copy command ${i + 1}`} onClick={() => copy(cmd, i)}>
                      {copied === i ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </li>
                ))}
              </ol>
              <p className="howto__run">Then run <code>{PLUGIN_RUN_COMMAND}</code> in any project directory.</p>
              <a className="howto__plugin-link" href={PLUGIN_REPO} target="_blank" rel="noopener noreferrer">
                View the plugin <ArrowRight size={14} />
              </a>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
