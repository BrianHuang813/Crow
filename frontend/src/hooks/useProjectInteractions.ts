import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { interact, resurrect } from '../api/interact';
import { useAuth } from './useAuth';
import type { Project } from '../types/api';

const CLICK_COOLDOWN_MS = 60_000;
const BOOST_COST = 20;
const RESURRECT_COST = 200;

/**
 * Shared Click / Boost / Resurrect logic and derived permission flags for a
 * project. Used by both the grid HoverCard and the detail page ProjectActions.
 */
export function useProjectInteractions(project: Project | undefined) {
  const { isLoggedIn, userId, credits, adjustCredits } = useAuth();
  const queryClient = useQueryClient();
  const [clickCooldownUntil, setClickCooldownUntil] = useState<number | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['project', project?.id] });
    queryClient.invalidateQueries({ queryKey: ['grid'] });
  };

  const clickMutation = useMutation({
    mutationFn: () => interact(project!.id, 'click'),
    onSuccess: (result) => {
      adjustCredits(result.credits_earned);
      setClickCooldownUntil(Date.now() + CLICK_COOLDOWN_MS);
      invalidate();
      setTimeout(() => setClickCooldownUntil(null), CLICK_COOLDOWN_MS);
    },
  });

  const boostMutation = useMutation({
    mutationFn: () => interact(project!.id, 'boost'),
    onSuccess: () => {
      adjustCredits(-BOOST_COST);
      invalidate();
    },
  });

  const resurrectMutation = useMutation({
    mutationFn: () => resurrect(project!.id),
    onSuccess: () => {
      adjustCredits(-RESURRECT_COST);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['myProject'] });
    },
  });

  const isOwnProject = !!userId && !!project && project.owner_id === userId;
  const inCooldown = !!clickCooldownUntil && Date.now() < clickCooldownUntil;
  const canBoost =
    isLoggedIn && !isOwnProject && !!project && credits >= BOOST_COST && project.status !== 'dead';
  const canResurrect =
    isLoggedIn && !!project && project.status === 'dead' && credits >= RESURRECT_COST;
  const showInteract =
    isLoggedIn && !isOwnProject && !!project && project.status !== 'dead';

  return {
    isLoggedIn,
    isOwnProject,
    inCooldown,
    canBoost,
    canResurrect,
    showInteract,
    credits,
    clickMutation,
    boostMutation,
    resurrectMutation,
  };
}
