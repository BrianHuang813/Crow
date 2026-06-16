import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toPng } from 'html-to-image';
import { ArrowLeft, Download, Link2, Check, Twitter, Facebook, Send, Share2, Swords } from 'lucide-react';
import { fetchProject } from '../api/projects';
import { ShareCard, type ShareBackground } from '../components/ShareCard';
import './SharePage.css';

const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

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

  if (isLoading) return <main className="share page-container"><div className="page-message">Loading...</div></main>;
  if (isError || !project) return <main className="share page-container"><div className="page-message">Project not found.</div></main>;

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

  const shareUrl = `${window.location.origin}/p/${project.id}`;
  const shareText = `Help me claim the Grid — back "${project.name}" on Crow and let's fight for territory.`;

  const socialLinks = {
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
  };

  function openShare(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title: `${project!.name} on Crow`, text: shareText, url: shareUrl });
    } catch {
      // User dismissed the share sheet; nothing to do.
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="share page-container">
      <Link className="share__back" to={`/p/${project.id}`}><ArrowLeft size={16} /> Back to Project</Link>
      <div className="share__grid">
        <div className="share__preview">
          <div className="share__preview-heading">
            <div>
              <p className="eyebrow">Share asset</p>
              <h1>Card Preview</h1>
            </div>
            <span>9:16</span>
          </div>
          <ShareCard ref={cardRef} project={project} background={background} showTech={showTech} showStats={showStats} />
        </div>

        <aside className="share__side">
         <section className="share__panel share__rally">
          <h2 className="share__panel-title"><Swords size={20} /> Rally your friends</h2>
          <p className="share__panel-copy">
            Pull friends onto the Grid to back your project — every click adds momentum and helps you claim territory before it fades.
          </p>

          <blockquote className="share__rally-msg">{shareText}</blockquote>

          {canNativeShare && (
            <button className="btn btn--primary share__share-btn" onClick={handleNativeShare}>
              <Share2 size={16} /> Share with friends
            </button>
          )}

          <div className="share__social" role="group" aria-label="Share to social platforms">
            <button className="share__social-btn share__social-btn--x" onClick={() => openShare(socialLinks.x)} aria-label="Share on X">
              <Twitter size={18} />
            </button>
            <button className="share__social-btn share__social-btn--fb" onClick={() => openShare(socialLinks.facebook)} aria-label="Share on Facebook">
              <Facebook size={18} />
            </button>
            <button className="share__social-btn share__social-btn--tg" onClick={() => openShare(socialLinks.telegram)} aria-label="Share on Telegram">
              <Send size={18} />
            </button>
            <button className="share__social-btn" onClick={handleCopy} aria-label="Copy link">
              {copied ? <Check size={18} /> : <Link2 size={18} />}
            </button>
          </div>
          {copied && <p className="share__copied">Link copied — paste it anywhere.</p>}
         </section>

         <section className="share__panel">
          <h2 className="share__panel-title">Customize card</h2>
          <p className="share__panel-copy">Choose what appears in the downloadable Project card.</p>

          <div className="share__group">
            <div className="share__group-label">Background style</div>
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
              Show Project stats
              <input type="checkbox" checked={showStats} onChange={e => setShowStats(e.target.checked)} aria-label="Show stats" />
            </label>
          </div>

          <div className="share__actions">
            <button className="btn btn--primary" onClick={handleDownload}>
              <Download size={15} /> Download high-res card
            </button>
          </div>
         </section>
        </aside>
      </div>
    </main>
  );
}
