import { useEffect, useRef, useState } from 'react';
import { playSfx } from '../../audio/audioManager';

/** Faz sayacı. Son 10 sn'de kalp atışı (asset yoksa sessiz). */
export function PhaseTimer({ endsAt, totalSeconds }: { endsAt: number | null; totalSeconds: number }) {
  const [remaining, setRemaining] = useState(() => secondsLeft(endsAt));
  const heartbeatAt = useRef<number | null>(null);

  useEffect(() => {
    setRemaining(secondsLeft(endsAt));
    if (endsAt === null) return;
    const id = setInterval(() => setRemaining(secondsLeft(endsAt)), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  useEffect(() => {
    if (remaining > 10 || remaining <= 0) return;
    if (heartbeatAt.current === remaining) return;
    heartbeatAt.current = remaining;
    playSfx('heartbeat');
  }, [remaining]);

  if (endsAt === null) return null;

  const ratio = totalSeconds > 0 ? Math.max(0, Math.min(1, remaining / totalSeconds)) : 0;
  const urgent = remaining <= 10;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs tabular-nums text-moon-200/70">
        <span aria-hidden="true">⏳</span>
        <span className={urgent ? 'font-bold text-blood-300' : ''}>{formatClock(remaining)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-night-800">
        <div
          className={`timer-bar h-full rounded-full ${urgent ? 'bg-blood-400' : 'bg-moon-200/70'}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

function secondsLeft(endsAt: number | null): number {
  if (endsAt === null) return 0;
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
