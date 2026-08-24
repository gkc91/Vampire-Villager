import type { RoleDefinition } from '../types';
import { alivePlayers, playerById } from './helpers';

/** Kâhin — her gece 1 kişinin vampir olup olmadığını öğrenir. */
export const seer: RoleDefinition = {
  id: 'seer',
  team: 'village',
  premium: false,
  nightAction: {
    phase: 20,
    targetType: 'player',
    validTargets: (state, actorId) =>
      alivePlayers(state)
        .filter((p) => p.id !== actorId)
        .map((p) => p.id),
    resolve: (state, actorId, targetId) => {
      const target = playerById(state, targetId);
      if (!target) return [];
      return [
        {
          type: 'reveal',
          actorId,
          targetId,
          isVampire: target.role === 'vampire',
        },
      ];
    },
  },
};
