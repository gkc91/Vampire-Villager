import { useTranslation } from 'react-i18next';
import { Screen, backdropFor } from '../components/Screen';
import { SectionTitle } from '../components/atoms';
import { PlayerGrid } from '../components/PlayerGrid';
import { NarrationBanner } from '../components/NarrationBanner';
import { GhostNote, roleNames } from './NightScreen';
import type { PlayerView } from '../../game/view';

/** NIGHT_RESULT ve VOTE_RESULT: yalnız anlatım gösterilir. */
export function NarrationScreen({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  const alive = view.players.filter((p) => p.isPlayer && p.alive && !p.left);
  const dead = view.players.filter((p) => p.isPlayer && (!p.alive || p.left));
  const title =
    view.phase === 'NIGHT_RESULT'
      ? t('day.title', { count: view.round })
      : t('vote.title');

  return (
    <Screen backdrop={backdropFor(view.phase)} title={title}>
      <div className="pt-6">
        <NarrationBanner log={view.log} lines={3} />
      </div>
      <GhostNote view={view} />

      <section className="pt-2">
        <SectionTitle>{t('day.alive')}</SectionTitle>
        <PlayerGrid players={alive} meId={view.me.id} roleNames={roleNames(view, t)} />
      </section>

      {dead.length > 0 && (
        <section>
          <SectionTitle>{t('common.dead')}</SectionTitle>
          <PlayerGrid players={dead} meId={view.me.id} roleNames={roleNames(view, t)} />
        </section>
      )}
    </Screen>
  );
}
