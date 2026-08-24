import type { PlayerId, PlayerId as Token } from '../game/types';
import type { PlayerView } from '../game/view';
import type { GameSettings } from '../game/types';

/**
 * Host-otoriter mesaj protokolü (01-architecture.md).
 * İstemci yalnız NİYET gönderir; kararı host verir ve filtrelenmiş görünüm
 * döner. Hiçbir istemci mesajı başka bir istemciye ulaşmaz.
 */

export type JoinReject = 'roomFull' | 'gameInProgress' | 'nameTaken' | 'duplicateSession';

export type ClientMessage =
  | { type: 'join'; token: Token; name: string; color: string }
  | { type: 'ready'; token: Token; ready: boolean }
  | { type: 'setName'; token: Token; name: string }
  | { type: 'roleSeen'; token: Token }
  | { type: 'nightAction'; token: Token; targetId: PlayerId | null }
  | { type: 'vote'; token: Token; targetId: PlayerId | 'abstain' }
  | { type: 'hunterShot'; token: Token; targetId: PlayerId | null }
  | { type: 'leave'; token: Token };

export type ServerMessage =
  | { type: 'hostHello'; roomId: string }
  | { type: 'joined'; playerId: PlayerId }
  | { type: 'joinRejected'; reason: JoinReject }
  | { type: 'view'; view: PlayerView }
  | { type: 'settings'; settings: GameSettings }
  | { type: 'hostLeft' };

export type NetMessage = ClientMessage | ServerMessage;

export function isClientMessage(msg: NetMessage): msg is ClientMessage {
  return 'token' in msg;
}
