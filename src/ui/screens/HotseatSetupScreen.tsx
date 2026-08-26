import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Card } from '../components/atoms';
import { MIN_PLAYERS } from '../../game/distribution';
import { useGameStore } from '../../store/gameStore';

/**
 * Elden ele kurulumu: tek cihazda oynayacak kişilerin adları.
 *
 * Ağ yok, oda kodu yok, katılma bekleme yok — masadaki herkesi buraya
 * yazıp başlıyorsun.
 */
export function HotseatSetupScreen() {
  const { t } = useTranslation();
  const startHotseat = useGameStore((s) => s.startHotseat);
  const goHome = useGameStore((s) => s.leave);
  const [names, setNames] = useState<string[]>(['', '', '', '']);
  const [busy, setBusy] = useState(false);

  const filled = names.map((n) => n.trim()).filter(Boolean);
  const ready = filled.length >= MIN_PLAYERS;

  const setName = (index: number, value: string) => {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const start = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      // Boş satırlar atlanır; sıralama masadaki oturma düzeni olur.
      await startHotseat(filled);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      backdrop="lobby"
      title={t('hotseat.title')}
      subtitle={t('hotseat.subtitle')}
      onBack={() => void goHome()}
      footer={
        <button type="button" className="btn-primary" disabled={!ready || busy} onClick={() => void start()}>
          {ready ? t('hotseat.start') : t('hotseat.needMore', { count: MIN_PLAYERS })}
        </button>
      }
    >
      <Card className="space-y-2">
        <p className="text-sm text-moon-200/60">{t('hotseat.hint')}</p>
      </Card>

      <div className="space-y-2">
        {names.map((name, i) => (
          <input
            key={i}
            className="input"
            value={name}
            maxLength={20}
            placeholder={`${t('hotseat.playerName')} ${i + 1}`}
            onChange={(e) => setName(i, e.target.value)}
          />
        ))}
      </div>

      {names.length < 12 && (
        <button
          type="button"
          className="btn-ghost text-sm"
          onClick={() => setNames((prev) => [...prev, ''])}
        >
          + {t('hotseat.addPlayer')}
        </button>
      )}
    </Screen>
  );
}
