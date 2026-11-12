import { BadRequestException, ForbiddenException, Logger } from "@nestjs/common";
import {
  ASSIGNABLE_PERMISSION_CODES,
  type AuthUser,
  type DocumentEntityType,
  type PermissionCode,
} from "@planwise/shared";
import type { SearchResultItem } from "../ports/search.service.port";
import type { AbstractPermissionsService } from "./ports/permissions.service.port";

export type SearchEntityType = SearchResultItem["type"];

/**
 * Droits de lecture de la recherche globale.
 * Mêmes codes que les contrôleurs de liste (y compris l'alternative agences / équipes).
 * Pour la flotte, le garde n'applique que le décorateur du haut (`fleet.*`).
 */
export const SEARCH_ENTITY_READ_RULES: Record<
  SearchEntityType,
  { codes: readonly PermissionCode[]; match: "all" | "any" }
> = {
  case: { codes: ["cases.read"], match: "all" },
  intervention: { codes: ["interventions.read"], match: "all" },
  customer: { codes: ["customers.read"], match: "all" },
  order_giver: { codes: ["order_givers.read"], match: "all" },
  vehicle: { codes: ["fleet.vehicles.read"], match: "all" },
  technician: { codes: ["fleet.technicians.read"], match: "all" },
  team: { codes: ["teams.read"], match: "all" },
  agence: { codes: ["agences.read", "teams.read"], match: "any" },
  article: { codes: ["stock.articles.read"], match: "all" },
  prestation: { codes: ["prestations.read"], match: "all" },
  invoice: { codes: ["billing.invoices.read"], match: "all" },
  user: { codes: ["users.read"], match: "all" },
};

/**
 * Lecture = droit de lecture de la fiche porteuse.
 * Écriture (dépôt / suppression) = droit de modification de cette fiche,
 * le même code que l'endpoint de mise à jour.
 */
export const DOCUMENT_PARENT_ACCESS: Record<
  DocumentEntityType,
  { read: PermissionCode; write: PermissionCode }
> = {
  case: { read: "cases.read", write: "cases.update" },
  intervention: { read: "interventions.read", write: "interventions.update" },
  vehicle: { read: "fleet.vehicles.read", write: "fleet.vehicles.update" },
  team: { read: "teams.read", write: "teams.update" },
  technician: { read: "fleet.technicians.read", write: "fleet.technicians.update" },
  customer: { read: "customers.read", write: "customers.update" },
  organization: { read: "organizations.read", write: "organizations.update" },
};

const DOCUMENT_ENTITY_TYPES = new Set<string>(Object.keys(DOCUMENT_PARENT_ACCESS));

const logger = new Logger("CallerAccess");

/**
 * Droits effectifs de l'appelant.
 * Un admin a tous les droits assignables, comme `RequirePermissionGuard`.
 * Un membre doit avoir le code à la fois sur le jeton (ce que les gardes HTTP
 * appliquent) et dans le module permissions (source à jour, révocation immédiate).
 * Si le module permissions est indisponible, on retombe sur le jeton.
 */
export async function resolveCallerPermissions(
  permissions: AbstractPermissionsService,
  user: AuthUser,
): Promise<ReadonlySet<PermissionCode>> {
  if (user.role === "admin") {
    return new Set(ASSIGNABLE_PERMISSION_CODES);
  }

  const token = new Set(user.permissions ?? []);
  let live: ReadonlySet<PermissionCode>;
  try {
    const resolved = await permissions.resolveEffectivePermissions({
      organizationId: user.organizationId,
      userId: user.id,
      role: user.role,
    });
    live = new Set(resolved.permissions ?? []);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "erreur inconnue";
    logger.warn(`Module permissions indisponible, repli sur les droits du jeton: ${detail}`);
    return token;
  }

  return new Set([...token].filter((code) => live.has(code)));
}

export function canReadSearchEntity(
  granted: ReadonlySet<PermissionCode>,
  type: SearchEntityType,
): boolean {
  const rule = SEARCH_ENTITY_READ_RULES[type];
  if (rule.match === "any") return rule.codes.some((code) => granted.has(code));
  return rule.codes.every((code) => granted.has(code));
}

export function assertDocumentParentAccess(
  granted: ReadonlySet<PermissionCode>,
  entityType: string,
  mode: "read" | "write",
): void {
  if (!DOCUMENT_ENTITY_TYPES.has(entityType)) {
    throw new BadRequestException("Type de document non pris en charge");
  }
  const rule = DOCUMENT_PARENT_ACCESS[entityType as DocumentEntityType];
  const code = mode === "read" ? rule.read : rule.write;
  if (!granted.has(code)) {
    throw new ForbiddenException("Permissions insuffisantes");
  }
}
