import { useState, type ReactNode } from 'react';
import { initials } from '../../util/identity';
import type { PublicPlayer } from '../../game/view';

/** Asset yoksa placeholder gösteren görsel (CLAUDE.md #8). */
export function AssetImage({
  src,
  alt,
  className,
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

export function Avatar({
  player,
  size = 'md',
  dimmed,
}: {
  player: Pick<PublicPlayer, 'name' | 'color' | 'alive' | 'left'>;
  size?: 'sm' | 'md' | 'lg';
  dimmed?: boolean;
}) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-16 w-16 text-lg',
  } as const;
  const dead = !player.alive || player.left;
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-moon-100 ring-2 ring-night-700 ${sizes[size]} ${
        dead || dimmed ? 'opacity-40 grayscale' : ''
      }`}
      style={{ backgroundColor: player.color }}
      aria-hidden="true"
    >
      {initials(player.name)}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className ?? ''}`}>{children}</div>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-moon-200/60">
      {children}
    </h2>
  );
}

export function Spinner() {
  return (
    <div
      className="h-5 w-5 animate-spin rounded-full border-2 border-moon-200/30 border-t-moon-100"
      aria-hidden="true"
    />
  );
}
