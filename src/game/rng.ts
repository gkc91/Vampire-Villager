/**
 * Deterministik rastgelelik. Yalnız host'ta üretilir (01-architecture.md).
 * Saf: her fonksiyon yeni tohumu da döndürür, böylece motor test edilebilir.
 */

export function nextSeed(seed: number): number {
  // mulberry32 adımı
  return (seed + 0x6d2b79f5) | 0;
}

function toFloat(seed: number): number {
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomFloat(seed: number): [number, number] {
  const s = nextSeed(seed);
  return [toFloat(s), s];
}

export function randomInt(seed: number, maxExclusive: number): [number, number] {
  const [f, s] = randomFloat(seed);
  return [Math.floor(f * maxExclusive), s];
}

export function pick<T>(items: readonly T[], seed: number): [T, number] {
  const [i, s] = randomInt(seed, items.length);
  return [items[i], s];
}

export function shuffle<T>(items: readonly T[], seed: number): [T[], number] {
  const out = [...items];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    const [j, ns] = randomInt(s, i + 1);
    s = ns;
    [out[i], out[j]] = [out[j], out[i]];
  }
  return [out, s];
}

export function createSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) | 0;
}
