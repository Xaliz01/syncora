/** Contrat assistant in-app (guide produit) — pas d’accès aux données métier org. */

import type { PermissionCode } from "./permissions";
import { normalizeQuickActionHref } from "./quick-actions";

export const ASSISTANT_MESSAGE_MAX_LENGTH = 2000;
export const ASSISTANT_PATHNAME_MAX_LENGTH = 500;
export const ASSISTANT_CONVERSATION_ID_MAX_LENGTH = 64;
export const ASSISTANT_MAX_SUGGESTIONS = 5;
export const ASSISTANT_SUGGESTION_LABEL_MAX_LENGTH = 80;

export interface AssistantChatRequest {
  message: string;
  pathname?: string;
  conversationId?: string;
}

export interface AssistantSuggestion {
  label: string;
  href: string;
}

export interface AssistantChatResponse {
  conversationId: string;
  reply: string;
  suggestions: AssistantSuggestion[];
  escalateToSupport?: boolean;
}

export interface AssistantRouteEntry {
  label: string;
  href: string;
  /**
   * Permissions requises (au moins une). Tableau vide = accessible dès qu’un
   * abonnement actif (comme le menu AppShell).
   */
  permissions: readonly PermissionCode[];
}

/**
 * Whitelist de liens proposables — alignée sur `docs/product/routes.md`.
 * Ne pas inventer d’href hors de ce catalogue.
 */
export const ASSISTANT_ROUTE_CATALOG: readonly AssistantRouteEntry[] = [
  { label: "Tableau de bord", href: "/", permissions: [] },
  { label: "Mon organisation", href: "/organization", permissions: [] },
  { label: "Mon abonnement", href: "/subscription", permissions: [] },
  { label: "Mon compte", href: "/account", permissions: [] },
  { label: "Ma journée", href: "/my-day", permissions: ["interventions.read"] },
  { label: "Dossiers", href: "/cases", permissions: ["cases.read"] },
  { label: "Nouveau dossier", href: "/cases/new", permissions: ["cases.create"] },
  { label: "Planning", href: "/cases/calendar", permissions: ["cases.read"] },
  { label: "Contrats", href: "/contracts", permissions: ["contracts.read"] },
  { label: "Nouveau contrat", href: "/contracts/new", permissions: ["contracts.create"] },
  {
    label: "Mouvements de stock",
    href: "/stock",
    permissions: ["stock.movements.read"],
  },
  { label: "Reporting", href: "/reporting", permissions: ["exports.reporting"] },
  { label: "Facturation", href: "/billing", permissions: ["exports.billing"] },
  { label: "Clients", href: "/customers", permissions: ["customers.read"] },
  { label: "Nouveau client", href: "/customers/new", permissions: ["customers.create"] },
  {
    label: "Donneurs d'ordre",
    href: "/order-givers",
    permissions: ["order_givers.read"],
  },
  {
    label: "Nouveau donneur d'ordre",
    href: "/order-givers/new",
    permissions: ["order_givers.create"],
  },
  { label: "Utilisateurs", href: "/users", permissions: ["users.read"] },
  { label: "Inviter un utilisateur", href: "/users/new", permissions: ["users.invite"] },
  { label: "Équipes", href: "/fleet/teams", permissions: ["teams.read"] },
  {
    label: "Techniciens",
    href: "/fleet/technicians",
    permissions: ["fleet.technicians.read"],
  },
  { label: "Véhicules", href: "/fleet/vehicles", permissions: ["fleet.vehicles.read"] },
  { label: "Agences", href: "/fleet/agences", permissions: ["agences.read"] },
  {
    label: "Catalogue articles",
    href: "/settings/stock/articles",
    permissions: ["stock.articles.read"],
  },
  { label: "Prestations", href: "/settings/prestations", permissions: ["prestations.read"] },
  {
    label: "Emplacements de stock",
    href: "/settings/stock/locations",
    permissions: ["stock.locations.read"],
  },
  {
    label: "Modèles de dossier",
    href: "/settings/case-templates",
    permissions: ["case_templates.read"],
  },
  {
    label: "Types d’intervention",
    href: "/settings/intervention-types",
    permissions: ["intervention_types.read"],
  },
  { label: "Profils", href: "/settings/profiles", permissions: ["profiles.read"] },
  {
    label: "Notifications",
    href: "/settings/notifications",
    permissions: ["notifications.manage_preferences"],
  },
  {
    label: "Intégrations",
    href: "/settings/integrations",
    permissions: [
      "integrations.pennylane.read",
      "integrations.qonto.read",
      "integrations.demo.read",
    ],
  },
  { label: "Recherche", href: "/search", permissions: [] },
] as const;

