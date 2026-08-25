import type { GameAction } from './types';
import type { PlayerView } from './view';

/**
 * Otomatik oyuncular (az kişiyle test için).
 * Bot da tıpkı insan gibi YALNIZ kendi filtrelenmiş görünümünü kullanır —
 * host-otoriter modelin gizlilik sınırı botlar için de geçerlidir.
 */
export function botAction(view: PlayerView, random: () => number = Math.random): GameAction | null {
  const pick = <T,>(items: T[]): T | null =>
    items.length === 0 ? null : items[Math.floor(random() * items.length)];

  switch (view.phase) {
    case 'LOBBY':
      return view.me.ready ? null : { type: 'SET_READY', playerId: view.me.id, ready: true };

    case 'ROLE_REVEAL':
      return view.me.ready ? null : { type: 'ROLE_SEEN', playerId: view.me.id };

    case 'NIGHT': {
      if (!view.nightAction.canAct) return null;
      const target = view.nightAction.selfCast
        ? view.me.id
        : pick(view.nightAction.validTargets);
      return { type: 'NIGHT_ACTION', playerId: view.me.id, targetId: target };
    }

    case 'DAY_DISCUSSION': {
      // Büyücü botu büyüsünü ara sıra kullanır.
      if (!view.spell.canCast || random() > 0.25) return null;
      const target = pick(view.spell.validTargets);
      if (!target) return null;
      return { type: 'CAST_SPELL', playerId: view.me.id, targetId: target };
    }

    case 'VOTE': {
      if (!view.vote.canVote) return null;
      const others = view.players
        .filter((p) => p.isPlayer && p.alive && !p.left && p.id !== view.me.id)
        .map((p) => p.id);
      const target = random() < 0.15 ? null : pick(others);
      return { type: 'VOTE', playerId: view.me.id, targetId: target ?? 'abstain' };
    }

    default:
      return null;
  }
}
