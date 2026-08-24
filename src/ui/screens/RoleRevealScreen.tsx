import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Card, SectionTitle } from '../components/atoms';
import { RoleCard } from '../components/RoleCard';
import { PhaseTimer } from '../components/PhaseTimer';
import { PlayerGrid } from '../components/PlayerGrid';
import { useGameStore } from '../../store/gameStore';
import type { PlayerView } from '../../game/view';

export function RoleRevealScreen({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  const roleSeen = useGameStore((s) => s.roleSeen);
  const [revealed, setRevealed] = useState(false);

  const teammates = view.players.filter((p) => view.teammates.includes(p.id));
  const waiting = view.players.filter((p) => p.isPlayer && !p.left && !p.ready);

  if (!view.me.isPlayer) {
    // Host yalnız anlatıcı: rol yok, bekleme ekranı.
    return (
      <Screen backdrop="night" title={t('role.title')}>
        <PhaseTimer endsAt={view.phaseEndsAt} totalSeconds={view.settings.roleRevealSeconds} />
        <Card>
          <p className="text-center text-sm text-moon-200/70">{t('role.waitingOthers')}</p>
        </Card>
        <PlayerGrid players={waiting} meId={view.me.id} />
      </Screen>
    );
  }

  if (view.me.ready) {
    return (
      <Screen backdrop="night" title={t('role.title')}>
        <PhaseTimer endsAt={view.phaseEndsAt} totalSeconds={view.settings.roleRevealSeconds} />
        <Card>
          <p className="text-center text-sm text-moon-200/70">{t('role.waitingOthers')}</p>
        </Card>
        <SectionTitle>{t('day.alive')}</SectionTitle>
        <PlayerGrid
          players={view.players.filter((p) => p.isPlayer && !p.left)}
          meId={view.me.id}
          badges={Object.fromEntries(
            view.players.filter((p) => p.ready).map((p) => [p.id, '✓']),
          )}
        />
      </Screen>
    );
  }

  return (
    <Screen
      backdrop="night"
      title={t('role.title')}
      footer={
        revealed ? (
          <button type="button" className="btn-primary" onClick={roleSeen}>
            {t('role.hide')}
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={() => setRevealed(true)}>
            {t('role.reveal')}
          </button>
        )
      }
    >
      <PhaseTimer endsAt={view.phaseEndsAt} totalSeconds={view.settings.roleRevealSeconds} />

      {revealed && view.me.role ? (
        <>
          <RoleCard roleId={view.me.role} />
          {view.me.role === 'vampire' && (
            <section>
              <SectionTitle>{t('role.teammates')}</SectionTitle>
              {teammates.length > 0 ? (
                <PlayerGrid players={teammates} meId={view.me.id} />
              ) : (
                <p className="text-sm text-moon-200/60">{t('role.alone')}</p>
              )}
            </section>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="flex h-56 w-full items-center justify-center rounded-2xl border border-night-600 bg-night-900/80 text-6xl"
        >
          <span aria-hidden="true" className="animate-pulse-slow">
            🎴
          </span>
        </button>
      )}
    </Screen>
  );
}
