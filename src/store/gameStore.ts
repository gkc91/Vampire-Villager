import { create } from 'zustand';
import type { ConnectionState, NetDiagnostics, NetworkAdapter } from '../net/NetworkAdapter';
import type { NetMessage } from '../net/messages';
import { isClientMessage, protocolOf, PROTOCOL_VERSION } from '../net/messages';
import { createAdapter } from '../net';
import { HostController } from './hostController';
import { buyPremium } from '../monetization/billing';
import { clearOneGamePremium, watchRewardedForPremium } from '../monetization/adGate';
import { currentUnlockedRoles } from '../monetization/entitlements';
import type { GameSettings, PlayerId } from '../game/types';
import type { PlayerView } from '../game/view';
import {
  colorForToken,
  createRoomCode,
  getPlayerToken,
  resetPlayerToken,
  saveName,
} from '../util/identity';

export type Screen = 'home' | 'game';

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
  /** Onaylamadan önceki seçimi aynı adımdakilere duyurur. */
  nightPreview: (targetId: PlayerId | null) => void;
  vote: (targetId: PlayerId | 'abstain') => void;
  castSpell: (targetId: PlayerId) => void;

  /**
   * Premium açma. `true` dönerse hak kazanıldı ve masanın rol havuzu
   * güncellendi. İkisi de yalnız kurucunun elinde anlamlı: rol havuzunu
   * kurucu belirliyor.
   */
  unlockByPurchase: () => Promise<boolean>;
  unlockByAd: () => Promise<boolean>;

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

export const useGameStore = create<GameStore>((set, get) => {
  const asHost = (): HostController | null => (get().isHost ? host : null);

  const sendIntent = (msg: Parameters<NetworkAdapter['sendToHost']>[0]): void => {
    adapter?.sendToHost(msg);
  };


  /**
   * Masanın rol havuzunu yeniden hesaplar.
   *
   * HostController havuzu YAPICIDA bir kez alıyor. Oyun ortasında premium
   * açılırsa ayarlar eski kalırdı; satın alma başarılı olunca burayı
   * çağırıyoruz. Yalnız kurucuda anlamlı — katılan oyuncunun ayarı yok.
   */
  const refreshAllowedRoles = (): void => {
    const controller = get().isHost ? host : null;
    if (!controller) return;
    const allowedRoles = currentUnlockedRoles();

    // Havuz DARALDIYSA (ödüllü reklamın bir oyunluk hakkı bitti) seçili
    // kurulumda kilitli rol kalmış olabilir. Bırakılırsa START_GAME
    // `lockedRole` ile sessizce reddediyor: kurucu düğmeye basıyor, hiçbir
    // şey olmuyor. Kurulumu sıfırlayınca motor havuzdan yeni bir öneri
    // üretiyor.
    const secili = get().view?.settings.roleSetup ?? [];
    const kilitliKaldi = secili.some((r) => !allowedRoles.includes(r));

    controller.updateSettings({
      allowedRoles,
      ...(kilitliKaldi ? { roleSetup: [] } : {}),
    });
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

      // Yeni masa yeni oyun demek: bir oyunluk ödül devretmez. Havuzu
      // yapıcıda okuduğu için HostController'dan ÖNCE temizleniyor.
      clearOneGamePremium();

      adapter = createAdapter(solo);
      adapter.onStateChange((connection) => set({ connection }));
      adapter.onDiagnostics((diagnostics) => set({ diagnostics }));

      host = new HostController(adapter, roomId, token, name, (view) => {
        set({ view });
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
        controller.dispatch({ type: 'SET_READY', playerId: controller.hostPlayerId, ready });
      else sendIntent({ type: 'ready', token: get().myToken, ready });
    },

    roleSeen() {
      const controller = asHost();
      if (controller) controller.dispatch({ type: 'ROLE_SEEN', playerId: controller.hostPlayerId });
      else sendIntent({ type: 'roleSeen', token: get().myToken });
    },

    nightAction(targetId) {
      const controller = asHost();
      if (controller)
        controller.dispatch({ type: 'NIGHT_ACTION', playerId: controller.hostPlayerId, targetId });
      else sendIntent({ type: 'nightAction', token: get().myToken, targetId });
    },

    nightPreview(targetId) {
      const controller = asHost();
      if (controller)
        controller.dispatch({ type: 'NIGHT_PREVIEW', playerId: controller.hostPlayerId, targetId });
      else sendIntent({ type: 'nightPreview', token: get().myToken, targetId });
    },

    vote(targetId) {
      const controller = asHost();
      if (controller) controller.dispatch({ type: 'VOTE', playerId: controller.hostPlayerId, targetId });
      else sendIntent({ type: 'vote', token: get().myToken, targetId });
    },

    castSpell(targetId) {
      const controller = asHost();
      if (controller)
        controller.dispatch({ type: 'CAST_SPELL', playerId: controller.hostPlayerId, targetId });
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

    async unlockByPurchase() {
      const oldu = await buyPremium();
      if (oldu) refreshAllowedRoles();
      return oldu;
    },

    async unlockByAd() {
      const oldu = await watchRewardedForPremium();
      if (oldu) refreshAllowedRoles();
      return oldu;
    },

    addBot(name) {
      asHost()?.addBot(name);
    },

    kick(playerId) {
      asHost()?.dispatch({ type: 'KICK_PLAYER', playerId });
    },

    restart() {
      // SIRA ÖNEMLİ. `UPDATE_SETTINGS` yalnız LOBBY fazında işliyor
      // (stateMachine.ts), yani havuzu sonuç ekranındayken tazelemek
      // sessizce yutulurdu. Önce masayı lobiye döndür, sonra hakkı bitir.
      asHost()?.dispatch({ type: 'RESTART' });
      clearOneGamePremium();
      refreshAllowedRoles();
    },
  };
});
