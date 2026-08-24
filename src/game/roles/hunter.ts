import type { RoleDefinition } from '../types';

/** Avcı — nasıl ölürse ölsün 1 kişiyi yanında götürür (30 sn seçim). */
export const hunter: RoleDefinition = {
  id: 'hunter',
  team: 'village',
  premium: false,
  onDeath: (_state, playerId) => [{ type: 'hunterTrigger', hunterId: playerId }],
};
