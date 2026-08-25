import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { relayBaseUrl } from '../../net/RelayAdapter';
import { activeNetMode } from '../../net';

/**
 * Bağlantı teşhisi.
 *
 * İki telefon birbirine bağlanamadığında sorunun nerede olduğunu uzaktan
 * bilmenin yolu yoktu: sunucu ve paket sağlamken cihazda ne olduğu
 * görünmüyordu. En sık iki sebep buradan tek bakışta anlaşılır:
 *   - iki cihaz FARKLI adresteyse "Adres" satırları tutmaz (ayrı sitelerde
 *     kurulan odalar birbirini asla göremez),
 *   - birinde eski sürüm asılı kaldıysa "Sürüm" satırları tutmaz.
 */
export function ConnectionInfo({ open = false }: { open?: boolean }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const connection = useGameStore((s) => s.connection);
  const diagnostics = useGameStore((s) => s.diagnostics);

  const rows: [string, string][] = [
    [t('diag.version'), __BUILD_ID__],
    [t('diag.address'), window.location.origin],
    [t('diag.relay'), relayBaseUrl() ?? '—'],
    [t('diag.mode'), activeNetMode()],
    [t('diag.state'), connection],
  ];
  if (diagnostics) {
    rows.push([t('diag.peers'), String(diagnostics.peers)]);
    if (diagnostics.timings.relay) {
      rows.push([t('diag.relayMs'), `${diagnostics.timings.relay} ms`]);
    }
  }

  const copy = () => {
    const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
    void navigator.clipboard?.writeText(text).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };

  return (
    <details open={open} className="rounded-xl border border-night-600 bg-night-900/60 px-3 py-2">
      <summary className="cursor-pointer text-xs uppercase tracking-widest text-moon-200/50">
        {t('diag.title')}
      </summary>
      <dl className="mt-2 space-y-1 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="w-24 shrink-0 text-moon-200/45">{label}</dt>
            <dd className="break-all text-moon-100/90">{value}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className="btn-ghost mt-2 w-full text-xs" onClick={copy}>
        {copied ? t('diag.copied') : t('diag.copy')}
      </button>
    </details>
  );
}
