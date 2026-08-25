import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RelayAdapter } from './RelayAdapter';
import type { NetMessage } from './messages';

/**
 * Aktarıcı adapter'ının taşıma sözleşmesi:
 * - hedefli mesaj yalnız hedefe gider (rol görünümleri buradan geçer),
 * - host kimliği hostHello ile öğrenilir,
 * - bağlantı koptuğunda sunucu YENİ peerId verir; istemci kimliğini
 *   yeniden tanıtmazsa host onu ölü peerId ile tanımaya devam eder.
 */

interface SentFrame {
  to?: string;
  data: string;
}

class FakeSocket {
  static instances: FakeSocket[] = [];
  static OPEN = 1;

  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
  }

  // --- test tetikleyicileri
  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  deliver(envelope: unknown): void {
    this.onmessage?.({ data: JSON.stringify(envelope) });
  }

  drop(): void {
    this.readyState = 3;
    this.onclose?.();
  }

  frames(): SentFrame[] {
    return this.sent.map((raw) => JSON.parse(raw) as SentFrame);
  }

  messages(): { to?: string; msg: NetMessage }[] {
    return this.frames().map((f) => ({ to: f.to, msg: JSON.parse(f.data) as NetMessage }));
  }
}

const RELAY = 'ws://relay.test';

/** Node ortamında minimal DOM: yalnız görünürlük olayı için. */
class FakeEventTarget {
  private listeners = new Map<string, Set<() => void>>();
  addEventListener(type: string, cb: () => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(cb);
  }
  removeEventListener(type: string, cb: () => void): void {
    this.listeners.get(type)?.delete(cb);
  }
  fire(type: string): void {
    for (const cb of this.listeners.get(type) ?? []) cb();
  }
}

let fakeDocument: FakeEventTarget & { visibilityState: string };
let fakeWindow: FakeEventTarget;

