import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { hasPremium, premiumPriceLabel } from '../../monetization/billing';
import { isNativeApp } from '../../util/platform';

/**
 * Ayarlardaki satın alma yolu.
 *
 * NEDEN VAR: 25 Ekim 2026 oyun gecesinde oyuncular "premium satın almayı
 * ayarlara da koy, bulamıyoruz" dedi. Teklif yalnız lobide ve yalnız
 * kurucuya görünüyordu; ayarlarda ise satın alma olmadan **geri yükleme**
 * düğmesi duruyordu. Yani kullanıcı "satın almaları geri yükle" görüp
 * satın almanın kendisini hiçbir yerde bulamıyordu.
 *
 * LOBİDEKİ KARTTAN FARKI — reklam düğmesi YOK. "Reklam izle, bu oyunluk
 * aç" hakkı tek bir oyun için geçerli; masa kurulmadan basılması anlamsız
 * olurdu. Ayarlar her ekrandan açılıyor, o yüzden burada yalnız kalıcı
 * satın alma var.
 */
export function PremiumPurchase() {
  const { t } = useTranslation();
  const unlockByPurchase = useGameStore((s) => s.unlockByPurchase);

  const [fiyat, setFiyat] = useState<string | null>(null);
  // Mağaza cevabı gelmeden kart çizilmesin: hakkı olan birine satış
  // göstermek, sonra kartın kaybolması kötü görünüyor.
  const [sahip, setSahip] = useState(hasPremium());
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState(false);

  useEffect(() => {
    let iptal = false;
    void premiumPriceLabel().then((p) => {
      if (!iptal) setFiyat(p);
    });
    return () => {
      iptal = true;
    };
  }, []);

  // Webde mağaza yok; hakkı olana da satış gösterilmez.
  if (!isNativeApp() || sahip) return null;

  const satinAl = async () => {
    if (mesgul) return;
    setMesgul(true);
    setHata(false);
    const oldu = await unlockByPurchase();
    setMesgul(false);
    if (oldu) setSahip(true);
    else setHata(true);
  };

  return (
    <div className="mt-4 rounded-xl border border-blood-500/40 bg-night-800/70 p-4">
      <p className="text-sm font-semibold">{t('premium.title')}</p>
      <p className="mt-1 text-xs text-moon-200/60">{t('premium.body')}</p>

      <button
        type="button"
        className="btn-primary mt-3"
        disabled={mesgul}
        onClick={() => void satinAl()}
      >
        {/* Fiyat mağazadan geliyor: ülkeye göre değişiyor, kodda sabitlenmez. */}
        {fiyat ? t('premium.buyWithPrice', { price: fiyat }) : t('premium.buy')}
      </button>

      {hata && <p className="mt-2 text-center text-xs text-blood-300">{t('premium.failed')}</p>}
    </div>
  );
}
