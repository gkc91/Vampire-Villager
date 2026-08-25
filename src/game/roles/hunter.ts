import type { RoleDefinition } from '../types';

/**
 * Avcı — pasif. Vampirler avcıyı hedeflerse saldırı geri teper:
 * rastgele bir vampir düz köylüye dönüşür (gizli) ve o gece kimse ölmez.
 * Sınırsız tekrar eder. Gündüz asılabilir.
 */
export const hunter: RoleDefinition = {
  id: 'hunter',
  team: 'village',
};
