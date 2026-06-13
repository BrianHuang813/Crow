import { Link } from 'react-router-dom';
import { ArrowRight, Grid2x2, Radio, TrendingUp } from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard';
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
            <p className="eyebrow">Crow / Claude</p>
            <h1>SUBMIT UR PROJECT NOW!</h1>
            <div className="home__hero-actions">
              <Link to="/explore" className="btn btn--primary"><TrendingUp size={18} /> Explore projects</Link>
              <Link to="/grid" className="btn btn--outline"><Grid2x2 size={18} /> View the Grid</Link>
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

            {isLoading && <div className="page-message">Loading projects...</div>}
            {isError && <div className="page-message page-message--error">Projects are unavailable right now.</div>}
            {!isLoading && !isError && (recent?.items.length ?? 0) === 0 && (
              <div className="page-message">No projects are on the Grid yet.</div>
            )}
            <div className="home__project-list">
              {(recent?.items ?? []).map(project => <ProjectCard key={project.id} project={project} />)}
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