beforeEach(() => {
  FakeSocket.instances = [];
  fakeDocument = Object.assign(new FakeEventTarget(), { visibilityState: 'visible' });
  fakeWindow = new FakeEventTarget();
  vi.stubGlobal('document', fakeDocument);
  vi.stubGlobal('window', fakeWindow);
  vi.stubGlobal('WebSocket', FakeSocket);
  vi.stubEnv('VITE_RELAY_URL', RELAY);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function lastSocket(): FakeSocket {
  return FakeSocket.instances[FakeSocket.instances.length - 1];
}

describe('RelayAdapter — taşıma', () => {
  it('oda adresine bağlanır ve bağlantıyı bildirir', async () => {
    const adapter = new RelayAdapter();
    const states: string[] = [];
    adapter.onStateChange((s) => states.push(s));

    await adapter.joinRoom('ABC123');
    const socket = lastSocket();
    expect(socket.url).toBe(`${RELAY}/room/ABC123`);

    socket.open();
    socket.deliver({ t: 'welcome', peerId: 'me', peers: [] });
    expect(states).toContain('connected');
  });

  it('host, hedefli mesajı yalnız o oyuncuya gönderir', async () => {
    const adapter = new RelayAdapter();
    await adapter.createRoom('ABC123');
    const socket = lastSocket();
    socket.open();
    socket.deliver({ t: 'welcome', peerId: 'host', peers: [] });
    socket.deliver({ t: 'peerJoin', peerId: 'p1' });

    adapter.sendToPlayer('p1', { type: 'joined', playerId: 'token-1' });

    const targeted = socket.messages().filter((m) => m.msg.type === 'joined');
    expect(targeted).toHaveLength(1);
    expect(targeted[0].to).toBe('p1');
  });

  it('istemci host kimliğini hostHello ile öğrenir ve niyetlerini ona yollar', async () => {
    const adapter = new RelayAdapter();
    await adapter.joinRoom('ABC123');
    const socket = lastSocket();
    socket.open();
    socket.deliver({ t: 'welcome', peerId: 'me', peers: ['host'] });

    socket.deliver({
      t: 'msg',
      from: 'host',
      data: JSON.stringify({ type: 'hostHello', roomId: 'ABC123' }),
    });

    adapter.sendToHost({ type: 'ready', token: 'token-1', ready: true });
    const ready = socket.messages().filter((m) => m.msg.type === 'ready');
    expect(ready).toHaveLength(1);
    expect(ready[0].to).toBe('host');
  });

  it('kopup dönünce kimliğini yeniden tanıtır (yeni peerId sorunu)', async () => {
    const adapter = new RelayAdapter();
    await adapter.joinRoom('ABC123');

    const first = lastSocket();
    first.open();
    first.deliver({ t: 'welcome', peerId: 'me-1', peers: ['host'] });
    first.deliver({
      t: 'msg',
      from: 'host',
      data: JSON.stringify({ type: 'hostHello', roomId: 'ABC123' }),
    });
    adapter.sendToHost({ type: 'join', token: 'token-1', name: 'Ali', color: '#fff' });
    expect(first.messages().some((m) => m.msg.type === 'join')).toBe(true);

    // Bağlantı koptu → yeniden bağlanma zamanlayıcısı
    first.drop();
    vi.advanceTimersByTime(1000);

    const second = lastSocket();
    expect(second).not.toBe(first);
    second.open();
    // Sunucu YENİ peerId verdi
    second.deliver({ t: 'welcome', peerId: 'me-2', peers: ['host'] });

    // Kimlik yeniden duyurulmalı, yoksa host bizi ölü peerId ile tanır
    const rejoin = second.messages().filter((m) => m.msg.type === 'join');
    expect(rejoin.length).toBeGreaterThan(0);
    expect(rejoin[0].msg).toMatchObject({ token: 'token-1', name: 'Ali' });
  });

  it('leave sonrası yeniden bağlanmaya çalışmaz', async () => {
    const adapter = new RelayAdapter();
    await adapter.joinRoom('ABC123');
    const socket = lastSocket();
    socket.open();
    socket.deliver({ t: 'welcome', peerId: 'me', peers: [] });

    const before = FakeSocket.instances.length;
    await adapter.leave();
    socket.drop();
    vi.advanceTimersByTime(10_000);

    expect(FakeSocket.instances).toHaveLength(before);
  });

  it('istemci mesajları host olmayan eşlere sızdırmaz (yayın yalnız hostta)', async () => {
    const adapter = new RelayAdapter();
    await adapter.joinRoom('ABC123');
    const socket = lastSocket();
    socket.open();
    socket.deliver({ t: 'welcome', peerId: 'me', peers: [] });

    // İstemci yayın yapamaz
    adapter.broadcast({ type: 'hostLeft' });
    expect(socket.messages().some((m) => m.msg.type === 'hostLeft')).toBe(false);
  });
});

describe('RelayAdapter — donan sekme ve boşta kalma', () => {
  it('sekme öne dönünce ölü bağlantıyı anında tazeler', async () => {
    const adapter = new RelayAdapter();
    await adapter.createRoom('ABC123');
    const first = lastSocket();
    first.open();
    first.deliver({ t: 'welcome', peerId: 'host', peers: [] });

    // Telefon kilitlendi: soket öldü, zamanlayıcılar donduğu için
    // yeniden bağlanma tetiklenmedi.
    first.readyState = 3;
    const before = FakeSocket.instances.length;

    fakeDocument.fire('visibilitychange');

    expect(FakeSocket.instances.length).toBe(before + 1);
    await adapter.leave();
  });

  it('boşta kalan bağlantıya kalp atışı gönderir', async () => {
    const adapter = new RelayAdapter();
    await adapter.joinRoom('ABC123');
    const socket = lastSocket();
    socket.open();
    socket.deliver({ t: 'welcome', peerId: 'me', peers: [] });

    const before = socket.sent.length;
    vi.advanceTimersByTime(26_000);
    expect(socket.sent.slice(before)).toContain('ping');

    // pong yanıtı mesaj akışını bozmamalı
    expect(() => socket.onmessage?.({ data: 'pong' })).not.toThrow();
    await adapter.leave();
  });

  it('leave sonrası kalp atışı durur', async () => {
    const adapter = new RelayAdapter();
    await adapter.joinRoom('ABC123');
    const socket = lastSocket();
    socket.open();
    socket.deliver({ t: 'welcome', peerId: 'me', peers: [] });
    await adapter.leave();

    socket.readyState = 1; // soket açık kalsa bile
    const before = socket.sent.length;
    vi.advanceTimersByTime(60_000);
    expect(socket.sent.length).toBe(before);
  });
});

/**
 * WebSocket'i engelleyen ağlar (gerçek vaka: HTTPS çalışıyor, soket 1006 ile
 * kapanıyor). QR ile gelen misafire "ağını değiştir" denemeyeceğine göre
 * oyun kendiliğinden HTTP taşımasına geçmeli.
 */
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  static OPEN = 1;
  static CLOSED = 2;

  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  close(): void {
    this.readyState = 2;
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  deliver(envelope: unknown): void {
    this.onmessage?.({ data: JSON.stringify(envelope) });
  }
}

describe('RelayAdapter — WebSocket engelliyse HTTP taşıması', () => {
  let posts: { url: string; body: string }[];

  beforeEach(() => {
    FakeEventSource.instances = [];
    posts = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    vi.stubGlobal('crypto', { randomUUID: () => 'peer-uuid-1' });
    vi.stubGlobal('fetch', (url: string, init?: { body?: string }) => {
      posts.push({ url, body: init?.body ?? '' });
      return Promise.resolve({ ok: true, status: 204 });
    });
  });

  it('soket açılmadan kapanırsa akışa geçer ve mesajları POST eder', async () => {
    const adapter = new RelayAdapter();
    const states: string[] = [];
    adapter.onStateChange((s) => states.push(s));

    await adapter.joinRoom('ABC123');
    lastSocket().drop(); // hiç açılmadan kapandı

    const stream = FakeEventSource.instances[0];
    expect(stream, 'HTTP akışı açılmalı').toBeDefined();
    expect(stream.url).toBe(`http://relay.test/stream/ABC123?peer=peer-uuid-1`);

    stream.open();
    stream.deliver({ t: 'welcome', peerId: 'peer-uuid-1', peers: ['host-1'] });
    expect(states).toContain('connected');

    // Host tanıtılınca niyetler POST ile gitmeli
    stream.deliver({
      t: 'msg',
      from: 'host-1',
      data: JSON.stringify({ type: 'hostHello', roomId: 'ABC123' }),
    });
    adapter.sendToHost({ type: 'ready', ready: true } as never);

    expect(posts.length).toBeGreaterThan(0);
    expect(posts[posts.length - 1].url).toBe(
      'http://relay.test/send/ABC123?peer=peer-uuid-1',
    );
    const frame = JSON.parse(posts[posts.length - 1].body) as { to?: string; data: string };
    expect(frame.to).toBe('host-1');
  });

  it('soket 6 saniyede açılmazsa beklemeyi bırakır', async () => {
    const adapter = new RelayAdapter();
    await adapter.joinRoom('ABC123');

    expect(FakeEventSource.instances).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(6000);
    expect(FakeEventSource.instances, '6 sn sonra HTTP denenmeli').toHaveLength(1);
  });
});
