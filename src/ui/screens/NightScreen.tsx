import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Card, SectionTitle } from '../components/atoms';
import { PhaseTimer } from '../components/PhaseTimer';
import { PlayerGrid } from '../components/PlayerGrid';
import { NarrationBanner } from '../components/NarrationBanner';
import { PrivateNotes } from '../components/PrivateNotes';
import { NightDebugPanel } from '../components/NightDebugPanel';
import { useGameStore } from '../../store/gameStore';
import type { PlayerView } from '../../game/view';
import type { NightStep, PlayerId } from '../../game/types';

/** Her gece adımının kendi sorusu var (03-roles.md sırası). */
const STEP_PROMPT: Record<NightStep, string> = {
  lord: 'night.lordPrompt',
  bloodWizard: 'night.sealPrompt',
  mist: 'night.mistPrompt',
  vampireVote: 'night.vampirePrompt',
  doctor: 'night.doctorPrompt',
  seer: 'night.seerPrompt',
  detective: 'night.detectivePrompt',
  thief: 'night.thiefPrompt',
};

export function NightScreen({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  const nightAction = useGameStore((s) => s.nightAction);
  const [selected, setSelected] = useState<PlayerId | null>(null);

  const alive = view.players.filter((p) => p.isPlayer && p.alive && !p.left);
  const step = view.nightStep;
  const promptKey = step ? STEP_PROMPT[step] : null;
  const acting = view.nightAction.canAct && promptKey !== null;

  const teamPicks: Record<PlayerId, string> = {};
  for (const [voterId, targetId] of Object.entries(view.vampirePicks)) {
    if (voterId === view.me.id) continue;
    const voter = view.players.find((p) => p.id === voterId);
    teamPicks[targetId] = voter ? voter.name.slice(0, 6) : '🧛';
  }

  const submit = (targetId: PlayerId | null) => {
    nightAction(targetId);
    setSelected(null);
  };

  return (
    <Screen
      backdrop="night"
      title={t('night.title', { count: view.round })}
      footer={
        acting ? (
          <>
            {view.nightAction.selfCast ? (
              <button type="button" className="btn-primary" onClick={() => submit(view.me.id)}>
                {t('night.mistConfirm')}
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                disabled={!selected}
                onClick={() => selected && submit(selected)}
              >
                {t('night.confirm')}
              </button>
            )}
            <button type="button" className="btn-ghost text-sm" onClick={() => submit(null)}>
              {t('night.pass')}
            </button>
          </>
        ) : undefined
      }
    >
      <PhaseTimer endsAt={view.phaseEndsAt} totalSeconds={view.settings.nightStepSeconds} />
      <NarrationBanner log={view.log} />

      {view.me.ghost && <GhostNote view={view} />}

      {acting && promptKey ? (
        <>
          <Card>
            <p className="text-center text-base font-semibold">{t(promptKey)}</p>
            {view.me.usesLeft !== null && (
              <p className="mt-1 text-center text-xs text-moon-200/60">
                {t('night.usesLeft', { count: view.me.usesLeft })}
              </p>
            )}
            {step === 'doctor' && (
              <p className="mt-1 text-center text-xs text-moon-200/50">
                {t('night.doctorRepeatBlocked')}
              </p>
            )}
          </Card>
          {!view.nightAction.selfCast && (
            <PlayerGrid
              players={alive}
              meId={view.me.id}
              selectable={view.nightAction.validTargets}
              selected={selected}
              onSelect={setSelected}
              badges={teamPicks}
            />
          )}
        </>
      ) : (
        <Card>
          <p className="text-center text-base">
            {view.nightAction.submitted ? t('night.locked') : t('night.sleeping')}
          </p>
          <p className="mt-1 text-center text-xs text-moon-200/50">{t('night.waitingOthers')}</p>
        </Card>
      )}

      <PrivateNotes view={view} />
      <NightDebugPanel view={view} />

      {!acting && (
        <section>
          <SectionTitle>{t('day.alive')}</SectionTitle>
          <PlayerGrid players={alive} meId={view.me.id} roleNames={roleNames(view, t)} />
        </section>
      )}
    </Screen>
  );
}

export function GhostNote({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  if (!view.me.ghost || view.phase === 'GAME_END') return null;
  return (
    <p className="rounded-xl border border-night-600 bg-night-800/60 px-3 py-2 text-center text-xs text-moon-200/70">
      {t('ghost.banner')}
    </p>
  );
}

/** Hayalet modunda / oyun sonunda rol adlarını listede göster. */
export function roleNames(
  view: PlayerView,
  t: (key: string) => string,
): Record<PlayerId, string> | undefined {
  if (!view.allRoles) return undefined;
  return Object.fromEntries(
    Object.entries(view.allRoles).map(([id, roleId]) => [id, t(`roles:${roleId}.name`)]),
  );
}
