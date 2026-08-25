import { create } from 'zustand';
import type { ConnectionState, NetDiagnostics, NetworkAdapter } from '../net/NetworkAdapter';
import type { NetMessage } from '../net/messages';
import { isClientMessage } from '../net/messages';
import { createAdapter } from '../net';
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

  const handleServerMessage = (msg: NetMessage): void => {
    if (isClientMessage(msg)) return;
    switch (msg.type) {
      case 'hostHello': {
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

    async createRoom(name, solo = false) {
      await get().leave();
      const roomId = createRoomCode();
      const token = getPlayerToken();
      saveName(name);

      adapter = createAdapter(solo);
      adapter.onStateChange((connection) => set({ connection }));
      adapter.onDiagnostics((diagnostics) => set({ diagnostics }));

      host = new HostController(adapter, roomId, token, name, (view) => set({ view }));
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

    clearError: () => set({ errorKey: null }),

    setReady(ready) {
      const controller = asHost();
      if (controller) controller.dispatch({ type: 'SET_READY', playerId: controller.hostPlayerId, ready });
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
