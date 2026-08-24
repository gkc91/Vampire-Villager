import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Card, SectionTitle } from '../components/atoms';
import { PhaseTimer } from '../components/PhaseTimer';
import { PlayerGrid } from '../components/PlayerGrid';
import { NarrationBanner } from '../components/NarrationBanner';
import { useGameStore } from '../../store/gameStore';
import type { PlayerView } from '../../game/view';
import type { PlayerId, RoleId } from '../../game/types';

const PROMPT_KEY: Partial<Record<RoleId, string>> = {
  vampire: 'night.vampirePrompt',
  seer: 'night.seerPrompt',
  doctor: 'night.doctorPrompt',
};

export function NightScreen({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  const nightAction = useGameStore((s) => s.nightAction);
  const [selected, setSelected] = useState<PlayerId | null>(null);

  const alive = view.players.filter((p) => p.isPlayer && !p.left);
  const roleId = view.nightAction.roleId;
  const promptKey = roleId ? PROMPT_KEY[roleId] : undefined;

  const teamPicks: Record<PlayerId, string> = {};
  for (const [voterId, targetId] of Object.entries(view.vampirePicks)) {
    if (voterId === view.me.id) continue;
    const voter = view.players.find((p) => p.id === voterId);
    teamPicks[targetId] = voter ? voter.name.slice(0, 6) : '🧛';
  }

  const showTargetPicker = view.nightAction.canAct && Boolean(promptKey);

  const submit = () => {
    if (!selected) return;
    nightAction(selected);
    setSelected(null);
  };

  return (
    <Screen
      backdrop="night"
      title={t('night.title', { count: view.round })}
      footer={
        view.nightAction.canAct ? (
          <>
            <button type="button" className="btn-primary" disabled={!selected} onClick={submit}>
              {t('night.confirm')}
            </button>
            <button type="button" className="btn-ghost text-sm" onClick={() => nightAction(null)}>
              {t('night.pass')}
            </button>
          </>
        ) : undefined
      }
    >
      <PhaseTimer endsAt={view.phaseEndsAt} totalSeconds={view.settings.nightSeconds} />
      <NarrationBanner log={view.log} />

      {view.me.ghost && <GhostNote view={view} />}

      {showTargetPicker ? (
        <>
          <Card>
            <p className="text-center text-base font-semibold">
              {t(promptKey ?? 'night.chooseTarget')}
            </p>
            {roleId === 'doctor' && (
              <p className="mt-1 text-center text-xs text-moon-200/50">
                {t('night.doctorRepeatBlocked')}
              </p>
            )}
          </Card>
          <PlayerGrid
            players={alive}
            meId={view.me.id}
            selectable={view.nightAction.validTargets}
            selected={selected}
            onSelect={setSelected}
            badges={teamPicks}
          />
        </>
      ) : (
        <Card>
          <p className="text-center text-base">
            {view.nightAction.submitted ? t('night.locked') : t('night.sleeping')}
          </p>
          <p className="mt-1 text-center text-xs text-moon-200/50">{t('night.waitingOthers')}</p>
        </Card>
      )}

      <SeerNotes view={view} />

      {/* Seçim ızgarası zaten listeyi gösteriyor; iki kez basmayalım. */}
      {!showTargetPicker && (
        <section>
          <SectionTitle>{t('day.alive')}</SectionTitle>
          <PlayerGrid
            players={alive}
            meId={view.me.id}
            badges={Object.fromEntries(
              alive.filter((p) => p.hasActed).map((p) => [p.id, '✓']),
            )}
            roleNames={roleNames(view, t)}
          />
        </section>
      )}
    </Screen>
  );
}

function SeerNotes({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  if (view.seerResults.length === 0) return null;
  return (
    <section>
      <SectionTitle>{t('roles:seer.name')}</SectionTitle>
      <ul className="space-y-1">
        {view.seerResults.map((result) => {
          const target = view.players.find((p) => p.id === result.targetId);
          return (
            <li
              key={`${result.round}-${result.targetId}`}
              className={`rounded-lg border px-3 py-2 text-sm ${
                result.isVampire
                  ? 'border-blood-500/50 bg-blood-500/10 text-blood-300'
                  : 'border-night-600 bg-night-900/70 text-moon-200/80'
              }`}
            >
              {t(result.isVampire ? 'night.seerResultVampire' : 'night.seerResultClean', {
                name: target?.name ?? '',
              })}
            </li>
          );
        })}
      </ul>
    </section>
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
  const source = view.allRoles;
  if (!source) {
    const revealed: Record<PlayerId, string> = {};
    for (const p of view.players) {
      if (p.role) revealed[p.id] = t(`roles:${p.role}.name`);
    }
    return Object.keys(revealed).length > 0 ? revealed : undefined;
  }
  return Object.fromEntries(
    Object.entries(source).map(([id, roleId]) => [id, t(`roles:${roleId}.name`)]),
  );
}
