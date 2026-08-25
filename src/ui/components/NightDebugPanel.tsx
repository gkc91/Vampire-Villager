import { useTranslation } from 'react-i18next';
import type { PlayerView } from '../../game/view';

/**
 * TEST ARACI — gecenin gerçek durumu.
 *
 * Botlarla test ederken mührün tutup tutmadığını, kimin uyandığını görmenin
 * başka yolu yok: bot bir arayüz göstermiyor. Bu panel motorun iç durumunu
 * doğrudan okur. Yalnız `?test=1` ile açılan kurucuda görünür.
 */
export function NightDebugPanel({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  const d = view.debug;
  if (!d) return null;

  const list = (items: string[]) => (items.length ? items.join(', ') : '—');
  // Adım adını rol adından türet; ayrı bir anahtar seti gerekmiyor.
  const STEP_ROLE: Record<string, string> = {
    lord: 'vampireLord',
    bloodWizard: 'bloodWizard',
    mist: 'mistVampire',
    vampireVote: 'vampire',
    doctor: 'doctor',
    seer: 'seer',
    detective: 'detective',
    thief: 'thief',
  };

  const rows: [string, string][] = [
    [t('test.dbgStep'), d.step ? t(`roles:${STEP_ROLE[d.step]}.name`) : '—'],
    [t('test.dbgBlocked'), list(d.blocked)],
    [t('test.dbgWoke'), list(d.woke)],
    [t('test.dbgFog'), d.fog ? t('common.yes') : t('common.no')],
    [t('test.dbgProtected'), d.protectedName ?? '—'],
    [t('test.dbgAttack'), d.attackName ?? '—'],
    [t('test.dbgConverted'), d.convertedName ?? '—'],
  ];

  return (
    <details className="rounded-xl border border-dashed border-moon-200/30 bg-night-900/70 px-3 py-2">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-moon-200/60">
        {t('test.dbgTitle', { round: d.round })}
      </summary>

      <dl className="mt-2 space-y-1 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="w-28 shrink-0 text-moon-200/45">{label}</dt>
            <dd className="text-moon-100/90">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-2 text-[11px] uppercase tracking-widest text-moon-200/40">
        {t('test.dbgRoles')}
      </p>
      <ul className="mt-1 flex flex-wrap gap-1">
        {d.roles.map(([name, roleId]) => (
          <li
            key={name}
            className="rounded-lg border border-night-600 bg-night-800 px-2 py-0.5 text-[11px] text-moon-200/70"
          >
            {name}: {t(`roles:${roleId}.name`)}
          </li>
        ))}
      </ul>
    </details>
  );
}
