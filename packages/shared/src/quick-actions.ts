/** Catalogue des actions rapides du tableau de bord */

import type { PermissionCode } from "./permissions";

export const QUICK_ACTION_IDS = [
  "case_new",
  "cases_list",
  "calendar",
  "case_templates",
  "my_day",
  "customers",
  "customer_new",
  "stock",
  "reporting",
  "vehicles",
  "teams",
  "technicians",
] as const;

export type QuickActionId = (typeof QUICK_ACTION_IDS)[number];

export interface QuickActionDefinition {
  id: QuickActionId;
  label: string;
  href: string;
  permission: PermissionCode;
}

export const QUICK_ACTION_CATALOG: readonly QuickActionDefinition[] = [
  {
    id: "case_new",
    label: "Nouveau dossier",
    href: "/cases/new",
    permission: "cases.create",
  },
  {
    id: "cases_list",
    label: "Tous les dossiers",
    href: "/cases",
    permission: "cases.read",
  },
  {
    id: "calendar",
    label: "Calendrier",
    href: "/cases/calendar",
    permission: "cases.read",
  },
  {
    id: "case_templates",
    label: "Modèles de dossier",
    href: "/settings/case-templates",
    permission: "case_templates.read",
  },
  {
    id: "my_day",
    label: "Ma journée",
    href: "/my-day",
    permission: "interventions.read",
  },
  {
    id: "customers",
    label: "Clients",
    href: "/customers",
    permission: "customers.read",
  },
  {
    id: "customer_new",
    label: "Nouveau client",
    href: "/customers/new",
    permission: "customers.create",
  },
  {
    id: "stock",
    label: "Mouvements de stock",
    href: "/stock",
    permission: "stock.movements.read",
  },
  {
    id: "reporting",
    label: "Reporting",
    href: "/reporting",
    permission: "exports.reporting",
  },
  {
    id: "vehicles",
    label: "Véhicules",
    href: "/fleet/vehicles",
    permission: "fleet.vehicles.read",
  },
  {
    id: "teams",
    label: "Équipes",
    href: "/fleet/teams",
    permission: "teams.read",
  },
  {
    id: "technicians",
    label: "Techniciens",
    href: "/fleet/technicians",
    permission: "fleet.technicians.read",
  },
] as const;

export const DEFAULT_QUICK_ACTION_IDS: readonly QuickActionId[] = [
  "case_new",
  "cases_list",
  "calendar",
  "case_templates",
] as const;

export const MIN_QUICK_ACTIONS = 2;
export const MAX_QUICK_ACTIONS = 6;

const QUICK_ACTION_ID_SET = new Set<string>(QUICK_ACTION_IDS);

export function isQuickActionId(value: unknown): value is QuickActionId {
  return typeof value === "string" && QUICK_ACTION_ID_SET.has(value);
}

/** Valide, déduplique et borne une liste d'IDs. Retourne null si invalide. */
export function normalizeQuickActionIds(ids: unknown): QuickActionId[] | null {
  if (!Array.isArray(ids)) return null;
  const seen = new Set<QuickActionId>();
  const result: QuickActionId[] = [];
  for (const id of ids) {
    if (!isQuickActionId(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    if (result.length >= MAX_QUICK_ACTIONS) break;
  }
  if (result.length < MIN_QUICK_ACTIONS) return null;
  return result;
}

export function getQuickActionById(id: QuickActionId): QuickActionDefinition | undefined {
  return QUICK_ACTION_CATALOG.find((a) => a.id === id);
}

/**
 * Résout les actions à afficher : ordre des prefs, ignore inconnus / sans permission.
 */
export function resolveQuickActions(
  selectedIds: readonly QuickActionId[] | undefined,
  hasPermission: (code: PermissionCode) => boolean,
): QuickActionDefinition[] {
  const ids = selectedIds && selectedIds.length > 0 ? selectedIds : [...DEFAULT_QUICK_ACTION_IDS];
  const resolved: QuickActionDefinition[] = [];
  for (const id of ids) {
    const def = getQuickActionById(id);
    if (!def) continue;
    if (!hasPermission(def.permission)) continue;
    resolved.push(def);
  }
  return resolved;
}
