/**
 * Reklam birimi kimlikleri — TEK KAYNAK.
 *
 * Varsayılan Google'ın resmî DEMO birimleridir. Gerçek kimlikler
 * `.env.production.local` üzerinden girer — `.env.production` DEĞİL.
 *
 * NEDEN `.local`: depo public ve `.env.production` takip ediliyor; oraya
 * yazılan her şey GitHub'da görünür. Reklam birimi kimlikleri sır değil
 * (pakete gömülüyor, ağ isteğinde görünüyor) ama başkasının kendi
 * uygulamasında kullanması hâlinde trafik BİZİM hesabımıza yazılır ve
 * geçersiz etkinlik cezasını biz yeriz. Yayınlamanın hiçbir faydası yok.
 *
 * `.env.production.local` `.gitignore`'daki `.env.*` kuralına takılıyor,
 * Vite ise onu `.env.production`'ın üstünde okuyor.
 *
 * NEDEN BÖYLE: kendi canlı reklamına tıklamak — test ederken bile —
 * AdMob'un "geçersiz etkinlik" tanımına giriyor ve hesap kapatmaya kadar
 * gidebiliyor. Demo birimleri "Test Ad" etiketiyle geliyor, istekleri ve
 * tıklamaları raporlara düşmüyor. Bu yüzden geliştirmede canlı kimlik
 * KULLANILMAZ; yanlışlıkla kullanılmasın diye varsayılan demo.
 */

/** https://developers.google.com/admob/android/test-ads */
const DEMO = {
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
} as const;

const env = import.meta.env;

function unit(gercek: string | undefined, demo: string): string {
  const temiz = gercek?.trim();
  return temiz && temiz.startsWith('ca-app-pub-') ? temiz : demo;
}

export const AD_UNITS = {
  /** Oyun sonu, kazanan açıklanmadan önce. */
  interstitial: unit(env.VITE_ADMOB_INTERSTITIAL as string | undefined, DEMO.interstitial),
  /** Bir oyunluk premium açan ödüllü reklam. */
  rewarded: unit(env.VITE_ADMOB_REWARDED as string | undefined, DEMO.rewarded),
} as const;

/** Canlı kimliklerle mi çalışıyoruz? Tanılama ekranı bunu gösterir. */
export const USING_LIVE_ADS =
  AD_UNITS.interstitial !== DEMO.interstitial || AD_UNITS.rewarded !== DEMO.rewarded;
