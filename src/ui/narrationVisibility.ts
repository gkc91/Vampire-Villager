import type { NarrationEvent } from '../game/types';

/**
 * Bir anlatım kaydı SESLİ okunabilir mi?
 *
 * EKRAN İLE HOPARLÖR AYNI ŞEY DEĞİL. `buildPlayerView` kaydı `onlyFor` ile
 * süzüyor, yani ekranda kimse başkasının sırrını görmüyor. Ama ses
 * hoparlörden çıkıyor: aynı masada oturan herkes duyuyor.
 *
 * Kişiye özel anlatımlar (`onlyFor` dolu) şunlar:
 *   converted_self      "Vampire dönüştürüldün"
 *   stole_role_self     çalınan rolün ADI geçiyor
 *   role_stolen_self    "rolün çalındı"
 *   hunter_backfire_self / seal_failed_hunter   avcı olduğunu ele veriyor
 *   gece hamlesi onayı  hem rolü hem hedefi ele veriyor
 *
 * Bunlar sesli okunduğunda oyun biter. Üstelik ayarlardaki ipucu
 * kullanıcıyı tam oraya yönlendiriyordu: "Aynı odada oynuyorsanız
 * kurucunun cihazında açın."
 *
 * KURAL: herkese açık olan okunur, kişiye özel olan yalnız ekranda kalır.
 * Kendiliğinden güvenli — yeni bir gizli anlatım eklerken `onlyFor`
 * koymak yetiyor, burada ayrıca bir şey yapmak gerekmiyor.
 *
 * Elden ele modunda (08-yerel-oyuncular.md) bu kural şart: tek telefon
 * masanın ortasında duruyor.
 */
export function sesliOkunabilir(event: NarrationEvent): boolean {
  return !event.onlyFor;
}
