import { useTranslation } from 'react-i18next';
import type { PlayerView } from '../../game/view';
import { SectionTitle } from './atoms';

/**
 * Kâhin ve dedektifin topladığı bilgiler.
 *
 * Bu notlar YALNIZ gece ekranında gösterildiğinde kayboluyordu: oyuncu
 * seçimini yapar yapmaz adım ilerliyor, ekran değişiyor ve öğrendiği şeyi
 * göremiyordu. Bilgi kalıcıdır; gece sonucunda ve gündüz tartışmasında da
 * görünmeli — zaten en çok gündüz lazım oluyor.
 */
export function PrivateNotes({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  const hasSeer = view.seerResults.length > 0;
  const hasDetective = view.detectiveResults.length > 0;
  if (!hasSeer && !hasDetective) return null;

  const nameOf = (id: string) => view.players.find((p) => p.id === id)?.name ?? '';

  return (
    <section>
      <SectionTitle>{t('night.myNotes')}</SectionTitle>
      <ul className="space-y-1">
        {view.seerResults.map((result) => (
          <li
            key={`seer-${result.round}-${result.targetId}`}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
              result.isVampire
                ? 'border-blood-500/50 bg-blood-500/10 text-blood-300'
                : 'border-night-600 bg-night-900/70 text-moon-200/80'
            }`}
          >
            <span className="shrink-0 tabular-nums text-moon-200/40">{result.round}</span>
            <span>
              {t(result.isVampire ? 'night.seerResultVampire' : 'night.seerResultClean', {
                name: nameOf(result.targetId),
              })}
            </span>
          </li>
        ))}

        {view.detectiveResults.map((result) => (
          <li
            key={`det-${result.round}-${result.targetId}`}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
              result.woke
                ? 'border-moon-200/40 bg-night-800/70 text-moon-100'
                : 'border-night-600 bg-night-900/70 text-moon-200/70'
            }`}
          >
            <span className="shrink-0 tabular-nums text-moon-200/40">{result.round}</span>
            <span>
              {t(result.woke ? 'night.detectiveWoke' : 'night.detectiveSlept', {
                name: nameOf(result.targetId),
              })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
