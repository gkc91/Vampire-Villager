/**
 * Sinyalleşme relay listesi.
 *
 * Trystero varsayılanı 46 relay'i appId'den türeyen sabit bir sırayla
 * karıştırıp ilk 5'ini kullanır. Bizim appId'mizin seçtiği 5 relay
 * tarayıcıdan ölçüldüğünde biri tamamen ölüydü (relay.binaryrobot.com),
 * yani fiilen 4 relay ile çalışıyorduk ve keşif gecikiyordu.
 *
 * Bu liste Türkiye'den ölçülerek seçildi (WebSocket açılma süresi):
 *   relay-rpi.edufeed.org 191ms · basspistol.org 196ms
 *   nostr-01.uid.ovh 231ms · relay.froth.zone 248ms
 *   nos.lol 381ms · relay.damus.io 517ms
 *
 * nos.lol ve relay.damus.io büyük ve köklü relay'ler; diğerleri hızlı.
 * Karışım bilinçli: hepsi aynı anda ölmesin.
 *
 * Ölçümü tekrarlamak için: uygulamada Ayarlar → Bağlantı → test.
 * Farklı liste denemek için `.env` içine VITE_RELAY_URLS yaz.
 */
const MEASURED_RELAYS = [
  'wss://relay-rpi.edufeed.org',
  'wss://basspistol.org',
  'wss://nostr-01.uid.ovh',
  'wss://relay.froth.zone',
  'wss://nos.lol',
  'wss://relay.damus.io',
];

export function relayUrls(): string[] | undefined {
  const custom = (import.meta.env.VITE_RELAY_URLS as string | undefined)?.trim();
  if (custom) return custom.split(',').map((u) => u.trim()).filter(Boolean);
  // Yalnız nostr için geçerli; diğer stratejiler kendi varsayılanını kullanır.
  return MEASURED_RELAYS;
}
