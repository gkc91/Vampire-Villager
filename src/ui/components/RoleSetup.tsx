import { useTranslation } from 'react-i18next';
import type { RoleId } from '../../game/types';
import { ROLE_IDS, ROLES } from '../../game/roles';
import { suggestedRoles } from '../../game/distribution';
import { Card, SectionTitle } from './atoms';

/**
 * Rol seçimi kurucuya aittir (03-roles.md): öneri sunulur, istediğini
 * ekler/çıkarır. Tek zorunlu kural en az 1 vampir + en az 1 vampir olmayan.
 */
export function RoleSetup({
  roleSetup,
  playerCount,
  allowed,
  onChange,
}: {
  roleSetup: RoleId[];
  playerCount: number;
  /** Bu masada kullanılabilecek roller; kalanlar kilitli görünür. */
  allowed: RoleId[];
  onChange: (roles: RoleId[]) => void;
}) {
  const { t } = useTranslation();

  const counts = ROLE_IDS.reduce<Record<string, number>>((acc, id) => {
    acc[id] = roleSetup.filter((r) => r === id).length;
    return acc;
  }, {});
  const total = roleSetup.length;

  const setCount = (roleId: RoleId, next: number) => {
    const others = roleSetup.filter((r) => r !== roleId);
    onChange([...others, ...Array.from({ length: Math.max(0, next) }, () => roleId)]);
  };

  const grouped: { team: string; roles: RoleId[] }[] = [
    { team: 'village', roles: ROLE_IDS.filter((r) => ROLES[r].team === 'village') },
    { team: 'vampire', roles: ROLE_IDS.filter((r) => ROLES[r].team === 'vampire') },
    { team: 'neutral', roles: ROLE_IDS.filter((r) => ROLES[r].team === 'neutral') },
  ];

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle>{t('lobby.roleSetup')}</SectionTitle>
        <button
          type="button"
          className="chip"
          onClick={() => onChange(suggestedRoles(playerCount, allowed))}
        >
          {t('lobby.useSuggestion')}
        </button>
      </div>

      <p
        className={`text-center text-sm ${
          total === playerCount ? 'text-moon-200/60' : 'text-blood-300'
        }`}
      >
        {t('lobby.setupCount', { total, players: playerCount })}
      </p>

      {grouped.map(({ team, roles }) => (
        <div key={team} className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-moon-200/50">
            {t(`roles:team.${team}`)}
          </p>
          {roles.map((roleId) => {
            // Kilitli roller GİZLENMEZ: adıyla ve kilitle durur. Merak
            // uyandırması satışın bir parçası (05-monetization.md).
            const locked = !allowed.includes(roleId);
            return (
            <div
              key={roleId}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                locked
                  ? 'border-night-700/60 bg-night-900/30 opacity-60'
                  : 'border-night-600/70 bg-night-900/60'
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {locked && <span aria-hidden="true">🔒 </span>}
                  {t(`roles:${roleId}.name`)}
                </span>
                <span className="block truncate text-[11px] text-moon-200/50">
                  {locked ? t('lobby.lockedRole') : t(`roles:${roleId}.short`)}
                </span>
              </span>
              {locked ? null : (
              <>
              <button
                type="button"
                className="h-8 w-8 rounded-lg border border-night-600 bg-night-800 text-lg leading-none"
                onClick={() => setCount(roleId, counts[roleId] - 1)}
                disabled={counts[roleId] === 0}
                aria-label={t('lobby.removeRole')}
              >
                <span aria-hidden="true">−</span>
              </button>
              <span className="w-5 text-center text-sm tabular-nums">{counts[roleId]}</span>
              <button
                type="button"
                className="h-8 w-8 rounded-lg border border-night-600 bg-night-800 text-lg leading-none"
                onClick={() => setCount(roleId, counts[roleId] + 1)}
                aria-label={t('lobby.addRole')}
              >
                <span aria-hidden="true">+</span>
              </button>
              </>
              )}
            </div>
            );
          })}
        </div>
      ))}
    </Card>
  );
}
