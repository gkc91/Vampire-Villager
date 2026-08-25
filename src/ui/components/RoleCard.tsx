import { useTranslation } from 'react-i18next';
import type { RoleId } from '../../game/types';
import { AssetImage } from './atoms';

/** Asset gelene kadar kullanılan emoji/renk yer tutucuları (06-assets.md). */
const ROLE_PLACEHOLDER: Record<RoleId, { emoji: string; from: string; to: string }> = {
  vampire: { emoji: '🧛', from: '#3b0d12', to: '#c1121f' },
  villager: { emoji: '🧑‍🌾', from: '#1b1233', to: '#4b6043' },
  seer: { emoji: '🔮', from: '#1b1233', to: '#5f27cd' },
  doctor: { emoji: '⚕️', from: '#1b1233', to: '#2980b9' },
  hunter: { emoji: '🏹', from: '#1b1233', to: '#b8860b' },
};

export function RoleCard({ roleId, compact }: { roleId: RoleId; compact?: boolean }) {
  // Rol kartları 2:3 üretiliyor (06-assets.md). Kutu yatay olursa object-cover
  // görselin ortasından bir bant alır ve YÜZ kadraj dışında kalır (ölçüldü:
  // yalnız %28–%72 aralığı görünüyordu). Tam kart oranını koruyoruz; dar
  // kullanımda da kırpma üstten hizalanır ki yüz her zaman görünsün.
  const { t } = useTranslation();
  const skin = ROLE_PLACEHOLDER[roleId];
  const src = `${import.meta.env.BASE_URL}assets/roles/${roleId}.webp`;

  return (
    <div className="overflow-hidden rounded-2xl border border-night-600/60 bg-night-900/80">
      <div className={`relative w-full ${compact ? 'h-32' : 'aspect-[2/3]'}`}>
        <AssetImage
          src={src}
          alt={t(`roles:${roleId}.name`)}
          className="h-full w-full object-cover object-top"
          fallback={
            <div
              className="flex h-full w-full items-center justify-center text-6xl"
              style={{ backgroundImage: `linear-gradient(160deg, ${skin.from}, ${skin.to})` }}
            >
              <span aria-hidden="true">{skin.emoji}</span>
            </div>
          }
        />
      </div>
      <div className="space-y-1 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xl font-bold">{t(`roles:${roleId}.name`)}</h3>
          <span className="chip">{t(`roles:team.${teamKey(roleId)}`)}</span>
        </div>
        <p className="text-sm text-moon-200/80">{t(`roles:${roleId}.short`)}</p>
        {!compact && <p className="pt-1 text-sm text-moon-200/60">{t(`roles:${roleId}.description`)}</p>}
      </div>
    </div>
  );
}

function teamKey(roleId: RoleId): string {
  return roleId === 'vampire' ? 'vampire' : 'village';
}
