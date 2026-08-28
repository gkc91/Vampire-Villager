import { create } from 'zustand';
import type { ConnectionState, NetDiagnostics, NetworkAdapter } from '../net/NetworkAdapter';
import type { NetMessage } from '../net/messages';
import { isClientMessage, protocolOf, PROTOCOL_VERSION } from '../net/messages';
import { createAdapter } from '../net';
import { TABLE_VIEWER } from '../game/hotseat';
import { HostController } from './hostController';
import type { GameSettings, PlayerId } from '../game/types';
import type { PlayerView } from '../game/view';
import {
  colorForToken,
  createRoomCode,
  getPlayerToken,
  resetPlayerToken,
  saveName,
} from '../util/identity';

export type Screen = 'home' | 'hotseat' | 'game';

interface GameStore {
  screen: Screen;
  roomId: string | null;
  isHost: boolean;
  solo: boolean;
  connection: ConnectionState;
  /** i18n `error.*` anahtarı. */
  errorKey: string | null;
  view: PlayerView | null;
  myName: string;
  /** Ağ teşhisi: hangi aşamada takıldığımızı gösterir. */
  diagnostics: NetDiagnostics | null;
  /** Bağlantı beklenenden uzun sürüyor (12 sn). */
  slowConnect: boolean;
  /**
   * Ekranı açık tutma kilidinin durumu. Teşhis için: "ekran kapanıyor"
   * şikâyetinde kilidin tutup tutmadığını telefonda görebilmek gerekiyor.
   */
  wakeLock: 'idle' | 'active' | 'released' | 'unsupported' | 'failed';
  setWakeLock: (state: 'idle' | 'active' | 'released' | 'unsupported' | 'failed') => void;
  /**
   * Bu oturumun kimliği. localStorage'dan bir kez okunur; sonraki
   * mesajlar bunu kullanır — böylece token başka bir sekmede değişse bile
   * bu oturum kimliğini kaybetmez.
   */
  myToken: string;

  createRoom: (name: string, solo?: boolean) => Promise<string>;
  joinRoom: (roomId: string, name: string) => Promise<void>;
  /** Aynı odaya baştan bağlanmayı dener. */
  retryConnect: () => Promise<void>;
  /** Uygulama öne döndüğünde kimliği host'a yeniden tanıtır. */
  resync: () => void;
  leave: () => Promise<void>;
  clearError: () => void;

  // oyuncu niyetleri
  setReady: (ready: boolean) => void;
  roleSeen: () => void;
  nightAction: (targetId: PlayerId | null) => void;
  vote: (targetId: PlayerId | 'abstain') => void;
  castSpell: (targetId: PlayerId) => void;

  /**
   * Elden ele modu (tek cihaz, sırayla). Açıkken ekran o an sırası gelen
   * oyuncunun gözünden gösterilir; sıra değişince araya gizlilik perdesi
   * girer.
   */
  hotseat: boolean;
  /** Telefonu devralması gereken oyuncu; null ise perde yok. */
  passTo: PlayerId | null;
  /**
   * Elden elede seçimini yapmış ama sonucunu HENÜZ GÖRMEMİŞ oyuncu.
   *
   * Onay anında sıra hemen sıradakine geçiyordu; kâhin okuduğu kişinin
   * sonucunu göremeden telefonu devrediyordu (Bengü, 27 Ağustos). Bu
   * alan doluyken perde inmez: oyuncu "gördüm" diyene kadar ekran onda
   * kalır.
   */
  hotseatReview: PlayerId | null;
  /** Elden elede sırayı bilerek devreder. */
  endHotseatTurn: () => void;
  /** Onaylamadan önceki seçimi aynı adımdakilere duyurur. */
  nightPreview: (targetId: PlayerId | null) => void;
  /** Elden ele kurulum ekranını açar. */
  openHotseat: () => void;
  startHotseat: (names: string[]) => Promise<void>;
  /** Perdedeki "hazırım" düğmesi: ekranı yeni oyuncuya çevirir. */
  handOver: () => void;

