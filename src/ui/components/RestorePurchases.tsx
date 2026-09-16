import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { isNativeApp } from '../../util/platform';

type Durum = 'bos' | 'calisiyor' | 'bulundu' | 'yok';

/**
 * "Satın almaları geri yükle".
 *
 * NEDEN VAR: App Store Review Guidelines 3.1.1, geri yüklenebilir satın
 * alması olan her uygulamada GÖRÜNÜR bir geri yükleme yolu bulunmasını
 * zorunlu tutuyor. Olmadan uygulama reddediliyor ve bu, en sık ret
 * sebeplerinden biri. Play'de böyle bir şart yok.
 *
 * Teknik olarak çoğu zaman gereksiz: uygulama zaten açılışta mağazaya
 * soruyor (`restorePremium`, main.tsx). Ama iki durumda gerçekten işe
 * yarıyor — açılıştaki sorgu ağ yokken başarısız olduysa, ya da kullanıcı
 * satın almayı başka bir cihazda yaptıysa ve bu cihaz henüz bilmiyorsa.
 *
 * Ayarlar sayfasında duruyor: kullanıcının "hakkım kayboldu" diye
 * bakacağı ilk yer orası ve satın alma olmadan da erişilebilir olması
 * gerekiyor (Apple bunu arıyor).
 */
export function RestorePurchases() {
  const { t } = useTranslation();
  const restorePurchases = useGameStore((s) => s.restorePurchases);
  const [durum, setDurum] = useState<Durum>('bos');

  // Webde mağaza yok; düğme yalnız uygulamada anlamlı.
  if (!isNativeApp()) return null;

  const calistir = async () => {
    if (durum === 'calisiyor') return;
    setDurum('calisiyor');
    setDurum((await restorePurchases()) ? 'bulundu' : 'yok');
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        className="btn-secondary w-full"
        disabled={durum === 'calisiyor'}
        onClick={() => void calistir()}
      >
        {durum === 'calisiyor' ? t('restore.working') : t('restore.button')}
      </button>

      {durum === 'bulundu' && (
        <p className="mt-2 text-center text-xs text-moon-200/70">{t('restore.found')}</p>
      )}
      {durum === 'yok' && (
        <p className="mt-2 text-center text-xs text-moon-200/70">{t('restore.none')}</p>
      )}
    </div>
  );
}
