import { isNativeApp } from './platform';

/** Oda kodu / oyuncu kimliği üretimi ve kalıcılığı (localStorage). */

// Karıştırılabilir harfler (0/O, 1/I) alfabede yok.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TOKEN_KEY = 'vk_player_token';
const NAME_KEY = 'vk_player_name';

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function createRoomCode(): string {
  return Array.from(randomBytes(6))
    .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
    .join('');
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}

/** Kopan oyuncunun aynı kimlikle dönmesini sağlayan kalıcı token. */
export function getPlayerToken(): string {
  const existing = localStorage.getItem(TOKEN_KEY);
  if (existing) return existing;
  const token = Array.from(randomBytes(16))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  localStorage.setItem(TOKEN_KEY, token);
  return token;
}

/** Aynı cihazda ikinci bir oturum açıldığında yeni kimlik üretir. */
export function resetPlayerToken(): string {
  localStorage.removeItem(TOKEN_KEY);
  return getPlayerToken();
}

export function getSavedName(): string {
  return localStorage.getItem(NAME_KEY) ?? '';
}

export function saveName(name: string): void {
  localStorage.setItem(NAME_KEY, name);
}

const AVATAR_COLORS = [
  '#c1121f',
  '#8e44ad',
  '#2980b9',
  '#16a085',
  '#f39c12',
  '#d35400',
  '#27ae60',
  '#e84393',
  '#7f8c8d',
  '#2c3e50',
  '#b8860b',
  '#5f27cd',
];

/** Aynı token her zaman aynı rengi alır. */
export function colorForToken(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) hash = (hash * 31 + token.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Paylaşılabilir katılma linki (hash tabanlı → her statik barındırmada çalışır).
 *
 * Uygulamanın içinde `window.location.origin` **https://localhost** —
 * Capacitor kendi WebView'ini o adresten sunuyor. Onu paylaşan kişi
 * karşı tarafa hiçbir yere gitmeyen bir link göndermiş oluyordu; mağaza
 * ekran görüntüsünde de "https://localhost/#/join/…" yazıyordu.
 * Uygulamada herkese açık adresi kullan.
 */
export function joinLink(roomId: string): string {
  const publicUrl = (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.trim();
  if (isNativeApp() && publicUrl) {
    return `${publicUrl.replace(/\/+$/, '')}/#/join/${roomId}`;
  }
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/join/${roomId}`;
}

export function roomFromLocation(): string | null {
  const match = window.location.hash.match(/#\/join\/([A-Za-z0-9]{6})/);
  if (match) return match[1].toUpperCase();
  const path = window.location.pathname.match(/\/join\/([A-Za-z0-9]{6})/);
  return path ? path[1].toUpperCase() : null;
}
