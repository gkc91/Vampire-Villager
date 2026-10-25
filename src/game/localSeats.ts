import type { GameState, Player, PlayerId } from './types';
import { eligibleActors } from './stateMachine';

/**
 * Yerel koltuklar — "telefon şimdi kimde olmalı?" (08-yerel-oyuncular.md)
 *
 * Kurucu, uzaktan katılanların yanına kendi telefonunda oynayacak oyuncular
 * ekleyebiliyor (`isLocal`). Buradaki iki fonksiyon kurucunun ekranında
 * perdenin ne zaman ineceğine karar veriyor.
 *
 * MOTORUN İÇİNDE çünkü kural bilgisi gerektiriyor: hangi gece adımında
 * kimin oynayacağını `eligibleActors` biliyor. Arayüzün bunu yeniden
 * türetmesi, kuralın iki yerde yaşaması demek olurdu.
 */

/**
 * Bu oyuncunun şu fazda yapması gereken, HENÜZ YAPMADIĞI bir şey var mı?
 *
 * Tek oyuncu için cevap verdiği sürece hem kurucuya hem yerel oyuncuya
 * aynı kural uygulanıyor — sıranın kimde olduğu tek yerden çıkıyor.
 */
function sirasiVar(state: GameState, p: Player): boolean {
  if (!p.isPlayer || p.left) return false;

  switch (state.phase) {
    case 'ROLE_REVEAL':
      return !p.ready;

    case 'NIGHT': {
      const step = state.nightStep;
      if (!step) return false;
      return (
        eligibleActors(state, step).includes(p.id) &&
        !state.night.acted.includes(`${p.id}:${step}`)
      );
    }

    case 'VOTE':
      return p.alive && state.votes[p.id] === undefined;

    default:
      /*
       * LOBBY, DAY_DISCUSSION, NIGHT_RESULT, VOTE_RESULT, GAME_END.
       *
       * Bu ekranlarda gizli bilgi yok ve sıra kimsede değil. Tartışma
       * zaten masanın ortasında yüksek sesle yapılıyor; telefonu elden
       * ele dolaştırmanın anlamı olmazdı.
       */
      return false;
  }
}

/**
 * Kurucunun telefonunda sırası gelen yerel oyuncu (yoksa null).
 *
 * KURUCU ÖNCE KENDİ İŞİNİ BİTİRİR. Telefon zaten onun elinde; kendi
 * rolünü görmeden "telefonu Ayşe'ye ver" perdesiyle karşılaşmak tuhaftı.
 * Kurucunun yapacağı bir şey varken perde inmiyor.
 *
 * UZAKTAKİLER SIRAYA GİRMİYOR: onlar kendi telefonlarında oynuyor.
 * Kurucunun ekranında belirmeleri hem gereksiz bekleme hem sızıntı
 * olurdu. Bu yüzden yalnız `isLocal` olanlar taranıyor.
 */
export function nextLocalActor(state: GameState, hostId?: PlayerId): PlayerId | null {
  const yerel = state.players.filter((p) => p.isPlayer && p.isLocal && !p.left);
  if (yerel.length === 0) return null;

  if (hostId) {
    const kurucu = state.players.find((p) => p.id === hostId);
    if (kurucu && sirasiVar(state, kurucu)) return null;
  }

  return yerel.find((p) => sirasiVar(state, p))?.id ?? null;
}
