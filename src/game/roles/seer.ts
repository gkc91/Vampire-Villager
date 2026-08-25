import type { RoleDefinition } from '../types';
import { aliveTargets, isVampire, playerById } from './helpers';

/** Kâhin — her gece bir kişinin vampir olup olmadığını öğrenir. */
export const seer: RoleDefinition = {
  id: 'seer',
  team: 'village',
  nightAction: {
    step: 'seer',
    validTargets: (state, actorId) => aliveTargets(state, actorId),
    resolve: (state, actorId, targetId) => {
      const target = playerById(state, targetId);
      if (!target) return [];
      return [{ type: 'reveal', actorId, targetId, isVampire: isVampire(target) }];
    },
  },
};
