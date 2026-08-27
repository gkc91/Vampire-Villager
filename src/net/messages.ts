import type { PlayerId, PlayerId as Token } from '../game/types';
import type { PlayerView } from '../game/view';
import type { GameSettings } from '../game/types';

/**
 * Host-otoriter mesaj protokolü (01-architecture.md).
 * İstemci yalnız NİYET gönderir; kararı host verir ve filtrelenmiş görünüm
 * döner. Hiçbir istemci mesajı başka bir istemciye ulaşmaz.
 */

/**
 * Protokol sürümü — UYGULAMA sürümü değil.
 *
 * Yalnız telin iki ucunu ilgilendiren bir şey değişince artar: mesaj
 * alanları, oyun durumunun şekli, gece adımlarının sırası, yeni rol.
 * Arayüz metni, sayfa, düğme değişikliği bunu ARTIRMAZ — yoksa aslında
 * uyumlu olan iki sürüm birbirini boşuna reddeder.
 *
 * Neden var: eski sürümdeki bir oyuncu yeni sürümdeki bir odaya girip
 * sessizce yanlış davranabilirdi. Hata vermez, sadece iki taraf farklı
 * kurallar işletir; masada "ben oy verdim ama sayılmadı" diye anlaşılır.
 * Sessiz bozulma yerine net bir uyarı istiyoruz.
 *
 * ARTIRIRKEN: bu sayıyı 2 yap ve 07-tasks.md'ye not düş. Sürüm alanını
 * hiç göndermeyen sürümler (1.3 ve öncesi) 1 sayılır.
 */
export const PROTOCOL_VERSION = 1;

/** Alanı olmayan eski sürümler protokol 1'dir. */
export function protocolOf(msg: { protocol?: number }): number {
  return msg.protocol ?? 1;
}

export type JoinReject =
  | 'roomFull'
  | 'gameInProgress'
  | 'nameTaken'
  | 'duplicateSession'
  /** Katılanın sürümü eski — güncellemesi gereken O. */
  | 'clientOutdated'
  /** Odayı kuranın sürümü eski — güncellemesi gereken KURUCU. */
  | 'hostOutdated';

export type ClientMessage =
  | { type: 'join'; token: Token; name: string; color: string; protocol?: number }
  | { type: 'ready'; token: Token; ready: boolean }
  | { type: 'setName'; token: Token; name: string }
  | { type: 'roleSeen'; token: Token }
  | { type: 'nightAction'; token: Token; targetId: PlayerId | null }
  | { type: 'vote'; token: Token; targetId: PlayerId | 'abstain' }
  | { type: 'castSpell'; token: Token; targetId: PlayerId }
  | { type: 'leave'; token: Token };

export type ServerMessage =
  | { type: 'hostHello'; roomId: string; protocol?: number }
  | { type: 'joined'; playerId: PlayerId }
  | { type: 'joinRejected'; reason: JoinReject }
  | { type: 'view'; view: PlayerView }
  | { type: 'settings'; settings: GameSettings }
  | { type: 'hostLeft' };

export type NetMessage = ClientMessage | ServerMessage;

export function isClientMessage(msg: NetMessage): msg is ClientMessage {
  return 'token' in msg;
}
