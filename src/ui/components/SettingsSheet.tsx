import { useTranslation } from 'react-i18next';
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, setLanguage, type Language } from '../../i18n';
import { useSettingsStore } from '../../store/settingsStore';
import { setMusicEnabled, setSfxEnabled } from '../../audio/audioManager';
import { isTtsSupported, stopSpeaking } from '../../audio/tts';
import { ConnectionDiagnostics } from './ConnectionDiagnostics';
import { ConnectionInfo } from './ConnectionInfo';
import { useGameStore } from '../../store/gameStore';

/** Cihaz ayarları: dil, müzik, SFX, sesli anlatıcı. */
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const settings = useSettingsStore();
  const inRoom = useGameStore((s) => s.screen === 'game' && !s.solo);

  const toggle = (key: 'music' | 'sfx' | 'tts') => {
    const next = !settings[key];
    settings.set({ [key]: next });
    if (key === 'music') setMusicEnabled(next);
    if (key === 'sfx') setSfxEnabled(next);
    if (key === 'tts' && !next) stopSpeaking();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl border-t border-night-600 bg-night-900 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-night-600" aria-hidden="true" />
        <h2 className="mb-4 text-lg font-bold">{t('settings.title')}</h2>

        <div className="mb-4">
          <p className="mb-2 text-sm text-moon-200/70">{t('settings.language')}</p>
          <div className="flex gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang as Language)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${
                  i18n.language.startsWith(lang)
                    ? 'border-blood-400 bg-blood-500/20'
                    : 'border-night-600 bg-night-800'
                }`}
              >
                {LANGUAGE_LABELS[lang]}
              </button>
            ))}
          </div>
        </div>

        <ul className="space-y-2">
          <ToggleRow label={t('settings.music')} on={settings.music} onClick={() => toggle('music')} />
          <ToggleRow label={t('settings.sfx')} on={settings.sfx} onClick={() => toggle('sfx')} />
          {isTtsSupported() && (
            <ToggleRow
              label={t('settings.tts')}
              hint={t('settings.ttsHint')}
              on={settings.tts}
              onClick={() => toggle('tts')}
            />
          )}
        </ul>

        {inRoom && (
          <div className="mt-4">
            <p className="mb-2 text-sm text-moon-200/70">{t('connect.title')}</p>
            <ConnectionDiagnostics />
          </div>
        )}

        {/* Ana ekrandan buraya taşındı; odada olsun olmasın erişilebilir. */}
        <div className="mt-4">
          <ConnectionInfo />
        </div>

        <button type="button" className="btn-secondary mt-5" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  on,
  onClick,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-night-600 bg-night-800/70 px-4 py-3 text-left"
        aria-pressed={on}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{label}</span>
          {hint && <span className="block text-xs text-moon-200/50">{hint}</span>}
        </span>
        <span
          className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition ${on ? 'bg-blood-500' : 'bg-night-600'}`}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-moon-100 transition ${on ? 'translate-x-5' : ''}`}
          />
        </span>
      </button>
    </li>
  );
}
