import type { RoleDefinition } from '../types';
import { aliveTargets } from './helpers';

/**
 * Hırsız — tarafsız. Gece EN SON uyanır, seçtiği oyuncunun rolünü çalar.
 * Çalınan oyuncu (vampir bile olsa) düz köylüye döner.
 * Çalma bir kezdir: o andan itibaren hırsız o roldür ve o takımdadır.
 */
export const thief: RoleDefinition = {
  id: 'thief',
  team: 'neutral',
  maxUses: 1,
  nightAction: {
    step: 'thief',
    validTargets: (state, actorId) => aliveTargets(state, actorId),
    resolve: (_state, actorId, targetId) => [{ type: 'steal', actorId, targetId }],
  },
};
