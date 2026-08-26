import { useGameStore } from '../store/gameStore';
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

/**
 * Ekranın uyumasını engeller. Yalnız host değil, oyundaki HER oyuncu için:
 * telefon kilitlenince tarayıcı sekmeyi donduruyor ve WebRTC bağlantısı
 * kopuyor. Party oyununda oyuncular sürekli telefondan başını kaldırdığı
 * için bu, sahadaki en sık kopma sebebi.
 */
/**
 * Ekranı açık tutar. Oyun sırasında telefonun kilitlenmesi iki şeyi birden
 * bozuyor: kurucu kilitlenirse oda erişilemez oluyor, elden ele modunda da
 * sıradaki oyuncu karanlık ekran devralıyor.
 *
 * Durumu store'a yazıyor çünkü bu kilidin GERÇEKTEN tutup tutmadığını
 * telefonda görmenin başka yolu yok — "ekran kapanıyor" şikâyeti geldiğinde
 * tahmin etmek yerine bakılacak bir yer olsun.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    const report = useGameStore.getState().setWakeLock;

    if (!active) {
      report('idle');
      return;
    }
    if (!('wakeLock' in navigator)) {
      report('unsupported');
      return;
    }

    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen');
        report('active');
        // Sistem kilidi kendiliğinden bırakabilir (ör. pil tasarrufu).
        sentinel.addEventListener('release', () => {
          if (!released) report('released');
        });
      } catch {
        report('failed');
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !released) void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      released = true;
      report('idle');
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release();
    };
  }, [active]);
}

