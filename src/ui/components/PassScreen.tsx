import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';

/**
 * Elden ele modu: telefon el değiştirirken araya giren gizlilik perdesi.
 *
 * Tam ekran ve opak olması KASITLI: önceki oyuncunun rolü ya da gece
 * seçimi ekranda kalmasın. Sıradaki kişi düğmeye basana kadar altta ne
 * olduğu görünmez.
 */
export function PassScreen({ toName, color }: { toName: string; color: string }) {
  const { t } = useTranslation();
  const handOver = useGameStore((s) => s.handOver);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-night-950 px-6 text-center">
      <span className="text-5xl" aria-hidden="true">
        📱
      </span>

      <div>
        <p className="text-sm uppercase tracking-widest text-moon-200/50">{t('hotseat.passTo')}</p>
        <p
          className="mt-2 text-3xl font-bold"
          style={{ color }}
        >
          {toName}
        </p>
      </div>

      <p className="max-w-xs text-sm text-moon-200/60">{t('hotseat.passHint')}</p>

      <button type="button" className="btn-primary w-full max-w-xs" onClick={handOver}>
        {t('hotseat.ready', { name: toName })}
      </button>
    </div>
  );
}
