import type { NarrationEvent } from '../../game/types';
import { useNarrationText } from '../useNarration';

/** Moderatör anlatım bandı — metinler yalnız i18n anahtarlarından gelir. */
export function NarrationBanner({ log, lines = 1 }: { log: NarrationEvent[]; lines?: number }) {
  const toText = useNarrationText();
  const events = log.slice(-lines);
  if (events.length === 0) return null;

  return (
    <div className="animate-fade-up rounded-xl border border-night-600/60 bg-night-900/70 px-4 py-3 text-center">
      {events.map((event, i) => (
        <p
          key={`${event.at}-${event.key}-${i}`}
          className={`text-balance leading-snug ${
            i === events.length - 1 ? 'text-moon-100' : 'text-moon-200/50'
          } ${i === events.length - 1 ? 'text-base' : 'text-sm'}`}
        >
          {toText(event)}
        </p>
      ))}
    </div>
  );
}

/** Uzun anlatım listesi (oyun sonu özeti). */
export function NarrationList({ log }: { log: NarrationEvent[] }) {
  const toText = useNarrationText();
  return (
    <ol className="space-y-1 text-sm text-moon-200/80">
      {log.map((event, i) => (
        <li key={`${event.at}-${i}`} className="flex gap-2">
          <span className="shrink-0 tabular-nums text-moon-200/40">{event.round || '·'}</span>
          <span>{toText(event)}</span>
        </li>
      ))}
    </ol>
  );
}
