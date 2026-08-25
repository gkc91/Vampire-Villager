import type { RoleDefinition } from '../types';
import { aliveTargets } from './helpers';

/**
 * Dedektif — her gece bir kişinin O GECE UYANIP UYANMADIĞINI öğrenir.
 * Rol ve takım bilgisi vermez. "Uyandı" = o gece fiilen seçim yapmış olmak;
 * mühürlenen, sisle engellenen, hakkı biten ve pas geçen uyanmamış sayılır.
 */
export const detective: RoleDefinition = {
  id: 'detective',
  team: 'village',
  nightAction: {
    step: 'detective',
    validTargets: (state, actorId) => aliveTargets(state, actorId),
    resolve: (_state, actorId, targetId) => [{ type: 'investigate', actorId, targetId }],
  },
};
