import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Card, SectionTitle } from '../components/atoms';
import { PhaseTimer } from '../components/PhaseTimer';
import { PlayerGrid } from '../components/PlayerGrid';
import { NarrationBanner } from '../components/NarrationBanner';
import { GhostNote, roleNames } from './NightScreen';
import { useGameStore } from '../../store/gameStore';
import type { PlayerView } from '../../game/view';
import type { PlayerId } from '../../game/types';

function voteBadges(view: PlayerView): Record<PlayerId, string> {
  const badges: Record<PlayerId, string> = {};
  for (const player of view.players) {
    if (player.hasVoted) badges[player.id] = '✓';
  }
  for (const [id, count] of Object.entries(view.vote.tally ?? {})) {
    badges[id] = String(count);
  }
  return badges;
}

export function VoteScreen({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  const vote = useGameStore((s) => s.vote);
  const [selected, setSelected] = useState<PlayerId | null>(null);

  const alive = view.players.filter((p) => p.isPlayer && p.alive && !p.left);
  // Kendine oy vermek serbest (taktik blöf).
  const votable = alive.map((p) => p.id);

  return (
    <Screen
      backdrop="day"
      title={t('vote.title')}
      footer={
        view.vote.canVote ? (
          <>
            <button
              type="button"
              className="btn-primary"
              disabled={!selected}
              onClick={() => selected && vote(selected)}
            >
              {t('vote.confirm')}
            </button>
            <button type="button" className="btn-ghost text-sm" onClick={() => vote('abstain')}>
              {t('vote.abstain')}
            </button>
          </>
        ) : undefined
      }
    >
      <PhaseTimer endsAt={view.phaseEndsAt} totalSeconds={view.settings.voteSeconds} />
      <NarrationBanner log={view.log} />
      <GhostNote view={view} />

      <Card>
        <p className="text-center text-base font-semibold">
          {view.vote.canVote ? t('vote.prompt') : t('vote.locked')}
        </p>
        {!view.vote.canVote && (
          <p className="mt-1 text-center text-xs text-moon-200/50">{t('vote.waitingOthers')}</p>
        )}
      </Card>

      <section>
        <SectionTitle>{t('day.alive')}</SectionTitle>
        <PlayerGrid
          players={alive}
          meId={view.me.id}
          selectable={view.vote.canVote ? votable : []}
          selected={selected}
          onSelect={setSelected}
          roleNames={roleNames(view, t)}
          badges={voteBadges(view)}
        />
      </section>
    </Screen>
  );
}
