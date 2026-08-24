import type { RoleDefinition, RoleId, Team } from '../types';
import { vampire } from './vampire';
import { villager } from './villager';
import { seer } from './seer';
import { doctor } from './doctor';
import { hunter } from './hunter';

/**
 * Rol kayıt defteri. Yeni rol eklemek = yeni dosya + buraya bir satır +
 * i18n anahtarları + asset. Çekirdek koda dokunulmaz (03-roles.md).
 */
export const ROLES: Record<RoleId, RoleDefinition> = {
  vampire,
  villager,
  seer,
  doctor,
  hunter,
};

export const ROLE_IDS = Object.keys(ROLES) as RoleId[];

export function getRole(id: RoleId): RoleDefinition {
  return ROLES[id];
}

export function teamOf(id: RoleId): Team {
  return ROLES[id].team;
}

/** Gece aksiyonu olan roller, çözümleme sırasına göre. */
export function nightRolesInOrder(): RoleDefinition[] {
  return ROLE_IDS.map((id) => ROLES[id])
    .filter((r) => r.nightAction)
    .sort((a, b) => a.nightAction!.phase - b.nightAction!.phase);
}
