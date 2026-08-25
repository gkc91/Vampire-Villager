import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Card, SectionTitle, Spinner } from '../components/atoms';
import { PlayerGrid } from '../components/PlayerGrid';
import { useGameStore } from '../../store/gameStore';
import type { PlayerView } from '../../game/view';
import { MIN_PLAYERS, suggestedRoles } from '../../game/distribution';
import { RoleSetup } from '../components/RoleSetup';
import { TestRolePicker } from '../components/TestRolePicker';
import { testToolsEnabled } from '../../util/testTools';
import { joinLink } from '../../util/identity';

const BOT_NAMES = ['Ada', 'Boran', 'Ceren', 'Deniz', 'Ege', 'Fikret', 'Gizem', 'Hakan', 'Irmak', 'Jale', 'Kerem'];

export function LobbyScreen({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  const store = useGameStore();
  const [copied, setCopied] = useState(false);

  const players = view.players.filter((p) => !p.left);
  const playing = players.filter((p) => p.isPlayer);
  const everyoneReady = playing.every((p) => p.ready || p.isHost);
  const enoughPlayers = playing.length >= MIN_PLAYERS;
  const canStart = view.me.isHost && enoughPlayers && everyoneReady;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinLink(view.roomId));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const share = async () => {
    const url = joinLink(view.roomId);
    if (navigator.share) {
      try {
        await navigator.share({ title: t('app.title'), text: t('app.tagline'), url });
        return;
      } catch {
        // paylaşım iptal edildi
      }
    }
    void copyLink();
  };

  return (
    <Screen
      backdrop="lobby"
      title={t('lobby.title')}
      subtitle={`${t('lobby.roomCode')}: ${view.roomId}`}
      onBack={() => void store.leave()}
      footer={
        view.me.isHost ? (
          <>
            <button type="button" className="btn-primary" disabled={!canStart} onClick={store.startGame}>
              {t('lobby.start')}
            </button>
            {!enoughPlayers && (
              <p className="text-center text-xs text-moon-200/60">
                {t('lobby.needMorePlayers', { count: MIN_PLAYERS })}
              </p>
            )}
            {enoughPlayers && !everyoneReady && (
              <p className="text-center text-xs text-moon-200/60">{t('lobby.notAllReady')}</p>
            )}
          </>
        ) : (
          <button
            type="button"
            className={view.me.ready ? 'btn-secondary' : 'btn-primary'}
            onClick={() => store.setReady(!view.me.ready)}
          >
            {view.me.ready ? t('lobby.notReady') : t('lobby.ready')}
          </button>
        )
      }
    >
      <Card className="space-y-3">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-moon-200/50">{t('lobby.roomCode')}</p>
          <p className="text-4xl font-black tracking-[0.35em] text-moon-100">{view.roomId}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={() => void copyLink()}>
            {copied ? t('common.copied') : t('common.copy')}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={() => void share()}>
            {t('lobby.share')}
          </button>
        </div>
        <p className="break-all text-center text-[11px] text-moon-200/40">{joinLink(view.roomId)}</p>
      </Card>

      <section>
        <SectionTitle>{t('lobby.players', { count: playing.length })}</SectionTitle>
        <PlayerGrid
          players={players}
          meId={view.me.id}
          badges={Object.fromEntries(
            players.filter((p) => p.ready && !p.isHost).map((p) => [p.id, '✓']),
          )}
        />
        {playing.length < MIN_PLAYERS && (
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-moon-200/50">
            <Spinner />
            <span>{t('lobby.waitingPlayers')}</span>
          </div>
        )}
      </section>

      {view.me.isHost && <HostSettings view={view} />}

      {view.me.isHost && view.me.isPlayer && testToolsEnabled() && <TestRolePicker view={view} />}

      {!view.me.isHost && (
        <p className="text-center text-xs text-moon-200/50">{t('lobby.waitingHost')}</p>
      )}

      <p className="pb-2 text-center text-[11px] text-moon-200/40">{t('lobby.hostDeviceHint')}</p>
    </Screen>
  );
}

function HostSettings({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  const store = useGameStore();
  const botCount = view.players.filter((p) => p.isBot).length;
  const roomFull = view.players.filter((p) => !p.left).length >= view.settings.maxPlayers;

  return (
    <Card className="space-y-4">
      <SectionTitle>{t('lobby.settings')}</SectionTitle>

      <div>
        <p className="mb-2 text-sm text-moon-200/70">{t('lobby.hostRole')}</p>
        <div className="flex gap-2">
          <Choice
            active={view.settings.hostPlays}
            label={t('lobby.hostPlays')}
            onClick={() => store.updateSettings({ hostPlays: true })}
          />
          <Choice
            active={!view.settings.hostPlays}
            label={t('lobby.hostNarrates')}
            onClick={() => store.updateSettings({ hostPlays: false })}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm text-moon-200/70">{t('lobby.discussionTime')}</p>
        <div className="flex gap-2">
          {[120, 180, 300].map((seconds) => (
            <Choice
              key={seconds}
              active={view.settings.discussionSeconds === seconds}
              label={`${seconds / 60}′`}
              onClick={() => store.updateSettings({ discussionSeconds: seconds })}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm text-moon-200/70">
          {t('lobby.playerCount', { count: view.settings.maxPlayers })}
        </p>
        {/* Kaydırmalı denetim: minimum 4, üst sınır yok (03-roles.md). */}
        <input
          type="range"
          min={MIN_PLAYERS}
          max={24}
          step={1}
          value={view.settings.maxPlayers}
          onChange={(e) => store.updateSettings({ maxPlayers: Number(e.target.value) })}
          className="w-full accent-blood-500"
          aria-label={t('lobby.playerCount', { count: view.settings.maxPlayers })}
        />
        <div className="flex justify-between text-[11px] text-moon-200/40">
          <span>{MIN_PLAYERS}</span>
          <span>24</span>
        </div>
      </div>

      <RoleSetup
        roleSetup={
          view.settings.roleSetup.length > 0
            ? view.settings.roleSetup
            : suggestedRoles(Math.max(MIN_PLAYERS, view.players.filter((p) => p.isPlayer && !p.left).length))
        }
        playerCount={view.players.filter((p) => p.isPlayer && !p.left).length}
        onChange={(roleSetup) => store.updateSettings({ roleSetup })}
      />

      {/* Bot her odada eklenebilir: az kişiyle test için. Botlar host
          cihazında çalışır, taşıma katmanından bağımsızdır. */}
      <div className="space-y-2">
        <button
          type="button"
          className="btn-secondary"
          disabled={roomFull}
          onClick={() => store.addBot(BOT_NAMES[botCount % BOT_NAMES.length])}
        >
          <span aria-hidden="true">🤖</span>
          <span>{t('lobby.addBot')}</span>
        </button>
        {botCount > 0 && <p className="text-[11px] text-moon-200/40">{t('lobby.botHint')}</p>}
      </div>
    </Card>
  );
}

function Choice({
  active,
  label,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-40 ${
        active ? 'border-blood-400 bg-blood-500/20' : 'border-night-600 bg-night-800'
      }`}
    >
      {label}
    </button>
  );
}
