import type { NetworkAdapter } from './NetworkAdapter';
import { LocalAdapter } from './LocalAdapter';
import { RelayAdapter, isRelayAvailable } from './RelayAdapter';
import { TrysteroAdapter } from './TrysteroAdapter';

export type NetMode = 'relay' | 'p2p';

/**
 * Taşıma katmanı seçimi. Host-otoriter mantık her ikisinde de aynıdır;
 * oyun motoru hangisinin kullanıldığını bilmez (01-architecture.md).
 *
 * - `relay` (varsayılan): sunucu aktarıcısı. Anında bağlanır, NAT sorunu yok.
 * - `p2p`: Trystero/WebRTC. Sunucusuz ama bağlanma süresi ağa göre değişir.
 *
 * `.env` içindeki VITE_NET_MODE ile değiştirilir. Aktarıcı adresi yoksa
 * (VITE_RELAY_URL tanımsız ve site aktarıcıyla aynı origin'de değilse)
 * kendiliğinden P2P'ye düşer.
 */
export function activeNetMode(): NetMode {
  const configured = (import.meta.env.VITE_NET_MODE as NetMode | undefined)?.trim() as
    | NetMode
    | undefined;
  if (configured === 'p2p') return 'p2p';
  return isRelayAvailable() ? 'relay' : 'p2p';
}

export function createAdapter(solo: boolean): NetworkAdapter {
  if (solo) return new LocalAdapter();
  return activeNetMode() === 'relay' ? new RelayAdapter() : new TrysteroAdapter();
}
