import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Card } from '../components/atoms';
import { ConnectionInfo } from '../components/ConnectionInfo';
import { useGameStore } from '../../store/gameStore';
import {
  getSavedName,
  isValidRoomCode,
  normalizeRoomCode,
  roomFromLocation,
} from '../../util/identity';
import { unlockAudio } from '../../audio/audioManager';

export function HomeScreen() {
  const { t } = useTranslation();
  const createRoom = useGameStore((s) => s.createRoom);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const errorKey = useGameStore((s) => s.errorKey);

  const [name, setName] = useState(getSavedName);
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () => {
      const fromLink = roomFromLocation();
      if (fromLink) setCode(fromLink);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const guardName = (): boolean => {
    if (name.trim().length < 2) {
      setLocalError('home.nameRequired');
      return false;
    }
    setLocalError(null);
    return true;
  };

  const onCreate = async (solo: boolean) => {
    if (!guardName() || busy) return;
    unlockAudio();
    setBusy(true);
    try {
      await createRoom(name.trim(), solo);
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async () => {
    if (!guardName() || busy) return;
    if (!isValidRoomCode(code)) {
      setLocalError('home.codeRequired');
      return;
    }
    unlockAudio();
    setBusy(true);
    try {
      await joinRoom(code, name.trim());
    } finally {
      setBusy(false);
    }
  };

  const shownError = localError ?? errorKey;

  return (
    <Screen backdrop="lobby" title={t('app.title')} subtitle={t('app.tagline')}>
      <Card className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm text-moon-200/70">{t('home.nameLabel')}</span>
          <input
            className="input"
            value={name}
            maxLength={20}
            placeholder={t('home.namePlaceholder')}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <button type="button" className="btn-primary" disabled={busy} onClick={() => void onCreate(false)}>
          {t('home.create')}
        </button>
      </Card>

      <Card className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm text-moon-200/70">{t('home.codeLabel')}</span>
          <input
            className="input text-center text-xl font-bold uppercase tracking-[0.3em]"
            value={code}
            maxLength={6}
            inputMode="text"
            autoCapitalize="characters"
            placeholder={t('home.codePlaceholder')}
            onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
          />
        </label>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void onJoin()}>
          {t('home.join')}
        </button>
      </Card>

      {shownError && (
        <p className="rounded-xl border border-blood-500/50 bg-blood-500/10 px-4 py-3 text-center text-sm text-blood-300">
          {t(shownError)}
        </p>
      )}

      <button
        type="button"
        className="btn-secondary"
        onClick={() => useGameStore.getState().openHotseat()}
      >
        {t('hotseat.title')}
      </button>
      <p className="text-center text-xs text-moon-200/40">{t('hotseat.subtitle')}</p>

      <button type="button" className="btn-ghost text-sm" onClick={() => void onCreate(true)}>
        {t('home.solo')}
      </button>
      <p className="text-center text-xs text-moon-200/40">{t('home.soloHint')}</p>

      {/* Bağlanma sorunlarında iki cihazın satırlarını karşılaştırmak için. */}
      <div className="pb-4">
        <ConnectionInfo open={Boolean(shownError)} />
      </div>
    </Screen>
  );
}
