import { describe, expect, it } from 'vitest';
import { isAllowedOrigin } from './index';

/**
 * Aktarıcı, ücretsiz kotayı korumak için yalnız kendi istemcilerinden gelen
 * bağlantıları kabul ediyor. Süzgeç DOĞRU olmak zorunda: fazla geniş olursa
 * kota başkasına açılır, fazla darsa KENDİ uygulamamız dışarıda kalır.
 *
 * Gerçek arıza (6 Ekim 2026): izinli listede `http://localhost` vardı ama
 * Capacitor'ın Android kabuğu sayfayı HTTPS üzerinden sunuyor; origin
 * `https://localhost`. Uygulama kendi aktarıcısı tarafından 403'le
 * reddediliyordu — hem WebSocket yükseltmesi hem HTTP yedeği. Yayındaki
 * uygulamadan kurulan hiçbir oda çalışmıyordu ve cihazdaki teşhis paneli
 * bunu "internet kopuk" diye gösteriyordu.
 */

const ISTEK = 'https://biteclub.lampwickgames.com/room/ABC123';

describe('aktarıcı origin süzgeci', () => {
  it('Capacitor Android kabuğunu kabul eder (https://localhost)', () => {
    expect(isAllowedOrigin('https://localhost', ISTEK)).toBe(true);
  });

  it('iOS ve eski Ionic kabuklarını kabul eder', () => {
    expect(isAllowedOrigin('capacitor://localhost', ISTEK)).toBe(true);
    expect(isAllowedOrigin('ionic://localhost', ISTEK)).toBe(true);
  });

  it('yerel geliştirmeyi kabul eder', () => {
    expect(isAllowedOrigin('http://localhost:5173', ISTEK)).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:5173', ISTEK)).toBe(true);
    expect(isAllowedOrigin('https://127.0.0.1', ISTEK)).toBe(true);
  });

  it('kendi sitesini kabul eder', () => {
    expect(isAllowedOrigin('https://biteclub.lampwickgames.com', ISTEK)).toBe(true);
  });

  it('workers.dev alt alan adlarını kabul eder', () => {
    expect(isAllowedOrigin('https://vampire-villager.gokcekantarci.workers.dev', ISTEK)).toBe(true);
  });

  it('Origin başlığı olmayan isteği kabul eder — native kabuk', () => {
    expect(isAllowedOrigin(null, ISTEK)).toBe(true);
  });

  it('yabancı siteyi REDDEDER — kota korunuyor', () => {
    expect(isAllowedOrigin('https://baskasinin-sitesi.com', ISTEK)).toBe(false);
    expect(isAllowedOrigin('https://biteclub.lampwickgames.com.kotu.site', ISTEK)).toBe(false);
  });

  it('bozuk origin değerini REDDEDER', () => {
    expect(isAllowedOrigin('bu bir url değil', ISTEK)).toBe(false);
  });
});
