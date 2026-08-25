import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoleId } from '../../game/types';
import { ROLE_IDS, ROLES } from '../../game/roles';
import { useGameStore } from '../../store/gameStore';
import type { PlayerView } from '../../game/view';
import { Card, SectionTitle } from './atoms';

/**
 * TEST ARACI — yalnız `?test=1` bayrağıyla (ya da geliştirme sunucusunda)
 * görünür. Kurucunun kendine sabit rol vermesini sağlar; bir rolü tekrar
 * tekrar denemek için elle oyun kurup şansa bırakmak gerekmiyor.
 *
 * Gerçek oyunda görünmemesinin sebebi açık: kendine vampir seçebilen bir
 * kurucu oyunu bozar.
 */
export function TestRolePicker({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  const updateSettings = useGameStore((s) => s.updateSettings);

  // Panel görünüyorsa gece röntgeni de açık olsun; kurucu ayrıca bir düğmeye
  // basmak zorunda kalmasın.
  const testMode = view.settings.testMode;
  useEffect(() => {
    if (!testMode) updateSettings({ testMode: true });
  }, [testMode, updateSettings]);

  const forced = view.settings.forcedRoles ?? {};
  const mine = forced[view.me.id];

  const choose = (roleId: RoleId | null) => {
    const next = { ...forced };
    if (roleId) next[view.me.id] = roleId;
    else delete next[view.me.id];
    updateSettings({ forcedRoles: next });
  };

  const grouped: { team: string; roles: RoleId[] }[] = [
    { team: 'village', roles: ROLE_IDS.filter((r) => ROLES[r].team === 'village') },
    { team: 'vampire', roles: ROLE_IDS.filter((r) => ROLES[r].team === 'vampire') },
    { team: 'neutral', roles: ROLE_IDS.filter((r) => ROLES[r].team === 'neutral') },
  ];

  return (
    <Card className="space-y-3 border-dashed border-moon-200/30">
      <SectionTitle>{t('test.title')}</SectionTitle>
      <p className="text-xs text-moon-200/50">{t('test.hint')}</p>

      <button
        type="button"
        className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold ${
          mine ? 'border-night-600 bg-night-800' : 'border-blood-400 bg-blood-500/20'
        }`}
        onClick={() => choose(null)}
      >
        {t('test.random')}
      </button>

      {grouped.map(({ team, roles }) => (
        <div key={team} className="space-y-1">
          <p className="text-[11px] uppercase tracking-widest text-moon-200/40">
            {t(`roles:team.${team}`)}
          </p>
          <div className="flex flex-wrap gap-1">
            {roles.map((roleId) => (
              <button
                key={roleId}
                type="button"
                className={`rounded-lg border px-2 py-1 text-xs ${
                  mine === roleId
                    ? 'border-blood-400 bg-blood-500/20 text-moon-100'
                    : 'border-night-600 bg-night-800 text-moon-200/70'
                }`}
                onClick={() => choose(roleId)}
              >
                {t(`roles:${roleId}.name`)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </Card>
  );
}
