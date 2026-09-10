import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { roleNames } from '../screens/NightScreen';
import { RoleCard } from './RoleCard';
import { PlayerGrid } from './PlayerGrid';
import { SectionTitle } from './atoms';
import type { PlayerView } from '../../game/view';

/**
 * Ekranın altındaki kapalı rol kartı.
 *
 * Rol yalnız oyun başında bir kez gösteriliyordu ve insanlar unutuyordu.
 * Artık istendiği zaman açılıp kapanabiliyor. Kart kapalı duruyor ki
 * masadaki başkası yanlışlıkla görmesin — açmak bilinçli bir hareket.
 */
export function RolePocket({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // Rolü olmayan (yalnız anlatıcı host, henüz dağıtılmamış) için gösterme.
  // Oyun bittiğinde zaten herkesin rolü açık.
  const visible =
    view.me.isPlayer &&
    view.me.role !== null &&
    view.phase !== 'GAME_END' &&
    view.phase !== 'ROLE_REVEAL';

  // Çubuk sabit konumlu, yani ekranın akışında yer kaplamıyor: altındaki
  // onay düğmesini örtüyordu. Gövdeye işaret bırakıp çerçeveye o kadar
  // boşluk açtırıyoruz (index.css).
  useEffect(() => {
    if (!visible) return;
    document.body.classList.add('has-pocket');
    return () => document.body.classList.remove('has-pocket');
  }, [visible]);

  if (!visible || !view.me.role) return null;

  const teammates = view.players.filter((p) => view.teammates.includes(p.id));

  // Aşağıdaki pb: Android 15+ artık kenardan kenara çiziyor; sabit çubuk
  // sistem gezinme çubuğunun ALTINDA kalıyordu — "Rolüm" yazısı
  // ||| O < tuşlarının arkasından okunuyordu.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-[430px] -translate-x-1/2 items-center justify-center gap-2 rounded-t-2xl border border-b-0 border-night-600 bg-night-900/95 px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-sm text-moon-200/80 backdrop-blur"
      >
        <span aria-hidden="true">🎴</span>
        {t('role.pocket')}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-night-950/80 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-[430px] space-y-3 overflow-y-auto rounded-t-2xl border border-b-0 border-night-600 bg-night-950 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <RoleCard roleId={view.me.role} />

        {teammates.length > 0 && (
          <section>
            <SectionTitle>{t('role.teammates')}</SectionTitle>
            <PlayerGrid players={teammates} meId={view.me.id} roleNames={roleNames(view, t)} />
          </section>
        )}

        {view.me.usesLeft !== null && (
          <p className="text-center text-xs text-moon-200/60">
            {t('night.usesLeft', { count: view.me.usesLeft })}
          </p>
        )}

        <button type="button" className="btn-primary" onClick={() => setOpen(false)}>
          {t('role.pocketClose')}
        </button>
      </div>
    </div>
  );
}
