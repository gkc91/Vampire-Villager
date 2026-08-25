import type { RoleDefinition, RoleId, Team } from '../types';
import { villager } from './villager';
import { doctor } from './doctor';
import { seer } from './seer';
import { detective } from './detective';
import { wizard } from './wizard';
import { hunter } from './hunter';
import { vampire } from './vampire';
import { vampireLord } from './vampireLord';
import { bloodWizard } from './bloodWizard';
import { mistVampire } from './mistVampire';
import { thief } from './thief';

/**
 * Rol kayıt defteri (03-roles.md). Yeni rol eklemek = yeni dosya +
 * buraya bir satır + i18n anahtarları + asset. Çekirdek koda dokunulmaz.
 */
export const ROLES: Record<RoleId, RoleDefinition> = {
  villager,
  doctor,
  seer,
  detective,
  wizard,
  hunter,
  vampire,
  vampireLord,
  bloodWizard,
  mistVampire,
  thief,
};

export const ROLE_IDS = Object.keys(ROLES) as RoleId[];

export function getRole(id: RoleId): RoleDefinition {
  return ROLES[id];
}

export function teamOf(id: RoleId): Team {
  return ROLES[id].team;
}

/** Sınırlı kullanımlı roller için başlangıç hakkı. */
export function initialUses(id: RoleId): number | undefined {
  return ROLES[id].maxUses;
}
