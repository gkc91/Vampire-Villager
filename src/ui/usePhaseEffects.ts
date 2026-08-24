import { useEffect, useRef } from 'react';
import type { PlayerView } from '../game/view';
import { playMusic, playSfx, setMusicEnabled, setSfxEnabled, stopMusic } from '../audio/audioManager';
import { useSettingsStore } from '../store/settingsStore';

/** Faz değişiminde müzik/SFX. Asset yoksa sessizce geçilir (06-assets.md). */
export function usePhaseEffects(view: PlayerView | null): void {
  const music = useSettingsStore((s) => s.music);
  const sfx = useSettingsStore((s) => s.sfx);
  const lastPhase = useRef<string | null>(null);
  const lastLogLength = useRef(0);

  useEffect(() => setMusicEnabled(music), [music]);
  useEffect(() => setSfxEnabled(sfx), [sfx]);

  useEffect(() => {
    if (!view) {
      stopMusic();
      lastPhase.current = null;
      return;
    }
    if (lastPhase.current === view.phase) return;
    lastPhase.current = view.phase;

    switch (view.phase) {
      case 'LOBBY':
        playMusic('lobby');
        break;
      case 'ROLE_REVEAL':
      case 'NIGHT':
        playMusic('night');
        playSfx('wolf_howl');
        break;
      case 'NIGHT_RESULT':
        playSfx('rooster');
        break;
      case 'DAY_DISCUSSION':
        playMusic('day');
        break;
      case 'VOTE':
        playSfx('bell');
        break;
      default:
        break;
    }
  }, [view]);

  // Ölüm anlatımı geldiğinde vurgu sesi.
  useEffect(() => {
    if (!view) {
      lastLogLength.current = 0;
      return;
    }
    const fresh = view.log.slice(lastLogLength.current);
    lastLogLength.current = view.log.length;
    if (fresh.some((e) => e.key === 'night_death' || e.key === 'vote_hanged' || e.key === 'hunter_kill')) {
      playSfx('death');
    }
  }, [view]);
}

/** Host cihazında ekranın uyumasını engeller (01-architecture.md). */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        // İzin verilmedi / desteklenmiyor → sessizce geç.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !released) void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release();
    };
  }, [active]);
}
