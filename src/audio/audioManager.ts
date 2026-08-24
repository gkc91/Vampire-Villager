import { Howl, Howler } from 'howler';

/**
 * Ses yöneticisi — 06-assets.md'deki dosya isimleri.
 * Asset yoksa sessizce geçer, oyunu bloke etmez (CLAUDE.md #8).
 */

export type MusicTrack = 'lobby' | 'night' | 'day' | 'win_village' | 'win_vampires';
export type Sfx = 'wolf_howl' | 'rooster' | 'bell' | 'death' | 'click' | 'heartbeat';

const MUSIC_PATH = (name: MusicTrack) => `${import.meta.env.BASE_URL}assets/audio/music/${name}.mp3`;
const SFX_PATH = (name: Sfx) => `${import.meta.env.BASE_URL}assets/audio/sfx/${name}.mp3`;

const music = new Map<MusicTrack, Howl>();
const sfx = new Map<Sfx, Howl>();
const missing = new Set<string>();

let musicEnabled = true;
let sfxEnabled = true;
let current: MusicTrack | null = null;

function loadMusic(track: MusicTrack): Howl | null {
  if (missing.has(`music:${track}`)) return null;
  const existing = music.get(track);
  if (existing) return existing;
  const howl = new Howl({
    src: [MUSIC_PATH(track)],
    loop: track !== 'win_village' && track !== 'win_vampires',
    volume: 0.35,
    html5: true,
    onloaderror: () => {
      missing.add(`music:${track}`);
      music.delete(track);
    },
  });
  music.set(track, howl);
  return howl;
}

function loadSfx(name: Sfx): Howl | null {
  if (missing.has(`sfx:${name}`)) return null;
  const existing = sfx.get(name);
  if (existing) return existing;
  const howl = new Howl({
    src: [SFX_PATH(name)],
    volume: 0.6,
    onloaderror: () => {
      missing.add(`sfx:${name}`);
      sfx.delete(name);
    },
  });
  sfx.set(name, howl);
  return howl;
}

export function setMusicEnabled(enabled: boolean): void {
  musicEnabled = enabled;
  if (!enabled) {
    for (const howl of music.values()) howl.stop();
  } else if (current) {
    playMusic(current);
  }
}

export function setSfxEnabled(enabled: boolean): void {
  sfxEnabled = enabled;
}

export function playMusic(track: MusicTrack): void {
  if (current === track && musicEnabled) {
    const howl = music.get(track);
    if (howl?.playing()) return;
  }
  for (const [name, howl] of music) {
    if (name !== track) howl.fade(howl.volume(), 0, 400);
  }
  current = track;
  if (!musicEnabled) return;
  const howl = loadMusic(track);
  if (!howl) return;
  howl.volume(0.35);
  if (!howl.playing()) howl.play();
}

export function stopMusic(): void {
  current = null;
  for (const howl of music.values()) howl.stop();
}

export function playSfx(name: Sfx): void {
  if (!sfxEnabled) return;
  loadSfx(name)?.play();
}

/** Mobil tarayıcılar ilk dokunuşa kadar sesi kilitler. */
export function unlockAudio(): void {
  const ctx = Howler.ctx;
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}
