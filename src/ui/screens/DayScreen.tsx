import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Card, SectionTitle } from '../components/atoms';
import { PhaseTimer } from '../components/PhaseTimer';
import { PlayerGrid } from '../components/PlayerGrid';
import { NarrationBanner } from '../components/NarrationBanner';
import { GhostNote, roleNames } from './NightScreen';
import { useGameStore } from '../../store/gameStore';
import type { PlayerView } from '../../game/view';

export function DayScreen({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  const endDiscussion = useGameStore((s) => s.endDiscussion);

  const alive = view.players.filter((p) => p.isPlayer && p.alive && !p.left);
  const dead = view.players.filter((p) => p.isPlayer && (!p.alive || p.left));

  return (
    <Screen
      backdrop="day"
      title={t('day.title', { count: view.round })}
      subtitle={t('day.discussion')}
      footer={
        view.me.isHost ? (
          <button type="button" className="btn-secondary" onClick={endDiscussion}>
            {t('day.endEarly')}
          </button>
        ) : undefined
      }
    >
      <PhaseTimer endsAt={view.phaseEndsAt} totalSeconds={view.settings.discussionSeconds} />
      <NarrationBanner log={view.log} lines={2} />
      <GhostNote view={view} />

      <Card>
        <p className="text-center text-sm text-moon-200/70">{t('day.hint')}</p>
      </Card>

      <section>
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
