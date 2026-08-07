/** Favoris / actions rapides (URL + libellé). Le catalogue legacy sert à la migration. */

import type { PermissionCode } from "./permissions";

/** Ancien catalogue d’IDs — conservé pour migration / defaults. */
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
    label: "Planning",
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

/** Aucun favori par défaut — l’utilisateur voit l’invitation à en ajouter. */
export const DEFAULT_QUICK_ACTION_IDS: readonly QuickActionId[] = [];

/** MIME type pour le drag & drop menu → barre. */
export const QUICK_ACTION_DND_MIME = "application/x-planwise-quick-action";

/** Plafond technique anti-abus (pas de limite métier UI). */
export const MAX_QUICK_ACTION_BOOKMARKS = 50;

export interface QuickActionBookmark {
  id: string;
  href: string;
  label: string;
}

const QUICK_ACTION_ID_SET = new Set<string>(QUICK_ACTION_IDS);

export function isQuickActionId(value: unknown): value is QuickActionId {
  return typeof value === "string" && QUICK_ACTION_ID_SET.has(value);
}

export function getQuickActionById(id: QuickActionId): QuickActionDefinition | undefined {
  return QUICK_ACTION_CATALOG.find((a) => a.id === id);
}

/** Normalise un href relatif (pathname + search). Retourne null si invalide. */
export function normalizeQuickActionHref(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const base = "https://planwise.local";
    const url =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? new URL(trimmed)
        : new URL(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, base);
    if (!url.pathname.startsWith("/")) return null;
    // Refuse les schémas / hosts externes quand une URL absolue est fournie
    if (
      (trimmed.startsWith("http://") || trimmed.startsWith("https://")) &&
      url.host !== "planwise.local"
    ) {
      // Autoriser uniquement les chemins relatifs ; les absolus externes sont rejetés
      return null;
    }
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const search = url.search;
    return `${path}${search}`;
  } catch {
    return null;
  }
}

/** Id stable dérivé de l’href (pas de crypto requis). */
export function quickActionIdFromHref(href: string): string {
  let hash = 0;
  for (let i = 0; i < href.length; i++) {
    hash = (hash * 31 + href.charCodeAt(i)) | 0;
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return `qa_${hex}_${href.length.toString(16)}`;
}

export function bookmarkFromCatalogId(id: QuickActionId): QuickActionBookmark | null {
  const def = getQuickActionById(id);
  if (!def) return null;
  return {
    id: quickActionIdFromHref(def.href),
    href: def.href,
    label: def.label,
  };
}

export const DEFAULT_QUICK_ACTIONS: readonly QuickActionBookmark[] = [];

/**
 * Migre une liste d’anciens IDs catalogue vers des favoris URL.
 * Retourne null si aucun id valide.
 */
export function migrateQuickActionIdsToBookmarks(ids: unknown): QuickActionBookmark[] | null {
  if (!Array.isArray(ids)) return null;
  const seen = new Set<string>();
  const result: QuickActionBookmark[] = [];
  for (const id of ids) {
    if (!isQuickActionId(id)) continue;
    const bookmark = bookmarkFromCatalogId(id);
    if (!bookmark || seen.has(bookmark.href)) continue;
    seen.add(bookmark.href);
    result.push(bookmark);
    if (result.length >= MAX_QUICK_ACTION_BOOKMARKS) break;
  }
  return result.length > 0 ? result : null;
}

/**
 * Valide / normalise une liste de favoris. Retourne null si le payload est invalide
 * (pas un tableau). Un tableau vide est valide.
 */
export function normalizeQuickActions(input: unknown): QuickActionBookmark[] | null {
  if (!Array.isArray(input)) return null;
  const seen = new Set<string>();
  const result: QuickActionBookmark[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const href = normalizeQuickActionHref(raw.href);
    if (!href || seen.has(href)) continue;
    const labelRaw = typeof raw.label === "string" ? raw.label.trim() : "";
    const label = labelRaw || href;
    const id =
      typeof raw.id === "string" && raw.id.trim()
        ? raw.id.trim().slice(0, 64)
        : quickActionIdFromHref(href);
    seen.add(href);
    result.push({ id, href, label: label.slice(0, 120) });
    if (result.length >= MAX_QUICK_ACTION_BOOKMARKS) break;
  }
  return result;
}

/**
 * Résout les favoris à exposer : bookmarks fournis, sinon migration des IDs legacy,
 * sinon defaults catalogue.
 */
export function resolveStoredQuickActions(options: {
  quickActions?: unknown;
  quickActionIds?: unknown;
}): QuickActionBookmark[] {
  if (options.quickActions !== undefined) {
    const normalized = normalizeQuickActions(options.quickActions);
    if (normalized) return normalized;
  }
  const migrated = migrateQuickActionIdsToBookmarks(options.quickActionIds);
  if (migrated) return migrated;
  return [...DEFAULT_QUICK_ACTIONS];
}

/** ObjectId Mongo (24 hex) ou UUID — typiquement une fiche métier liée à une org. */
const ENTITY_ID_IN_PATH_RE =
  /(?:^|\/)([a-f0-9]{24}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$|\?)/i;

/** True si l’href pointe vers une ressource typée (dossier, client…) non partageable entre orgs. */
export function isOrganizationScopedQuickActionHref(href: string): boolean {
  return ENTITY_ID_IN_PATH_RE.test(href);
}

function parseQuickActionsByOrganizationId(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  // Mongoose Map → plain object
  if (raw instanceof Map) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of raw.entries()) {
      if (typeof k === "string" && k.trim()) out[k] = v;
    }
    return out;
  }
  return raw as Record<string, unknown>;
}

/**
 * Favoris pour une organisation : map per-org si présente, sinon legacy filtré
 * (sans href de fiches métier) pour ne pas fuiter un dossier d’une org vers une autre.
 */
export function resolveQuickActionsForOrganization(options: {
  organizationId?: string;
  quickActionsByOrganizationId?: unknown;
  quickActions?: unknown;
  quickActionIds?: unknown;
}): QuickActionBookmark[] {
  const orgId = options.organizationId?.trim();
  const byOrg = parseQuickActionsByOrganizationId(options.quickActionsByOrganizationId);
  if (orgId && byOrg && Object.prototype.hasOwnProperty.call(byOrg, orgId)) {
    const normalized = normalizeQuickActions(byOrg[orgId]);
    return normalized ?? [];
  }

  const legacy = resolveStoredQuickActions({
    quickActions: options.quickActions,
    quickActionIds: options.quickActionIds,
  });
  if (!orgId) return legacy;
  return legacy.filter((b) => !isOrganizationScopedQuickActionHref(b.href));
}

/** @deprecated Utiliser normalizeQuickActions / favoris URL. */
export const MIN_QUICK_ACTIONS = 0;
/** @deprecated Utiliser MAX_QUICK_ACTION_BOOKMARKS. */
export const MAX_QUICK_ACTIONS = MAX_QUICK_ACTION_BOOKMARKS;

/** @deprecated Migration uniquement. */
export function normalizeQuickActionIds(ids: unknown): QuickActionId[] | null {
  if (!Array.isArray(ids)) return null;
  const seen = new Set<QuickActionId>();
  const result: QuickActionId[] = [];
  for (const id of ids) {
    if (!isQuickActionId(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    if (result.length >= MAX_QUICK_ACTION_BOOKMARKS) break;
  }
  return result.length > 0 ? result : null;
}

/**
 * @deprecated Les favoris ne filtrent plus par permission catalogue.
 * Conservé pour compat tests / anciens appels.
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
