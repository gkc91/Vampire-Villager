import type { RoleDefinition } from '../types';

/**
 * Sisler Vampiri — sis, bilgi alan rolleri (kâhin, dedektif) o gece
 * tamamen kapatır. İlk kullanım istediği gece; sonrasında 2 gece bekler,
 * en erken 3. gecede tekrar kullanabilir.
 * Hedef seçmez. Ayrıca normal vampir oylamasına katılır.
 */
export const mistVampire: RoleDefinition = {
  id: 'mistVampire',
  team: 'vampire',
  knowsTeammates: true,
  nightAction: {
    step: 'mist',
    selfCast: true,
    validTargets: (_state, actorId) => [actorId],
    resolve: () => [{ type: 'fog' }],
  },
};
