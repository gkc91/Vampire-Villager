import type { RoleDefinition } from '../types';
import { aliveTargets } from './helpers';

/**
 * Büyücü — oyun boyunca 1 kez, GÜNDÜZ tartışma sırasında büyü yapar.
 * O gün oylama hiç açılmaz, tartışmaya 60 sn eklenir, seçtiği oyuncu
 * o gece uyanamaz. Kimin yaptığı gizli kalır.
 */
export const wizard: RoleDefinition = {
  id: 'wizard',
  team: 'village',
  maxUses: 1,
  dayAction: {
    validTargets: (state, actorId) => aliveTargets(state, actorId),
  },
};
