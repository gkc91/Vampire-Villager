import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Card, SectionTitle } from '../components/atoms';
import { PhaseTimer } from '../components/PhaseTimer';
import { PlayerGrid } from '../components/PlayerGrid';
import { NarrationBanner } from '../components/NarrationBanner';
import { GhostNote, roleNames } from './NightScreen';
import { PrivateNotes } from '../components/PrivateNotes';
import { NightDebugPanel } from '../components/NightDebugPanel';
import { useGameStore } from '../../store/gameStore';
import type { PlayerView } from '../../game/view';
import type { PlayerId } from '../../game/types';

export function DayScreen({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  // Elden ele: ortak ekranda masa görünümü var, kurucu bayrağı düşük
  // kalıyor. Bu düğmeler orada masanın ortak kararı olarak durmalı.
  const endDiscussion = useGameStore((s) => s.endDiscussion);
  const castSpell = useGameStore((s) => s.castSpell);
  const [spellTarget, setSpellTarget] = useState<PlayerId | null>(null);

  const alive = view.players.filter((p) => p.isPlayer && p.alive && !p.left);
  const dead = view.players.filter((p) => p.isPlayer && (!p.alive || p.left));

  return (
    <Screen
      backdrop="day"
      title={t('day.title', { count: view.round })}
      subtitle={t('day.discussion')}
      footer={
        <>
          {view.spell.canCast && (
            <button
              type="button"
              className="btn-primary"
              disabled={!spellTarget}
              onClick={() => spellTarget && castSpell(spellTarget)}
            >
              {t('day.castSpell')}
            </button>
          )}
          {view.me.isHost && (
            <button type="button" className="btn-secondary" onClick={endDiscussion}>
              {t('day.endEarly')}
            </button>
          )}
        </>
      }
    >
      <PhaseTimer endsAt={view.phaseEndsAt} totalSeconds={view.settings.discussionSeconds} />
      <NarrationBanner log={view.log} lines={2} />
      <GhostNote view={view} />
      <PrivateNotes view={view} />
      <NightDebugPanel view={view} />

      {view.spell.castToday && (
        <Card className="border-moon-200/40">
          <p className="text-center text-sm">{t('day.spellCastBanner')}</p>
        </Card>
      )}

      <Card>
        <p className="text-center text-sm text-moon-200/70">{t('day.hint')}</p>
      </Card>

      {view.spell.canCast && (
        <section>
          <SectionTitle>{t('day.spellTarget')}</SectionTitle>
          <PlayerGrid
            players={alive}
            meId={view.me.id}
            selectable={view.spell.validTargets}
            selected={spellTarget}
            onSelect={setSpellTarget}
          />
        </section>
      )}

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
