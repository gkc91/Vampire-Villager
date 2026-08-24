import type { RoleDefinition } from '../types';
import { aliveIds, alivePlayers, playerById } from './helpers';

/**
 * Vampir — 03-roles.md
 * Her gece vampirler ortak bir kurban seçer (çoğunluk; eşitlikte rastgele).
 * Ortak hedefin hesabı stateMachine.ts'de yapılır; burada tek hedefin
 * saldırıya dönüşmesi tanımlıdır.
 */
export const vampire: RoleDefinition = {
  id: 'vampire',
  team: 'vampire',
  knowsTeammates: true,
  premium: false,
  nightAction: {
    phase: 10,
    targetType: 'player',
    // Kısıt yok: vampir kendini de takım arkadaşını da hedefleyebilir
    // (kullanıcı kararı — taktik blöf alanı).
    validTargets: (state, _actorId) => alivePlayers(state).map((p) => p.id),
    resolve: (state, _actorId, targetId) => {
      const target = playerById(state, targetId);
      if (!target || !target.alive || target.left) return [];
      if (!aliveIds(state).includes(targetId)) return [];
      return [{ type: 'attack', targetId, source: 'vampire' }];
    },
  },
};
