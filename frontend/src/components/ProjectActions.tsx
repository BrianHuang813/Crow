import { Zap, Rocket, Sparkles, Hourglass } from 'lucide-react';
import { useProjectInteractions } from '../hooks/useProjectInteractions';
import { startLogin } from '../utils/loginRedirect';
import type { Project } from '../types/api';
import './ProjectActions.css';

interface Props {
  project: Project;
}

export function ProjectActions({ project }: Props) {
  const {
    isLoggedIn, isOwnProject, inCooldown, canBoost, canResurrect, showInteract, credits,
    clickMutation, boostMutation, resurrectMutation,
  } = useProjectInteractions(project);

  return (
    <div className="project-actions">
      {!isLoggedIn && project.status !== 'dead' && (
        <>
          <button className="btn btn--secondary" onClick={() => startLogin()}>
            <Zap size={15} /> Click
          </button>
          <button className="btn btn--primary" onClick={() => startLogin()}>
            <Rocket size={15} /> Boost <span className="project-actions__cost">20₵</span>
          </button>
          <p className="project-actions__hint project-actions__login-hint">
            Log in with GitHub to Click or Boost — and start earning Credits.
          </p>
        </>
      )}

      {showInteract && (
        <>
          <button
            className="btn btn--secondary"
            onClick={() => clickMutation.mutate()}
            disabled={inCooldown || clickMutation.isPending}
            title={inCooldown ? 'Cooldown: wait 60s' : '+5 Momentum, +5 Credits'}
          >
            {inCooldown ? <Hourglass size={15} /> : <Zap size={15} />} Click
          </button>
          <button
            className="btn btn--primary"
            onClick={() => boostMutation.mutate()}
            disabled={!canBoost || boostMutation.isPending}
            title="Boost: 20 Credits → +25 Momentum, +30min"
          >
            <Rocket size={15} /> Boost <span className="project-actions__cost">20₵</span>
          </button>
        </>
      )}

      {canResurrect && (
        <button
          className="btn btn--primary"
          onClick={() => resurrectMutation.mutate()}
          disabled={resurrectMutation.isPending}
          title="Resurrect: 200 Credits → 24h timer, restore fossil cells"
        >
          <Sparkles size={15} /> Resurrect <span className="project-actions__cost">200₵</span>
        </button>
      )}

      {project.status === 'dead' && !canResurrect && isLoggedIn && !isOwnProject && (
        <p className="project-actions__hint">Need 200₵ to resurrect (you have {credits}).</p>
      )}
    </div>
  );
}
