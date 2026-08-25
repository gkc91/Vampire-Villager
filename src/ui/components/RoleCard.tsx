import { useTranslation } from 'react-i18next';
import type { RoleId } from '../../game/types';
import { ROLES } from '../../game/roles';
import { AssetImage } from './atoms';

/** Asset gelene kadar kullanılan emoji/renk yer tutucuları (06-assets.md). */
const ROLE_PLACEHOLDER: Record<RoleId, { emoji: string; from: string; to: string }> = {
  // Köy
  villager: { emoji: '🧑‍🌾', from: '#1b1233', to: '#4b6043' },
  doctor: { emoji: '⚕️', from: '#1b1233', to: '#2980b9' },
  seer: { emoji: '🔮', from: '#1b1233', to: '#5f27cd' },
  detective: { emoji: '🕵️', from: '#1b1233', to: '#34495e' },
  wizard: { emoji: '🪄', from: '#1b1233', to: '#6c3483' },
  hunter: { emoji: '🏹', from: '#1b1233', to: '#b8860b' },
  // Vampirler
  vampire: { emoji: '🧛', from: '#3b0d12', to: '#c1121f' },
  vampireLord: { emoji: '👑', from: '#3b0d12', to: '#8e0e1a' },
  bloodWizard: { emoji: '🩸', from: '#3b0d12', to: '#7b1e2b' },
  mistVampire: { emoji: '🌫️', from: '#2a1030', to: '#5b3a63' },
  // Tarafsız
  thief: { emoji: '🗝️', from: '#1b1233', to: '#7f8c8d' },
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
          <span className="chip">{t(`roles:team.${ROLES[roleId].team}`)}</span>
        </div>
        <p className="text-sm text-moon-200/80">{t(`roles:${roleId}.short`)}</p>
        {!compact && <p className="pt-1 text-sm text-moon-200/60">{t(`roles:${roleId}.description`)}</p>}
      </div>
    </div>
  );
}
