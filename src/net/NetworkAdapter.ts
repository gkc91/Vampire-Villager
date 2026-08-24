import type { ClientMessage, NetMessage, ServerMessage } from './messages';

export type PeerId = string;

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error' | 'closed';

/**
 * Bağlantı teşhisi — "bağlanamıyorum" şikâyetini hangi aşamada takıldığına
 * indirger: sinyal sunucusuna mı ulaşılamıyor, eş mi bulunamıyor, yoksa eş
 * bulunup da veri kanalı mı açılamıyor (NAT/TURN).
 */
export interface NetDiagnostics {
  strategy: string;
  /** Açık sinyal (relay) soketi sayısı. 0 ise ağ engelliyor demektir. */
  relaysConnected: number;
  relaysTotal: number;
  /** Bulunan eş sayısı. */
  peers: number;
}

/**
 * Ağ soyutlaması — UI ve oyun motoru Trystero'yu doğrudan import etmez
 * (01-architecture.md). İleride SupabaseAdapter yazılırsa yalnız bu dosyayı
 * uygulayan yeni bir sınıf eklenir; host-otoriter mantık değişmez.
 */
export interface NetworkAdapter {
  readonly kind: string;

  /** Host: odayı kurar ve dinlemeye başlar. */
  createRoom(roomId: string): Promise<void>;

  /** Oyuncu: odaya katılır, host'un kendini tanıtmasını bekler. */
  joinRoom(roomId: string): Promise<void>;

  /** Yalnız istemci → host. */
  sendToHost(msg: ClientMessage): void;

  /** Yalnız host → tek oyuncu (filtrelenmiş görünüm bu kanaldan gider). */
  sendToPlayer(peerId: PeerId, msg: ServerMessage): void;

  /** Yalnız host → herkes. Gizli bilgi ASLA buradan gönderilmez. */
  broadcast(msg: ServerMessage): void;

  onMessage(cb: (msg: NetMessage, peerId: PeerId) => void): void;
  onPeerJoin(cb: (peerId: PeerId) => void): void;
  onPeerLeave(cb: (peerId: PeerId) => void): void;
  onStateChange(cb: (state: ConnectionState) => void): void;
  onDiagnostics(cb: (diagnostics: NetDiagnostics) => void): void;

  leave(): Promise<void>;
}
