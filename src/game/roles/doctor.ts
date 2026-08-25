import type { RoleDefinition } from '../types';
import { alivePlayers } from './helpers';

/**
 * Doktor — oyun boyunca 2 kez gece koruma.
 * Kendini koruyabilir, aynı kişiyi üst üste iki gece koruyamaz.
 * Koruma yalnız gece işler; gündüz asılmasını engellemez.
 */
export const doctor: RoleDefinition = {
  id: 'doctor',
  team: 'village',
  maxUses: 2,
  nightAction: {
    step: 'doctor',
    validTargets: (state, actorId) => {
      const blocked = state.lastProtected[actorId];
      return alivePlayers(state)
        .filter((p) => p.id !== blocked)
        .map((p) => p.id);
    },
    resolve: (_state, _actorId, targetId) => [{ type: 'protect', targetId }],
  },
};
