import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Card } from '../components/atoms';
import { PhaseTimer } from '../components/PhaseTimer';
import { PlayerGrid } from '../components/PlayerGrid';
import { NarrationBanner } from '../components/NarrationBanner';
import { useGameStore } from '../../store/gameStore';
import type { PlayerView } from '../../game/view';
import type { PlayerId } from '../../game/types';

export function HunterScreen({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  const hunterShot = useGameStore((s) => s.hunterShot);
  const [selected, setSelected] = useState<PlayerId | null>(null);

  const alive = view.players.filter((p) => p.isPlayer && p.alive && !p.left);

  if (!view.hunter.isMe) {
    return (
      <Screen backdrop="death" title={t('hunter.title')}>
        <PhaseTimer endsAt={view.phaseEndsAt} totalSeconds={view.settings.hunterSeconds} />
        <NarrationBanner log={view.log} lines={2} />
        <Card>
          <p className="text-center text-base">{t('hunter.waiting')}</p>
        </Card>
        <PlayerGrid players={alive} meId={view.me.id} />
      </Screen>
    );
  }

  return (
    <Screen
      backdrop="death"
      title={t('hunter.title')}
      footer={
        <>
          <button
            type="button"
            className="btn-primary"
            disabled={!selected}
            onClick={() => selected && hunterShot(selected)}
          >
            {t('night.confirm')}
          </button>
          <button type="button" className="btn-ghost text-sm" onClick={() => hunterShot(null)}>
            {t('hunter.pass')}
          </button>
        </>
      }
    >
      <PhaseTimer endsAt={view.phaseEndsAt} totalSeconds={view.settings.hunterSeconds} />
      <NarrationBanner log={view.log} lines={2} />
      <Card>
        <p className="text-center text-base font-semibold">{t('hunter.prompt')}</p>
      </Card>
      <PlayerGrid
        players={alive}
        meId={view.me.id}
        selectable={view.hunter.validTargets}
        selected={selected}
        onSelect={setSelected}
      />
    </Screen>
  );
}
