import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HostController, SUSPENSION_MS } from './hostController';
import type { ConnectionState, NetworkAdapter, PeerId } from '../net/NetworkAdapter';
import type { ClientMessage, NetMessage, ServerMessage } from '../net/messages';
import type { PlayerView } from '../game/view';

/** Testler için sahte ağ: gönderilen mesajları biriktirir. */
class MockAdapter implements NetworkAdapter {
  readonly kind = 'mock';
  sent: { peerId: PeerId; msg: ServerMessage }[] = [];
  broadcasts: ServerMessage[] = [];
  private messageCb: (msg: NetMessage, peerId: PeerId) => void = () => {};
  private peerLeaveCb: (peerId: PeerId) => void = () => {};

  async createRoom(): Promise<void> {}
  async joinRoom(): Promise<void> {}
  sendToHost(): void {}
  sendToPlayer(peerId: PeerId, msg: ServerMessage): void {
    this.sent.push({ peerId, msg });
  }
  broadcast(msg: ServerMessage): void {
    this.broadcasts.push(msg);
  }
  onMessage(cb: (msg: NetMessage, peerId: PeerId) => void): void {
    this.messageCb = cb;
  }
  onPeerJoin(): void {}
  onPeerLeave(cb: (peerId: PeerId) => void): void {
    this.peerLeaveCb = cb;
  }
  onStateChange(_cb: (state: ConnectionState) => void): void {}
  async leave(): Promise<void> {}

  // test tetikleyicileri
  clientSays(msg: ClientMessage, peerId: PeerId): void {
    this.messageCb(msg, peerId);
  }
  peerLeaves(peerId: PeerId): void {
    this.peerLeaveCb(peerId);
  }
  viewsFor(peerId: PeerId): PlayerView[] {
    return this.sent
      .filter((s) => s.peerId === peerId && s.msg.type === 'view')
      .map((s) => (s.msg as { type: 'view'; view: PlayerView }).view);
  }
  lastViewFor(peerId: PeerId): PlayerView | undefined {
    return this.viewsFor(peerId).at(-1);
  }
  rejections(): string[] {
    return this.sent
      .filter((s) => s.msg.type === 'joinRejected')
      .map((s) => (s.msg as { reason: string }).reason);
  }
}

const HOST_TOKEN = 'host-token';

function setup() {
  const adapter = new MockAdapter();
  const hostViews: PlayerView[] = [];
  const host = new HostController(adapter, 'ROOM12', HOST_TOKEN, 'Host', (v) => hostViews.push(v));
  return { adapter, host, hostViews };
}

function join(adapter: MockAdapter, token: string, name: string, peerId: string) {
  adapter.clientSays({ type: 'join', token, name, color: '#fff' }, peerId);
}

describe('HostController — katılım ve kimlik', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('oyuncu katılınca herkese kendi görünümü gider', async () => {
    const { adapter, host, hostViews } = setup();
    await host.start();
    join(adapter, 'p1', 'Ali', 'peer1');

    expect(adapter.lastViewFor('peer1')?.me.id).toBe('p1');
    expect(adapter.lastViewFor('peer1')?.me.isHost).toBe(false);
    expect(hostViews.at(-1)?.players).toHaveLength(2);
    host.stop();
  });

  it('host kimliği ağ üzerinden devralınamaz', async () => {
    const { adapter, host } = setup();
    await host.start();
    join(adapter, HOST_TOKEN, 'Sahtekar', 'peer1');

    expect(adapter.rejections()).toContain('duplicateSession');
    expect(adapter.viewsFor('peer1')).toHaveLength(0);
    host.stop();
  });

  it('aynı token ikinci bir aktif peer ile kullanılamaz', async () => {
    const { adapter, host } = setup();
    await host.start();
    join(adapter, 'p1', 'Ali', 'peer1');
    join(adapter, 'p1', 'Ali', 'peer2');

    expect(adapter.rejections()).toContain('duplicateSession');
    host.stop();
  });

  it('başka oyuncunun token\'ı olmadan aksiyon gönderilemez', async () => {
    const { adapter, host } = setup();
    await host.start();
    join(adapter, 'p1', 'Ali', 'peer1');
    join(adapter, 'p2', 'Veli', 'peer2');

    // peer2, p1 adına konuşmayı deniyor
    adapter.clientSays({ type: 'ready', token: 'p1', ready: true }, 'peer2');
    expect(host.getState().players.find((p) => p.id === 'p1')?.ready).toBe(false);

    adapter.clientSays({ type: 'ready', token: 'p2', ready: true }, 'peer2');
    expect(host.getState().players.find((p) => p.id === 'p2')?.ready).toBe(true);
    host.stop();
  });
});

