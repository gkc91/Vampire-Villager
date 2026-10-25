import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';

/**
 * Telefon el değiştirirken araya giren GİZLİLİK PERDESİ
 * (08-yerel-oyuncular.md).
 *
 * Tam ekran ve opak olması kasıtlı: önceki oyuncunun rolü ya da gece
 * seçimi ekranda kalmasın. Sıradaki kişi düğmeye basana kadar altta ne
 * olduğu görünmez.
 *
 * PERDEDE YALNIZ İSİM YAZIYOR. "Gece hamlen var" gibi bir cümle, o
 * kişinin gece uyanan bir rolü olduğunu bütün masaya söylerdi — perdenin
 * varlık sebebiyle çelişirdi.
 *
 * Perde açılana kadar store o oyuncunun görünümünü hiç üretmiyor; arkada
 * duran, kurucunun kendi ekranıdır.
 */
export function PassScreen({ toName, color }: { toName: string; color: string }) {
  const { t } = useTranslation();
  const passToSeat = useGameStore((s) => s.passToSeat);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-night-950 px-6 text-center">
      <span className="text-5xl" aria-hidden="true">
        📱
      </span>

      <div>
        <p className="text-sm uppercase tracking-widest text-moon-200/50">
          {t('localSeat.passTo')}
        </p>
        <p className="mt-2 text-3xl font-bold" style={{ color }}>
          {toName}
        </p>
      </div>

      <p className="max-w-xs text-sm text-moon-200/60">{t('localSeat.passHint')}</p>

      <button type="button" className="btn-primary w-full max-w-xs" onClick={passToSeat}>
        {t('localSeat.ready', { name: toName })}
      </button>
    </div>
  );
}
