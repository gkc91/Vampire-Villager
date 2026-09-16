import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * "Uygulamayı silip kurunca premium geri gelir mi?"
 *
 * Gelir — kayıt cihazda değil, Google hesabında duruyor. Uygulama açılışta
 * mağazaya soruyor (`restorePremium`), cevaba göre hakkı geri veriyor.
 *
 * Buradaki testler o sorgunun İKİ kırılgan yerini tutuyor:
 *
 * 1. Sorgu BAŞARISIZ olursa tekrar denenebilmeli. Önceden "sorduk" bayrağı
 *    sorgudan ÖNCE atanıyordu: uygulamayı ağsız açan premium kullanıcının
 *    sorgusu hata veriyor, hak yok sayılıyor ve o oturum boyunca bir daha
 *    hiç sorulmuyordu. Kişi parasını ödediği rolleri göremiyordu.
 * 2. Aynı anda iki çağrı mağazaya iki kez gitmemeli — açılıştaki ısıtma
 *    çağrısı ile oda kurarkenki çağrı çakışıyor.
 */

const URUN = 'premium_roles';

function sahteApi(davranis: () => Promise<{ purchases: { productIdentifier: string }[] }>) {
  let cagri = 0;
  return {
    sayac: () => cagri,
    modul: {
      PURCHASE_TYPE: { INAPP: 'inapp' },
      NativePurchases: {
        isBillingSupported: async () => ({ isBillingSupported: true }),
        getPurchases: async () => {
          cagri += 1;
          return davranis();
        },
      },
    },
  };
}

async function yukle(api: { modul: unknown }) {
  vi.resetModules();
  vi.doMock('../util/platform', () => ({ isNativeApp: () => true }));
  vi.doMock('@capgo/native-purchases', () => api.modul);
  return import('./billing');
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('../util/platform');
  vi.doUnmock('@capgo/native-purchases');
});

describe('satın almanın geri yüklenmesi', () => {
  it('silip kuran kullanıcının hakkı geri geliyor', async () => {
    const api = sahteApi(async () => ({ purchases: [{ productIdentifier: URUN }] }));
    const m = await yukle(api);

    expect(await m.restorePremium()).toBe(true);
    expect(m.hasPremium()).toBe(true);
  });

  it('hiç almamış kullanıcıya hak vermiyor', async () => {
    const api = sahteApi(async () => ({ purchases: [] }));
    const m = await yukle(api);

    expect(await m.restorePremium()).toBe(false);
    expect(m.hasPremium()).toBe(false);
  });

  it('BAŞARISIZ sorgu kalıcı olmuyor — sonraki deneme hakkı buluyor', async () => {
    let ilk = true;
    const api = sahteApi(async () => {
      if (ilk) {
        ilk = false;
        throw new Error('ağ yok');
      }
      return { purchases: [{ productIdentifier: URUN }] };
    });
    const m = await yukle(api);

    expect(await m.restorePremium(), 'ağ yokken hak yok sayılır').toBe(false);
    expect(await m.restorePremium(), 'ağ gelince hak bulunur').toBe(true);
    expect(m.hasPremium()).toBe(true);
  });

  it('başarılı sorgu bir kez yapılıyor, sonrası önbellekten', async () => {
    const api = sahteApi(async () => ({ purchases: [{ productIdentifier: URUN }] }));
    const m = await yukle(api);

    await m.restorePremium();
    await m.restorePremium();
    await m.restorePremium();

    expect(api.sayac(), 'mağazaya tek sorgu').toBe(1);
  });

  it('aynı anda gelen iki çağrı tek sorgu paylaşıyor', async () => {
    let coz!: (v: { purchases: { productIdentifier: string }[] }) => void;
    const bekleyen = new Promise<{ purchases: { productIdentifier: string }[] }>((r) => {
      coz = r;
    });
    const api = sahteApi(() => bekleyen);
    const m = await yukle(api);

    const a = m.restorePremium();
    const b = m.restorePremium();
    coz({ purchases: [{ productIdentifier: URUN }] });

    expect(await a).toBe(true);
    expect(await b).toBe(true);
    expect(api.sayac(), 'mağazaya tek sorgu').toBe(1);
  });
});