describe('HostController — kopma ve dönüş', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  async function fullRoom() {
    const { adapter, host, hostViews } = setup();
    await host.start();
    for (let i = 1; i <= 5; i++) join(adapter, `p${i}`, `P${i}`, `peer${i}`);
    for (let i = 1; i <= 5; i++) {
      adapter.clientSays({ type: 'ready', token: `p${i}`, ready: true }, `peer${i}`);
    }
    host.dispatch({ type: 'START_GAME' });
    return { adapter, host, hostViews };
  }

  it('kopan oyuncu 90 sn askıda kalır, dönerse rolünü geri alır', async () => {
    const { adapter, host } = await fullRoom();
    const roleBefore = host.getState().players.find((p) => p.id === 'p3')?.role;

    adapter.peerLeaves('peer3');
    expect(host.getState().players.find((p) => p.id === 'p3')?.connected).toBe(false);
    expect(host.getState().players.find((p) => p.id === 'p3')?.left).toBe(false);

    vi.advanceTimersByTime(SUSPENSION_MS - 1000);
    join(adapter, 'p3', 'P3', 'peer3-new');

    const player = host.getState().players.find((p) => p.id === 'p3')!;
    expect(player.connected).toBe(true);
    expect(player.left).toBe(false);
    expect(player.role).toBe(roleBefore);
    expect(adapter.lastViewFor('peer3-new')?.me.role).toBe(roleBefore);
    host.stop();
  });

  it('90 sn dönmeyen oyuncu köyü terk etmiş sayılır', async () => {
    const { adapter, host } = await fullRoom();
    adapter.peerLeaves('peer4');

    vi.advanceTimersByTime(SUSPENSION_MS + 1000);

    const player = host.getState().players.find((p) => p.id === 'p4')!;
    expect(player.left).toBe(true);
    expect(host.getState().log.some((e) => e.key === 'player_left')).toBe(true);
    host.stop();
  });

  it('lobide kopan oyuncu beklemeden çıkarılır', async () => {
    const { adapter, host } = setup();
    await host.start();
    join(adapter, 'p1', 'Ali', 'peer1');
    adapter.peerLeaves('peer1');
    expect(host.getState().players.map((p) => p.id)).toEqual([HOST_TOKEN]);
    host.stop();
  });

  it('faz süresi dolunca host otomatik ilerletir', async () => {
    const { host } = await fullRoom();
    expect(host.getState().phase).toBe('ROLE_REVEAL');

    vi.advanceTimersByTime(host.getState().settings.roleRevealSeconds * 1000 + 1000);
    expect(host.getState().phase).toBe('NIGHT');
    host.stop();
  });
});

describe('HostController — sızıntı kontrolü', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('hiçbir oyuncuya başkasının rolü gönderilmez', async () => {
    const { adapter, host } = setup();
    await host.start();
    for (let i = 1; i <= 5; i++) join(adapter, `p${i}`, `P${i}`, `peer${i}`);
    for (let i = 1; i <= 5; i++) {
      adapter.clientSays({ type: 'ready', token: `p${i}`, ready: true }, `peer${i}`);
    }
    host.dispatch({ type: 'START_GAME' });

    for (let i = 1; i <= 5; i++) {
      const view = adapter.lastViewFor(`peer${i}`)!;
      const leaked = view.players.filter((p) => p.role !== undefined);
      expect(leaked).toHaveLength(0);
      expect(view.allRoles).toBeNull();
    }
    // yayın kanalından hiç görünüm gitmemeli
    expect(adapter.broadcasts.filter((m) => m.type === 'view')).toHaveLength(0);
    host.stop();
  });
});
