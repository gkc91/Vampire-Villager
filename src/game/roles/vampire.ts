import type { RoleDefinition } from '../types';
import { aliveIds, playerById } from './helpers';

/**
 * Vampir — her gece diğer vampirlerle ortak kurban seçer.
 * Hedefte kısıt yok: kendini de takım arkadaşını da seçebilir.
 */
export const vampire: RoleDefinition = {
  id: 'vampire',
  team: 'vampire',
  knowsTeammates: true,
  nightAction: {
    step: 'vampireVote',
    validTargets: (state) => aliveIds(state),
    resolve: (state, _actorId, targetId) => {
      const target = playerById(state, targetId);
      if (!target || !target.alive || target.left) return [];
      return [{ type: 'attack', targetId }];
    },
  },
};