  // yalnız host
  startGame: () => void;
  endDiscussion: () => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  addBot: (name: string) => void;
  kick: (playerId: PlayerId) => void;
  restart: () => void;
}

// Ağ nesneleri store dışında tutulur (React state'ine girmemeli).
let adapter: NetworkAdapter | null = null;
let host: HostController | null = null;
/** Aynı cihazda ikinci oturum açıldığında bir kez yeni kimlikle denenir. */
let identityRetried = false;
let slowTimer: ReturnType<typeof setTimeout> | null = null;

const SLOW_CONNECT_MS = 12_000;
/** Elden ele modunda sıra bekleyen aşamalar kendiliğinden ilerlemesin. */
const NO_TIMEOUT_SECONDS = 3600;

export const useGameStore = create<GameStore>((set, get) => {
  const asHost = (): HostController | null => (get().isHost ? host : null);

  const sendIntent = (msg: Parameters<NetworkAdapter['sendToHost']>[0]): void => {
    adapter?.sendToHost(msg);
  };

  /**
   * Bu dokunuş KİMİN adına?
   *
   * Normal oyunda cihaz sahibi kurucudur. Elden ele modunda ise telefon
   * sırayla dolaşıyor: ekranda kimin görünümü duruyorsa eylem onundur.
   * Bu ayrım olmadan Ayşe'nin "gördüm" dokunuşu Ali'yi hazır işaretliyor,
   * Ayşe hiç ilerlemiyor ve oyun kilitleniyordu.
   */
  const actingPlayer = (controller: HostController): PlayerId => {
    if (!get().hotseat) return controller.hostPlayerId;
    return get().view?.me.id ?? controller.hostPlayerId;
  };

  /**
   * Elden ele: her durum değişiminde "telefon kimde olmalı" sorusunu
   * yeniden sorar.
   *
   * Sıra başkasına geçtiyse perdeyi indirir VE ekranı hemen masa
   * görünümüne çevirir — perde açılana kadar önceki oyuncunun rolü
   * arkada durmasın.
   */
  const syncHotseat = (): void => {
    if (!get().hotseat || !host) return;

    // Oyuncu sonucuna bakıyor: perdeyi indirme, ekranı ondan alma.
    if (get().hotseatReview) return;

    // Lobide telefon kurucunun elinde: rol listesini düzenleyip oyunu o
    // başlatacak. Masa görünümüne geçersek kendi başlat düğmesini göremez.
    if (get().view?.phase === 'LOBBY') {
      if (get().view?.me.id !== undefined && !get().view?.me.isHost) host.setViewer(null);
      set({ passTo: null });
      return;
    }

    const actor = host.hotseatActor();
    const shown = get().view?.me.id ?? null;

    if (actor === null) {
      // Ortak ekran: kimsenin gizli bilgisi görünmemeli.
      if (shown !== TABLE_VIEWER) host.setViewer(TABLE_VIEWER);
      set({ passTo: null });
      return;
    }
    if (actor !== shown) {
      if (shown !== TABLE_VIEWER) host.setViewer(TABLE_VIEWER);
      set({ passTo: actor });
    } else {
      set({ passTo: null });
    }
  };

  const handleServerMessage = (msg: NetMessage): void => {
    if (isClientMessage(msg)) return;
    switch (msg.type) {
      case 'hostHello': {
        // Kurucunun sürümünü İLK temasta öğreniyoruz. Bu kontrol host
        // tarafındakinin aynadaki eşi ve şart: kurucu eski bir sürümdeyse
        // (protokol alanını hiç göndermiyorsa) bizim join'imizi süzemez,
        // sessizce kabul eder. Uyumsuzluğu o durumda yakalayan tek yer
        // burası.
        const hostProtocol = protocolOf(msg);
        if (hostProtocol !== PROTOCOL_VERSION) {
          set({
            errorKey:
              hostProtocol < PROTOCOL_VERSION ? 'error.hostOutdated' : 'error.clientOutdated',
            connection: 'error',
          });
          break;
        }
        // (Yeniden) bağlanma: kimliğimizi host'a tanıt.
        const token = get().myToken || getPlayerToken();
        sendIntent({
          type: 'join',
          token,
          name: get().myName,
          color: colorForToken(token),
        });
        break;
      }
      case 'view':
        if (slowTimer) clearTimeout(slowTimer);
        slowTimer = null;
        set({ view: msg.view, connection: 'connected', errorKey: null, slowConnect: false });
        break;
      case 'joinRejected': {
        if (msg.reason === 'duplicateSession' && !identityRetried) {
          identityRetried = true;
          const token = resetPlayerToken();
          set({ errorKey: 'error.duplicateSession', myToken: token });
          sendIntent({ type: 'join', token, name: get().myName, color: colorForToken(token) });
          break;
        }
        set({ errorKey: `error.${msg.reason}`, connection: 'error' });
        break;
      }
      case 'hostLeft':
        set({ errorKey: 'error.hostLost', connection: 'closed' });
        break;
      default:
        break;
    }
  };

  return {
    screen: 'home',
    roomId: null,
    isHost: false,
    solo: false,
    hotseat: false,
    passTo: null,
    hotseatReview: null,
    connection: 'idle',
    errorKey: null,
    view: null,
    myName: '',
    myToken: '',
    diagnostics: null,
    slowConnect: false,
    wakeLock: 'idle',

    async createRoom(name, solo = false) {
      await get().leave();
      const roomId = createRoomCode();
      const token = getPlayerToken();
      saveName(name);

      adapter = createAdapter(solo);
      adapter.onStateChange((connection) => set({ connection }));
      adapter.onDiagnostics((diagnostics) => set({ diagnostics }));

      host = new HostController(adapter, roomId, token, name, (view) => {
        set({ view });
        syncHotseat();
      });
      set({
        screen: 'game',
        roomId,
        isHost: true,
        solo,
        myName: name,
        myToken: token,
        errorKey: null,
        connection: 'connecting',
      });
      await host.start();
      return roomId;
    },

    async joinRoom(roomId, name) {
      await get().leave();
      const token = getPlayerToken();
      saveName(name);

      identityRetried = false;
      const net = createAdapter(false);
      adapter = net;
      net.onStateChange((connection) => set({ connection }));
      net.onDiagnostics((diagnostics) => set({ diagnostics }));
      net.onMessage((msg) => handleServerMessage(msg));

      if (slowTimer) clearTimeout(slowTimer);
      slowTimer = setTimeout(() => set({ slowConnect: true }), SLOW_CONNECT_MS);

      set({
        screen: 'game',
        roomId,
        isHost: false,
        solo: false,
        myName: name,
        myToken: token,
        errorKey: null,
        connection: 'connecting',
        slowConnect: false,
        diagnostics: null,
      });
      await net.joinRoom(roomId);
      // hostHello gelene kadar kuyrukta bekler.
      sendIntent({ type: 'join', token, name, color: colorForToken(token) });
    },

    resync() {
      const { isHost, screen, myToken, myName } = get();
      if (isHost || screen !== 'game' || !myToken) return;
      // Arka planda donan sekme geri geldiğinde host bizi yeniden eşlesin.
      sendIntent({ type: 'join', token: myToken, name: myName, color: colorForToken(myToken) });
    },

    async retryConnect() {
      const { roomId, myName, isHost } = get();
      if (!roomId || isHost) return;
      await get().joinRoom(roomId, myName);
    },

    async leave() {
      if (host) {
        host.stop();
        host = null;
      } else if (adapter) {
        sendIntent({ type: 'leave', token: get().myToken });
        await adapter.leave();
      }
      adapter = null;
      if (slowTimer) clearTimeout(slowTimer);
      slowTimer = null;
      set({
        screen: 'home',
        roomId: null,
        isHost: false,
        solo: false,
        connection: 'idle',
        view: null,
        diagnostics: null,
        slowConnect: false,
      });
    },

    setWakeLock(state) {
      if (get().wakeLock !== state) set({ wakeLock: state });
    },

    clearError: () => set({ errorKey: null }),

    setReady(ready) {
      const controller = asHost();
      if (controller)
        controller.dispatch({ type: 'SET_READY', playerId: actingPlayer(controller), ready });
      else sendIntent({ type: 'ready', token: get().myToken, ready });
    },

    roleSeen() {
      const controller = asHost();
      if (controller) controller.dispatch({ type: 'ROLE_SEEN', playerId: actingPlayer(controller) });
      else sendIntent({ type: 'roleSeen', token: get().myToken });
    },

    nightAction(targetId) {
      const controller = asHost();
      // Bayrak dispatch'ten ÖNCE konmalı. dispatch, host'un publish'ini
      // tetikliyor, o da syncHotseat'i çağırıyor: bayrak o an boşsa ekran
      // masaya geçiyor ve oyuncu kendi sonucunu göremiyor. (Testler
      // geçiyordu, hatayı tarayıcıda oynayınca gördüm.)
      const actor = controller && get().hotseat ? actingPlayer(controller) : null;
      if (actor) set({ hotseatReview: actor, passTo: null });
      if (controller)
        controller.dispatch({ type: 'NIGHT_ACTION', playerId: actor ?? actingPlayer(controller), targetId });
      else sendIntent({ type: 'nightAction', token: get().myToken, targetId });
    },

    endHotseatTurn() {
      set({ hotseatReview: null });
      syncHotseat();
    },

    nightPreview(targetId) {
      const controller = asHost();
      if (controller)
        controller.dispatch({ type: 'NIGHT_PREVIEW', playerId: actingPlayer(controller), targetId });
      else sendIntent({ type: 'nightPreview', token: get().myToken, targetId });
    },

    vote(targetId) {
      const controller = asHost();
      if (controller) controller.dispatch({ type: 'VOTE', playerId: actingPlayer(controller), targetId });
      else sendIntent({ type: 'vote', token: get().myToken, targetId });
    },

    castSpell(targetId) {
      const controller = asHost();
      if (controller)
        controller.dispatch({ type: 'CAST_SPELL', playerId: actingPlayer(controller), targetId });
      else sendIntent({ type: 'castSpell', token: get().myToken, targetId });
    },

    startGame() {
      asHost()?.dispatch({ type: 'START_GAME' });
    },

    endDiscussion() {
      asHost()?.dispatch({ type: 'END_DISCUSSION' });
    },

    updateSettings(settings) {
      asHost()?.updateSettings(settings);
    },

    openHotseat() {
      set({ screen: 'hotseat', errorKey: null });
    },

    async startHotseat(names) {
      // Elden ele hep tek cihazda: ağ yok, LocalAdapter yeter.
      await get().createRoom(names[0] ?? 'Oyuncu 1', true);
      set({ hotseat: true, hotseatReview: null });
      const controller = host;
      if (!controller) return;
      for (const name of names.slice(1)) controller.addLocalPlayer(name);

      // Sıra bekleyen zamanlayıcıları kaldır. Tek cihazda kimse ağdan
      // beklemiyor; telefon elden ele dolaşırken 60 saniyelik rol süresi
      // doluyor ve sıradaki oyuncu rolünü HİÇ göremeden gece başlıyordu.
      // Tartışma sayacı kalıyor, o masadaki sohbet için gerçekten işe yarar.
      controller.updateSettings({
        roleRevealSeconds: NO_TIMEOUT_SECONDS,
        nightStepSeconds: NO_TIMEOUT_SECONDS,
        voteSeconds: NO_TIMEOUT_SECONDS,
      });
      // Tek cihazda "hazırım" beklemenin anlamı yok; oyunu kurucu başlatır.
      controller.setViewer(null);
      syncHotseat();
    },

    handOver() {
      const next = get().passTo;
      if (!next || !host) return;
      host.setViewer(next);
      set({ passTo: null });
    },

    addBot(name) {
      asHost()?.addBot(name);
    },

    kick(playerId) {
      asHost()?.dispatch({ type: 'KICK_PLAYER', playerId });
    },

    restart() {
      asHost()?.dispatch({ type: 'RESTART' });
    },
  };
});
