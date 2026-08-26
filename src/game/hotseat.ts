import type { GameState, PlayerId } from './types';
import { eligibleActors } from './stateMachine';

/**
 * Elden ele (tek cihaz) modu — "telefon şimdi kimde olmalı?"
 *
 * Tek cihazda oynarken oyuncular sırayla telefonu alır: rolünü görür,
 * gece hamlesini yapar, oyunu verir. Bu fonksiyon o sıradaki kişiyi
 * söyler. `null` dönerse sıra kimsede değildir — o ekran HERKESE açıktır
 * (gündüz tartışması, gece sonucu, oyun sonu).
 *
 * Motorun içinde duruyor çünkü kural bilgisi gerektiriyor: kimin hangi
 * gece adımında oynayacağını `eligibleActors` biliyor.
 */
export function nextHotseatActor(state: GameState): PlayerId | null {
  const active = state.players.filter((p) => p.isPlayer && !p.left);

  switch (state.phase) {
    case 'ROLE_REVEAL':
      // Rolünü henüz görmemiş ilk oyuncu.
      return active.find((p) => !p.ready)?.id ?? null;

    case 'NIGHT': {
      const step = state.nightStep;
      if (!step) return null;
      const eligible = eligibleActors(state, step);
      // O adımda oynaması gereken ama henüz oynamamış ilk kişi.
      return (
        active.find((p) => eligible.includes(p.id) && !state.night.acted.includes(`${p.id}:${step}`))
          ?.id ?? null
      );
    }

    case 'VOTE':
      // Henüz oy vermemiş ilk yaşayan oyuncu.
      return active.find((p) => p.alive && state.votes[p.id] === undefined)?.id ?? null;

    default:
      // LOBBY, DAY_DISCUSSION, NIGHT_RESULT, VOTE_RESULT, GAME_END:
      // masadaki herkes aynı ekrana bakar.
      return null;
  }
}

/**
 * Ortak ekranlarda kullanılan "masa" görüntüleyicisi.
 *
 * Gündüz tartışmasında telefon ortada duruyor. O anda herhangi bir
 * oyuncunun görünümünü göstermek, onun gizli notlarını (kâhin sonuçları)
 * bütün masaya açardı. Bu kimlik hiçbir oyuncuya ait olmadığı için
 * görünüm rol ve not içermez.
 */
export const TABLE_VIEWER: PlayerId = '__table__';
