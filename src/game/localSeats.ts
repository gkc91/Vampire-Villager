import type { GameState, PlayerId } from './types';
import { eligibleActors } from './stateMachine';

/**
 * Yerel koltuklar — "telefon şimdi kimde olmalı?" (08-yerel-oyuncular.md)
 *
 * Kurucu, uzaktan katılanların yanına kendi telefonunda oynayacak oyuncular
 * ekleyebiliyor (`isLocal`). Bu fonksiyon o oyuncular arasından SIRASI
 * GELENİ söylüyor; `null` dönerse kurucunun telefonunda bekleyen kimse
 * yoktur ve kurucu kendi ekranına bakar.
 *
 * MOTORUN İÇİNDE çünkü kural bilgisi gerektiriyor: hangi gece adımında
 * kimin oynayacağını `eligibleActors` biliyor. Arayüzün bunu yeniden
 * türetmesi, kuralın iki yerde yaşaması demek olurdu.
 *
 * SIRA UZAKTAKİLERİ BEKLETMEZ: yalnız yerel oyuncular taranıyor. Uzaktaki
 * oyuncu kendi telefonunda oynarken kurucu aynı anda kendi yerel
 * oyuncusunu oynatabilir; motor zaten iki hamleyi de kabul ediyor.
 */
export function nextLocalActor(state: GameState): PlayerId | null {
  const yerel = state.players.filter((p) => p.isPlayer && p.isLocal && !p.left);
  if (yerel.length === 0) return null;

  switch (state.phase) {
    case 'ROLE_REVEAL':
      // Rolünü henüz görmemiş ilk yerel oyuncu.
      return yerel.find((p) => !p.ready)?.id ?? null;

    case 'NIGHT': {
      const step = state.nightStep;
      if (!step) return null;
      const eligible = eligibleActors(state, step);
      // O adımda oynaması gereken ama henüz oynamamış ilk yerel oyuncu.
      return (
        yerel.find(
          (p) => eligible.includes(p.id) && !state.night.acted.includes(`${p.id}:${step}`),
        )?.id ?? null
      );
    }

    case 'VOTE':
      // Henüz oy vermemiş ilk yaşayan yerel oyuncu.
      return yerel.find((p) => p.alive && state.votes[p.id] === undefined)?.id ?? null;

    default:
      /*
       * LOBBY, DAY_DISCUSSION, NIGHT_RESULT, VOTE_RESULT, GAME_END.
       *
       * Bu ekranlarda gizli bilgi yok ve sıra kimsede değil. Tartışma
       * zaten masanın ortasında yüksek sesle yapılıyor; telefonu elden
       * ele dolaştırmanın anlamı olmazdı.
       */
      return null;
  }
}
