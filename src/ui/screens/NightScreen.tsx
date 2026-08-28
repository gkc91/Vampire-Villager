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
  const nightPreview = useGameStore((s) => s.nightPreview);
  const hotseatReview = useGameStore((s) => s.hotseatReview);
  const endHotseatTurn = useGameStore((s) => s.endHotseatTurn);
  const [selected, setSelected] = useState<PlayerId | null>(null);

  // Elden elede sonucuna bakan oyuncu: seçim ekranı değil, özet ekranı.
  const reviewing = hotseatReview !== null && hotseatReview === view.me.id;

  const alive = view.players.filter((p) => p.isPlayer && p.alive && !p.left);
  const step = view.nightStep;
  const promptKey = step ? STEP_PROMPT[step] : null;
  const acting = view.nightAction.canAct && promptKey !== null;

  // Aynı adımı oynayanların seçimleri. Onaylanmış olan ✓ ile, henüz
  // dokunulmuş olan soluk gösterilir — masadaki "şuna mı basayım?" anı.
  const teamPicks: Record<PlayerId, string> = {};
  for (const peer of view.nightAction.peers) {
    if (!peer.pick) continue;
    const etiket = peer.name.slice(0, 6) + (peer.acted ? ' ✓' : '…');
    teamPicks[peer.pick] = teamPicks[peer.pick] ? teamPicks[peer.pick] + ', ' + etiket : etiket;
  }

  const submit = (targetId: PlayerId | null) => {
    nightAction(targetId);
    setSelected(null);
  };

  /** Dokunuş anında duyur: takım arkadaşı neye baktığımı görsün. */
  const pick = (targetId: PlayerId) => {
    setSelected(targetId);
    nightPreview(targetId);
  };

  return (
    <Screen
      backdrop="night"
      title={t('night.title', { count: view.round })}
      footer={
        reviewing ? (
          <button type="button" className="btn-primary" onClick={endHotseatTurn}>
            {t('hotseat.seenPass')}
          </button>
        ) : acting ? (
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

      {reviewing ? (
        <Card>
          <p className="text-center text-base font-semibold">{t('hotseat.yourResult')}</p>
          <p className="mt-1 text-center text-xs text-moon-200/60">{t('hotseat.seenHint')}</p>
        </Card>
      ) : acting && promptKey ? (
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
              onSelect={pick}
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

      {view.nightAction.peers.length > 0 && (
        <section>
          <SectionTitle>{t('night.withYou')}</SectionTitle>
          <ul className="space-y-1">
            {view.nightAction.peers.map((peer) => (
              <li
                key={peer.id}
                className="flex items-center justify-between rounded-lg border border-night-600/60 bg-night-900/60 px-3 py-2 text-sm"
              >
                <span>{peer.name}</span>
                <span className="text-xs text-moon-200/60">
                  {peer.acted
                    ? '✓ ' + t('night.peerActed')
                    : peer.pick
                      ? '… ' + t('night.peerChoosing')
                      : t('night.peerWaiting')}
                </span>
              </li>
            ))}
          </ul>
        </section>
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
