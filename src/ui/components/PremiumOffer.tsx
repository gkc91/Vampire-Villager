import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from './atoms';
import { useGameStore } from '../../store/gameStore';
import { premiumPriceLabel } from '../../monetization/billing';
import { isNativeApp } from '../../util/platform';

/**
 * Lobideki premium teklifi.
 *
 * Yalnız KURUCUYA gösteriliyor. Sebebi ürünün kendi vaadi: masanın rol
 * havuzunu kuran belirliyor, dolayısıyla satın almanın etkisi kurucunun
 * elinde. Katılan bir oyuncunun burada satın alması o masada hiçbir şey
 * değiştirmezdi — kafa karıştırırdı. Katılan kişi premium isterse kendi
 * odasını kurar.
 *
 * Webde hiç görünmez: premium yalnız uygulamada satılıyor.
 */
export function PremiumOffer() {
  const { t } = useTranslation();
  const unlockByPurchase = useGameStore((s) => s.unlockByPurchase);
  const unlockByAd = useGameStore((s) => s.unlockByAd);

  const [fiyat, setFiyat] = useState<string | null>(null);
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

  if (!isNativeApp()) return null;

  const dene = async (islem: () => Promise<boolean>) => {
    if (mesgul) return;
    setMesgul(true);
    setHata(false);
    const oldu = await islem();
    setMesgul(false);
    if (!oldu) setHata(true);
  };

  return (
    <Card className="space-y-3 border-blood-500/40">
      <div>
        <p className="text-sm font-semibold">{t('premium.title')}</p>
        <p className="mt-1 text-xs text-moon-200/60">{t('premium.body')}</p>
      </div>

      <button
        type="button"
        className="btn-primary"
        disabled={mesgul}
        onClick={() => void dene(unlockByPurchase)}
      >
        {/* Fiyat mağazadan geliyor: ülkeye göre değişiyor, kodda sabitlenmez. */}
        {fiyat ? t('premium.buyWithPrice', { price: fiyat }) : t('premium.buy')}
      </button>

      <button
        type="button"
        className="btn-secondary"
        disabled={mesgul}
        onClick={() => void dene(unlockByAd)}
      >
        {t('premium.watchAd')}
      </button>

      {hata && <p className="text-center text-xs text-blood-300">{t('premium.failed')}</p>}
    </Card>
  );
}
