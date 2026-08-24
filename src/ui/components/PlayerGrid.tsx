import { useTranslation } from 'react-i18next';
import type { PublicPlayer } from '../../game/view';
import type { PlayerId } from '../../game/types';
import { Avatar } from './atoms';

interface Props {
  players: PublicPlayer[];
  meId: PlayerId;
  selectable?: PlayerId[];
  selected?: PlayerId | null;
  onSelect?: (id: PlayerId) => void;
  /** Rol adı gösterilecek oyuncular (hayalet modu / oyun sonu). */
  roleNames?: Record<PlayerId, string>;
  /** Sağ üstte küçük rozet (oy sayısı, "seçti" işareti…). */
  badges?: Record<PlayerId, string>;
}

export function PlayerGrid({
  players,
  meId,
  selectable,
  selected,
  onSelect,
  roleNames,
  badges,
}: Props) {
  const { t } = useTranslation();

  return (
    <ul className="grid grid-cols-2 gap-2">
      {players.map((player) => {
        const canPick = Boolean(selectable?.includes(player.id) && onSelect);
        const isSelected = selected === player.id;
        const dead = !player.alive || player.left;

        return (
          <li key={player.id}>
            <button
              type="button"
              disabled={!canPick}
              onClick={() => onSelect?.(player.id)}
              className={`flex w-full items-center gap-2 rounded-xl border p-2 text-left transition ${
                isSelected
                  ? 'border-blood-400 bg-blood-500/20'
                  : 'border-night-600/70 bg-night-900/70'
              } ${canPick ? 'active:scale-[0.98]' : 'cursor-default'} ${dead ? 'opacity-60' : ''}`}
            >
              <Avatar player={player} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1">
                  <span className="truncate text-sm font-semibold">{player.name}</span>
                  {player.id === meId && (
                    <span className="text-[10px] text-moon-200/60">({t('common.you')})</span>
                  )}
                </span>
                <span className="flex flex-wrap items-center gap-1 text-[10px] text-moon-200/60">
                  {player.isHost && <span>{t('common.host')}</span>}
                  {!player.connected && !dead && <span>{t('common.offline')}</span>}
                  {player.left && <span>{t('common.left')}</span>}
                  {!player.alive && !player.left && <span>{t('common.dead')}</span>}
                  {roleNames?.[player.id] && (
                    <span className="text-moon-200/90">{roleNames[player.id]}</span>
                  )}
                </span>
              </span>
              {badges?.[player.id] && (
                <span className="chip shrink-0 text-[10px]">{badges[player.id]}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
