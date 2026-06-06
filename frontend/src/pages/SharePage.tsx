import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toPng } from 'html-to-image';
import { Download, Link2 } from 'lucide-react';
import { fetchProject } from '../api/projects';
import { ShareCard, type ShareBackground } from '../components/ShareCard';
import './SharePage.css';

const BACKGROUNDS: { key: ShareBackground; color: string }[] = [
  { key: 'cream', color: '#fcf8f9' },
  { key: 'white', color: '#ffffff' },
  { key: 'dark', color: '#1b1b1c' },
];

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const cardRef = useRef<HTMLDivElement>(null);
  const [background, setBackground] = useState<ShareBackground>('cream');
  const [showTech, setShowTech] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [copied, setCopied] = useState(false);

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });

  if (isLoading) return <main className="share"><p className="share__muted">Loading…</p></main>;
  if (isError || !project) return <main className="share"><p className="share__muted">Project not found.</p></main>;

  async function handleDownload() {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${project!.name}-crow.png`;
      a.click();
    } catch {
      // Export can fail (e.g. detached node); leave the preview untouched.
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="share">
      <div className="share__grid">
        <div className="share__preview">
          <ShareCard ref={cardRef} project={project} background={background} showTech={showTech} showStats={showStats} />
        </div>

        <aside className="share__panel">
          <h2 className="share__panel-title">Customize Card</h2>

          <div className="share__group">
            <div className="share__group-label">Background</div>
            <div className="share__bg-options">
              {BACKGROUNDS.map(b => (
                <button
                  key={b.key}
                  type="button"
                  aria-label={`Background ${b.key}`}
                  className={`share__bg-swatch${background === b.key ? ' share__bg-swatch--active' : ''}`}
                  style={{ background: b.color }}
                  onClick={() => setBackground(b.key)}
                />
              ))}
            </div>
          </div>

          <div className="share__group">
            <label className="share__toggle">
              Show tech stack
              <input type="checkbox" checked={showTech} onChange={e => setShowTech(e.target.checked)} aria-label="Show tech stack" />
            </label>
            <label className="share__toggle">
              Show stats
              <input type="checkbox" checked={showStats} onChange={e => setShowStats(e.target.checked)} aria-label="Show stats" />
            </label>
          </div>

          <div className="share__actions">
            <button className="btn btn--primary" onClick={handleDownload}>
              <Download size={15} /> Download PNG
            </button>
            <button className="btn btn--secondary" onClick={handleCopy}>
              <Link2 size={15} /> {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
