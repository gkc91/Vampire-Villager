import type { RoleDefinition } from '../types';
import { aliveNonVampires } from './helpers';

/**
 * Kan Büyücüsü — oyun boyunca 2 gece, vampir olmayan bir oyuncuyu mühürler.
 * Mühürlenen o gece uyanamaz. Aynı kişiyi iki kez mühürleyebilir.
 * Avcıyı mühürlemeye çalışırsa mühür işlemez, avcıya uyarı gösterilir.
 * Ayrıca normal vampir oylamasına katılır.
 */
export const bloodWizard: RoleDefinition = {
  id: 'bloodWizard',
  team: 'vampire',
  knowsTeammates: true,
  maxUses: 2,
  nightAction: {
    step: 'bloodWizard',
    validTargets: (state) => aliveNonVampires(state).map((p) => p.id),
    resolve: (_state, _actorId, targetId) => [{ type: 'block', targetId }],
  },
};