const ROUTE_BY_HREF = new Map(ASSISTANT_ROUTE_CATALOG.map((r) => [r.href, r]));

export function getAssistantRouteByHref(href: string): AssistantRouteEntry | undefined {
  return ROUTE_BY_HREF.get(href);
}

export function isAssistantCatalogHref(href: string): boolean {
  return ROUTE_BY_HREF.has(href);
}

export function canAccessAssistantRoute(
  route: AssistantRouteEntry,
  hasPermission: (code: PermissionCode) => boolean,
): boolean {
  if (route.permissions.length === 0) return true;
  return route.permissions.some((code) => hasPermission(code));
}

/** Normalise un href de suggestion (même esprit que les favoris). */
export function normalizeAssistantHref(raw: unknown): string | null {
  return normalizeQuickActionHref(raw);
}

export function parseAssistantChatRequest(
  body: unknown,
): { ok: true; value: AssistantChatRequest } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Corps de requête invalide" };
  }
  const raw = body as Record<string, unknown>;
  if (typeof raw.message !== "string") {
    return { ok: false, error: "message est requis" };
  }
  const message = raw.message.trim();
  if (!message) {
    return { ok: false, error: "message ne peut pas être vide" };
  }
  if (message.length > ASSISTANT_MESSAGE_MAX_LENGTH) {
    return {
      ok: false,
      error: `message trop long (max ${ASSISTANT_MESSAGE_MAX_LENGTH} caractères)`,
    };
  }

  let pathname: string | undefined;
  if (raw.pathname !== undefined && raw.pathname !== null) {
    if (typeof raw.pathname !== "string") {
      return { ok: false, error: "pathname invalide" };
    }
    const trimmed = raw.pathname.trim().slice(0, ASSISTANT_PATHNAME_MAX_LENGTH);
    pathname = trimmed || undefined;
  }

  let conversationId: string | undefined;
  if (raw.conversationId !== undefined && raw.conversationId !== null) {
    if (typeof raw.conversationId !== "string") {
      return { ok: false, error: "conversationId invalide" };
    }
    const trimmed = raw.conversationId.trim().slice(0, ASSISTANT_CONVERSATION_ID_MAX_LENGTH);
    conversationId = trimmed || undefined;
  }

  return { ok: true, value: { message, pathname, conversationId } };
}

/**
 * Filtre et normalise les suggestions LLM : href whitelist + permission.
 * Deduplique par href, plafonne le nombre.
 */
export function filterAssistantSuggestions(
  suggestions: unknown,
  hasPermission: (code: PermissionCode) => boolean,
): AssistantSuggestion[] {
  if (!Array.isArray(suggestions)) return [];
  const seen = new Set<string>();
  const result: AssistantSuggestion[] = [];

  for (const item of suggestions) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const href = normalizeAssistantHref(raw.href);
    if (!href || seen.has(href)) continue;
    const route = getAssistantRouteByHref(href);
    if (!route || !canAccessAssistantRoute(route, hasPermission)) continue;

    const labelRaw = typeof raw.label === "string" ? raw.label.trim() : "";
    const label = (labelRaw || route.label).slice(0, ASSISTANT_SUGGESTION_LABEL_MAX_LENGTH);
    seen.add(href);
    result.push({ label, href });
    if (result.length >= ASSISTANT_MAX_SUGGESTIONS) break;
  }

  return result;
}

/** Suggestions dérivées du catalogue pour un fallback sans LLM. */
export function suggestionsFromAccessibleRoutes(
  hasPermission: (code: PermissionCode) => boolean,
  preferredHrefs: readonly string[] = [],
): AssistantSuggestion[] {
  const preferred = preferredHrefs
    .map((href) => getAssistantRouteByHref(href))
    .filter((r): r is AssistantRouteEntry => !!r && canAccessAssistantRoute(r, hasPermission))
    .map((r) => ({ label: r.label, href: r.href }));

  if (preferred.length >= ASSISTANT_MAX_SUGGESTIONS) {
    return preferred.slice(0, ASSISTANT_MAX_SUGGESTIONS);
  }

  const seen = new Set(preferred.map((s) => s.href));
  const rest: AssistantSuggestion[] = [];
  for (const route of ASSISTANT_ROUTE_CATALOG) {
    if (seen.has(route.href)) continue;
    if (!canAccessAssistantRoute(route, hasPermission)) continue;
    seen.add(route.href);
    rest.push({ label: route.label, href: route.href });
    if (preferred.length + rest.length >= ASSISTANT_MAX_SUGGESTIONS) break;
  }
  return [...preferred, ...rest].slice(0, ASSISTANT_MAX_SUGGESTIONS);
}
