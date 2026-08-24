import type { RoleDefinition } from '../types';
import { alivePlayers } from './helpers';

/**
 * Doktor — her gece 1 kişiyi korur.
 * Kendini koruyabilir; aynı kişiyi üst üste iki gece koruyamaz.
 */
export const doctor: RoleDefinition = {
  id: 'doctor',
  team: 'village',
  premium: false,
  nightAction: {
    phase: 30,
    targetType: 'player',
    validTargets: (state, actorId) => {
      const blocked = state.lastProtected[actorId];
      return alivePlayers(state)
        .filter((p) => p.id !== blocked)
        .map((p) => p.id);
    },
    resolve: (_state, _actorId, targetId) => [{ type: 'protect', targetId }],
  },
};
