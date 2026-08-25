import type { RoleDefinition } from '../types';
import { aliveNonVampires } from './helpers';

/**
 * Vampir Lordu — oyun boyunca 1 kez bir oyuncuyu vampire dönüştürür.
 * Dönüştürülene bildirilir, karşılıklı vampir görünürlüğü açılır, ama
 * o gece kurban seçimine katılamaz.
 * Avcıyı dönüştürmeye çalışırsa dönüşüm olmaz; rastgele bir vampir
 * düz köylüye döner.
 * Lord ayrıca normal vampir oylamasına katılır (vampireVote adımında).
 */
export const vampireLord: RoleDefinition = {
  id: 'vampireLord',
  team: 'vampire',
  knowsTeammates: true,
  maxUses: 1,
  nightAction: {
    step: 'lord',
    validTargets: (state) => aliveNonVampires(state).map((p) => p.id),
    resolve: (_state, _actorId, targetId) => [{ type: 'convert', targetId }],
  },
};
