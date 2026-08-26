import { useTranslation } from 'react-i18next';

/**
 * Oyundan çıkma onayı.
 *
 * Geri tuşuna yanlışlıkla basmak ucuz olmamalı: kurucu çıkarsa oda dağılır
 * ve masadaki herkesin oyunu biter.
 */
export function ConfirmLeave({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-night-950/85 px-6 backdrop-blur-sm">
      <div className="w-full max-w-xs space-y-4 rounded-2xl border border-night-600 bg-night-900 p-5 text-center">
        <p className="text-base font-semibold">{t('back.title')}</p>
        <p className="text-sm text-moon-200/70">{t('back.body')}</p>
        <div className="space-y-2">
          <button type="button" className="btn-primary" onClick={onStay}>
            {t('back.stay')}
          </button>
          <button type="button" className="btn-ghost text-sm" onClick={onLeave}>
            {t('back.leave')}
          </button>
        </div>
      </div>
    </div>
  );
}
