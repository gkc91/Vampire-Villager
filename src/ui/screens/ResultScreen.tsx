import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Card, SectionTitle, Spinner } from '../components/atoms';
import { PlayerGrid } from '../components/PlayerGrid';
import { NarrationList } from '../components/NarrationBanner';
import { useGameStore } from '../../store/gameStore';
import { showPreResultAd } from '../../monetization/adGate';
import { playMusic } from '../../audio/audioManager';
import type { PlayerView } from '../../game/view';

export function ResultScreen({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  // Elden ele: ortak ekranda masa görünümü var, kurucu bayrağı düşük
  // kalıyor. Bu düğmeler orada masanın ortak kararı olarak durmalı.
  const store = useGameStore();
  const [ready, setReady] = useState(false);

  // 05-monetization.md: kazanan açıklanmadan ÖNCEKİ reklam noktası.
  useEffect(() => {
    let cancelled = false;
    void showPreResultAd().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !view.winner) return;
    playMusic(view.winner === 'village' ? 'win_village' : 'win_vampires');
  }, [ready, view.winner]);

  if (!ready) {
    return (
      <Screen backdrop="death" title={t('app.title')}>
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <Spinner />
          <p className="text-sm text-moon-200/70">{t('result.preparing')}</p>
        </div>
      </Screen>
    );
  }

  const villageWon = view.winner === 'village';
  const players = view.players.filter((p) => p.isPlayer);

  return (
    <Screen
      backdrop="death"
      title={t('result.roles')}
      footer={
        <>
          {view.me.isHost && (
            <button type="button" className="btn-primary" onClick={store.restart}>
              {t('result.playAgain')}
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={() => void store.leave()}>
            {t('result.backHome')}
          </button>
        </>
      }
    >
      <Card className={villageWon ? 'border-moon-200/40' : 'border-blood-500/60'}>
        <p className="text-center text-5xl" aria-hidden="true">
          {villageWon ? '🌅' : '🩸'}
        </p>
        <h2 className="mt-2 text-center text-2xl font-black">
          {villageWon ? t('result.winVillage') : t('result.winVampires')}
        </h2>
      </Card>

      <section>
        <SectionTitle>{t('result.roles')}</SectionTitle>
        <PlayerGrid
          players={players}
          meId={view.me.id}
          roleNames={Object.fromEntries(
            Object.entries(view.allRoles ?? {}).map(([id, roleId]) => [
              id,
              t(`roles:${roleId}.name`),
            ]),
          )}
        />
      </section>

      <section className="pb-4">
        <SectionTitle>{t('result.timeline')}</SectionTitle>
        <Card>
          <NarrationList log={view.log} />
        </Card>
      </section>
    </Screen>
  );
}
