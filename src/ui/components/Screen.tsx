import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Phase } from '../../game/types';
import { SettingsSheet } from './SettingsSheet';

type Backdrop = 'lobby' | 'night' | 'day' | 'death';

export function backdropFor(phase: Phase | 'home'): Backdrop {
  switch (phase) {
    case 'home':
    case 'LOBBY':
      return 'lobby';
    case 'ROLE_REVEAL':
    case 'NIGHT':
    case 'NIGHT_RESULT':
      return 'night';
    case 'DAY_DISCUSSION':
    case 'VOTE':
    case 'VOTE_RESULT':
      return 'day';
    default:
      return 'death';
  }
}

const OVERLAY: Record<Backdrop, string> = {
  lobby: 'from-night-950/70 via-night-950/85 to-night-950',
  night: 'from-night-950/60 via-night-950/85 to-night-950',
  day: 'from-night-800/50 via-night-950/85 to-night-950',
  death: 'from-blood-500/20 via-night-950/90 to-night-950',
};

/** Mobil öncelikli ekran kabuğu: arka plan + üst bar + kaydırılabilir gövde. */
export function Screen({
  backdrop,
  title,
  subtitle,
  children,
  footer,
  onBack,
}: {
  backdrop: Backdrop;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
}) {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}assets/bg/${backdrop}.webp)` }}
        aria-hidden="true"
      />
      <div className={`absolute inset-0 bg-gradient-to-b ${OVERLAY[backdrop]}`} aria-hidden="true" />

      <div className="relative h-full">
        <div className="app-frame">
          <header className="flex items-center justify-between gap-2 py-3">
            <div className="flex min-w-0 items-center gap-2">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-lg px-2 py-1 text-moon-200/70"
                  aria-label={t('common.back')}
                >
                  <span aria-hidden="true">←</span>
                </button>
              )}
              <div className="min-w-0">
                {title && <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>}
                {subtitle && (
                  <p className="truncate text-xs text-moon-200/60">{subtitle}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rounded-lg px-2 py-1 text-moon-200/70"
              aria-label={t('settings.title')}
            >
              <span aria-hidden="true">⚙️</span>
            </button>
          </header>

          <main className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-3">{children}</main>

          {footer && <div className="space-y-2 pb-3 pt-2">{footer}</div>}
        </div>
      </div>

      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
