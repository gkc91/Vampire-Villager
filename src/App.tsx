import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from './store/gameStore';
import { useNarrationSpeech } from './ui/useNarration';
import { usePhaseEffects, useWakeLock } from './ui/usePhaseEffects';
import { Screen } from './ui/components/Screen';
import { Card, Spinner } from './ui/components/atoms';
import { ConnectionDiagnostics } from './ui/components/ConnectionDiagnostics';
import { HomeScreen } from './ui/screens/HomeScreen';
import { LobbyScreen } from './ui/screens/LobbyScreen';
import { RoleRevealScreen } from './ui/screens/RoleRevealScreen';
import { NightScreen } from './ui/screens/NightScreen';
import { NarrationScreen } from './ui/screens/NarrationScreen';
import { DayScreen } from './ui/screens/DayScreen';
import { VoteScreen } from './ui/screens/VoteScreen';
import { HunterScreen } from './ui/screens/HunterScreen';
import { ResultScreen } from './ui/screens/ResultScreen';

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const view = useGameStore((s) => s.view);
  const errorKey = useGameStore((s) => s.errorKey);
  const connection = useGameStore((s) => s.connection);
  const solo = useGameStore((s) => s.solo);

  useNarrationSpeech(view?.log ?? []);
  usePhaseEffects(screen === 'game' ? view : null);
  // Oyundaki herkes: telefon kilitlenirse bağlantı kopuyor.
  useWakeLock(screen === 'game');
  // Host da dahil: donmuş sekmeden dönünce bağlantı tazelenmeli.
  useVisibilityResync(screen === 'game');

  if (screen === 'home') return <HomeScreen />;
  if (errorKey && !view) return <FatalError errorKey={errorKey} />;
  if (!view) return <Connecting />;

  return (
    <>
      {errorKey && <FatalError errorKey={errorKey} />}
      {/* Host dahil: host'un bağlantısı ölürse oda sessizce erişilemez olur,
          host bunu görmeli. */}
      {!errorKey && connection !== 'connected' && !solo && <ConnectionBanner />}
      <PhaseScreen />
    </>
  );
}

/** Sekme öne döndüğünde host'a yeniden tanıtıp durumu tazeler. */
function useVisibilityResync(active: boolean) {
  const resync = useGameStore((s) => s.resync);
  useEffect(() => {
    if (!active) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') resync();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [active, resync]);
}

function PhaseScreen() {
  const view = useGameStore((s) => s.view)!;

  switch (view.phase) {
    case 'LOBBY':
      return <LobbyScreen view={view} />;
    case 'ROLE_REVEAL':
      return <RoleRevealScreen view={view} />;
    case 'NIGHT':
      return <NightScreen view={view} />;
    case 'NIGHT_RESULT':
    case 'VOTE_RESULT':
      return <NarrationScreen view={view} />;
    case 'DAY_DISCUSSION':
      return <DayScreen view={view} />;
    case 'VOTE':
      return <VoteScreen view={view} />;
    case 'HUNTER_SHOT':
      return <HunterScreen view={view} />;
    case 'GAME_END':
      return <ResultScreen view={view} />;
    default:
      return <Connecting />;
  }
}

function Connecting() {
  const { t } = useTranslation();
  const leave = useGameStore((s) => s.leave);
  const slow = useGameStore((s) => s.slowConnect);

  return (
    <Screen backdrop="lobby" title={t('app.title')} onBack={() => void leave()}>
      <div className="flex h-full flex-col items-center justify-center gap-3 py-6">
        <Spinner />
        <p className="text-sm text-moon-200/70">{t('lobby.connecting')}</p>
        {slow && <p className="text-center text-xs text-blood-300">{t('connect.slow')}</p>}
        <ConnectionDiagnostics />
      </div>
    </Screen>
  );
}

function ConnectionBanner() {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-x-0 top-0 z-40 bg-blood-500/90 py-1 text-center text-xs font-semibold">
      {t('status.reconnecting')}
    </div>
  );
}

function FatalError({ errorKey }: { errorKey: string }) {
  const { t } = useTranslation();
  const leave = useGameStore((s) => s.leave);
  const isHostLost = errorKey === 'error.hostLost';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/95 p-6">
      <Card className="w-full max-w-sm space-y-3 text-center">
        <p className="text-4xl" aria-hidden="true">
          🦇
        </p>
        <h2 className="text-xl font-bold">{t(errorKey)}</h2>
        {isHostLost && <p className="text-sm text-moon-200/60">{t('error.hostLostHint')}</p>}
        {!isHostLost && (
          <>
            <p className="text-sm text-moon-200/60">{t('error.p2pHint')}</p>
            <ConnectionDiagnostics />
          </>
        )}
        <button type="button" className="btn-primary" onClick={() => void leave()}>
          {t('result.backHome')}
        </button>
      </Card>
    </div>
  );
}
