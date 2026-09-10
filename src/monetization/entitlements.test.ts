import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Hak kapsamlarının asimetrisi (kullanıcı kararı, 10 Eylül 2026):
 *
 * - **Roller MASA GENELİ**: odayı kuranın hakkı bütün masaya geçer.
 *   Bunu motor yapıyor (`HostController` rol havuzunu kurucunun elinden
 *   alıyor), burada test edilen kısım değil.
 * - **Reklamsızlık CİHAZ BAŞINA**: premium alan kişi masayı kursa bile
 *   diğer oyuncular oyun sonu reklamını görür.
 *
 * Ayrıca `no_ads`, `ROLE_TIERS_ACTIVE` anahtarından bağımsız olmalı.
 * Bir kez bağlıydı ve sonucu şuydu: anahtar kapalıyken herkes
 * "reklamsız" sayılıyor, reklam hiç görünmüyordu.
 */

async function yukle(opts: { native: boolean; premium: boolean; odullu?: boolean }) {
  vi.resetModules();
  vi.doMock('../util/platform', () => ({ isNativeApp: () => opts.native }));
  vi.doMock('./billing', () => ({ hasPremium: () => opts.premium }));
  vi.doMock('./adGate', () => ({ hasOneGamePremium: () => opts.odullu ?? false }));
  return import('./entitlements');
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('../util/platform');
  vi.doUnmock('./billing');
  vi.doUnmock('./adGate');
});

describe('reklamsızlık — cihaz başına, satın almaya bağlı', () => {
  it('satın alan cihazda reklam yok', async () => {
    const m = await yukle({ native: true, premium: true });
    expect(m.hasEntitlement('no_ads')).toBe(true);
  });

  it('satın almayan cihazda reklam VAR — kurucu premium olsa bile', async () => {
    // Bu cihazın kendi hakkı yok. Masayı kimin kurduğu burayı ilgilendirmez;
    // reklam kararı her cihazda kendi hakkına göre veriliyor.
    const m = await yukle({ native: true, premium: false });
    expect(m.hasEntitlement('no_ads')).toBe(false);
  });

  it('ödüllü reklam izlemek reklamsızlık KAZANDIRMAZ', async () => {
    const m = await yukle({ native: true, premium: false, odullu: true });
    expect(m.hasEntitlement('premium_roles'), 'roller açılır').toBe(true);
    expect(m.hasEntitlement('no_ads'), 'ama reklamsızlık gelmez').toBe(false);
  });

  it('webde reklam yok (orada hiç reklam göstermiyoruz)', async () => {
    const m = await yukle({ native: false, premium: false });
    expect(m.hasEntitlement('no_ads')).toBe(true);
  });
});

describe('rol katmanları — içerik kuralı', () => {
  // Bu kural ROLE_TIERS_ACTIVE bayrağından bağımsız: hangi katmanın hangi
  // rolleri açtığı saf bir fonksiyon. Bayrak yalnız kuralın ne zaman
  // uygulanacağını söylüyor, ne olduğunu değil.
  it('web 4, uygulama +4, premium 3', async () => {
    const { unlockedRoles } = await import('../game/unlocks');
    const web = unlockedRoles({ native: false, premium: false });
    const uygulama = unlockedRoles({ native: true, premium: false });
    const tam = unlockedRoles({ native: true, premium: true });

    expect(web).toEqual(['villager', 'vampire', 'seer', 'doctor']);
    expect(uygulama).toHaveLength(8);
    expect(tam).toHaveLength(11);
  });

  it('premium roller uygulamada bile satın alınmadan açılmaz', async () => {
    const { unlockedRoles } = await import('../game/unlocks');
    const uygulama = unlockedRoles({ native: true, premium: false });
    expect(uygulama).not.toContain('wizard');
    expect(uygulama).not.toContain('bloodWizard');
    expect(uygulama).not.toContain('mistVampire');
  });
});
