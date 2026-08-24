import type { JoinRoom, JoinRoomConfig } from '@trystero-p2p/core';

/**
 * Sinyalleşme yöntemi. Trystero 0.25'te her strateji ayrı paket.
 *
 * - `nostr`  (varsayılan): 46 halka açık relay, kalıcı WebSocket pub/sub.
 *            En hızlı ve en dayanıklısı; mobil ağlarda da genelde geçer.
 * - `torrent`: 5 BitTorrent tracker'ı. Bazıları ölü, bazı operatörler
 *            BitTorrent trafiğini engelliyor → mobilde sorun çıkarabiliyor.
 * - `mqtt`   : halka açık MQTT broker'ları; yedek seçenek.
 *
 * Gerçek cihazda denemek için `.env` dosyasına VITE_P2P_STRATEGY yaz.
 * Paketler dinamik yükleniyor; yalnız seçilen strateji indiriliyor.
 */
export type P2PStrategy = 'nostr' | 'torrent' | 'mqtt';

const FALLBACK: P2PStrategy = 'nostr';

export const ACTIVE_STRATEGY: P2PStrategy =
  (import.meta.env.VITE_P2P_STRATEGY as P2PStrategy | undefined) ?? FALLBACK;

export interface StrategyModule {
  joinRoom: JoinRoom<JoinRoomConfig>;
  getRelaySockets: () => Record<string, WebSocket>;
}

export async function loadStrategy(strategy: P2PStrategy = ACTIVE_STRATEGY): Promise<StrategyModule> {
  switch (strategy) {
    case 'torrent': {
      const mod = await import('@trystero-p2p/torrent');
      return { joinRoom: mod.joinRoom, getRelaySockets: mod.getRelaySockets };
    }
    case 'mqtt': {
      const mod = await import('@trystero-p2p/mqtt');
      return { joinRoom: mod.joinRoom, getRelaySockets: mod.getRelaySockets };
    }
    case 'nostr':
    default: {
      const mod = await import('@trystero-p2p/nostr');
      return { joinRoom: mod.joinRoom, getRelaySockets: mod.getRelaySockets };
    }
  }
}
