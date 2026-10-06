import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { initAds, isPrivacyOptionsRequired, showPrivacyOptions } from '../../monetization/adGate';
import { isNativeApp } from '../../util/platform';

/**
 * "Gizlilik seçenekleri" — AB/İngiltere/İsviçre.
 *
 * NEDEN VAR: Google'ın AB Kullanıcı Rızası Politikası, rızasını bir kez
 * veren kullanıcının bunu SONRADAN değiştirebilmesini şart koşuyor ve
 * girişin uygulamanın içinden erişilebilir olmasını istiyor. Düğme
 * AdMob'un hazır formunu açıyor; metni ve seçenekleri AdMob konsolundaki
 * GDPR mesajı belirliyor.
 *
 * Yalnız gerektiğinde görünüyor: UMP, AB dışındaki kullanıcı için
 * `privacyOptionsRequirementStatus: NOT_REQUIRED` döndürüyor ve Türkiye'deki
 * oyuncu ayarlarda böyle bir satır görmüyor.
 */
export function PrivacyOptions() {
  const { t } = useTranslation();
  const [gerekli, setGerekli] = useState(false);

  useEffect(() => {
    if (!isNativeApp()) return;
    let iptal = false;
    // initAds zaten açılışta çağrılıyor; burada beklemek yalnız ayarlar
    // çok erken açılırsa UMP'nin cevabını kaçırmamak için.
    void initAds().then(() => {
      if (!iptal) setGerekli(isPrivacyOptionsRequired());
    });
    return () => {
      iptal = true;
    };
  }, []);

  if (!gerekli) return null;

  return (
    <button
      type="button"
      className="btn-secondary mt-4 w-full"
      onClick={() => void showPrivacyOptions()}
    >
      {t('settings.privacyOptions')}
    </button>
  );
}
