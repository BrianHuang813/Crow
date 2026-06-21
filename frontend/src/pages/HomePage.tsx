import { Link } from 'react-router-dom';
import { ArrowRight, Grid2x2, Radio, Rocket, TrendingUp } from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { Sidebar } from '../components/Sidebar';
import { useProjects } from '../hooks/useProjects';
import { useActivity } from '../hooks/useActivity';
import './HomePage.css';

export default function HomePage() {
  const { data: recent, isLoading, isError } = useProjects({ sort: 'recent', status: 'all', limit: 8 });
  const { data: trending } = useProjects({ sort: 'momentum', status: 'active', limit: 5 });
  const { data: builders } = useProjects({ sort: 'territory', status: 'active', limit: 5 });
  const { data: activity } = useActivity(12);

  return (
    <main className="home page-container">
      <div className="home__layout">
        <div className="home__feed">
          <section className="home__hero">
            <div className="home__hero-copy">
              <p className="eyebrow">Digital Darwinism for builders</p>
              <h1>Your project lives or dies by the crowd.</h1>
              <p className="home__hero-sub">
                Submit your work to a shared 60×60 arena. Every interaction buys it
                time, builds momentum, and claims territory. Go quiet and it dies —
                leaving a fossil behind.
              </p>
              <div className="home__hero-actions">
                <Link to="/submit" className="btn btn--primary"><Rocket size={18} /> Submit a project</Link>
                <Link to="/explore" className="btn btn--outline"><TrendingUp size={18} /> Explore projects</Link>
                <Link to="/grid" className="btn btn--outline"><Grid2x2 size={18} /> View the Grid</Link>
              </div>
            </div>
            <div className="home__hero-swatches" aria-hidden>
              {['var(--accent)', 'var(--alive)', 'var(--accent-2)', 'var(--dying)', 'var(--accent)', 'var(--dead)'].map((c, i) => (
                <span key={i} style={{ background: c }} />
              ))}
            </div>
          </section>

          <section className="home__section">
            <div className="home__section-heading">
              <div>
                <p className="eyebrow"><Radio size={13} /> Recent projects</p>
                <h2>Latest on CROW</h2>
              </div>
              <Link to="/explore">View all <ArrowRight size={16} /></Link>
            </div>

            {isError && <div className="page-message page-message--error">Projects are unavailable right now. Retrying shortly.</div>}
            {!isLoading && !isError && (recent?.items.length ?? 0) === 0 && (
              <div className="page-message">The Grid is empty. Be the first to claim territory.</div>
            )}
            <div className="home__project-list">
              {isLoading && <SkeletonGrid count={4} />}
              {(recent?.items ?? []).map((project, i) => (
                <ProjectCard key={project.id} project={project} index={i} featured={i === 0} />
              ))}
            </div>
          </section>
        </div>

        <Sidebar
          trending={trending?.items ?? []}
          builders={builders?.items ?? []}
          activity={activity?.events ?? []}
        />
      </div>
    </main>
  );
}
