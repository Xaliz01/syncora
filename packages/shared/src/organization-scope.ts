import { activeDocumentFilter } from "./soft-delete";

/** Ressource rattachée à un tenant (organisation). */
export interface OrganizationScoped {
  organizationId: string;
}

export class OrganizationScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationScopeError";
  }
}

/** Valide et normalise un identifiant d'organisation (requêtes / corps API). */
export function requireOrganizationId(
  organizationId: string | undefined | null,
): string {
  const trimmed = organizationId?.trim();
  if (!trimmed) {
    throw new OrganizationScopeError("organizationId is required");
  }
  return trimmed;
}

/** Filtre MongoDB standard : tenant + documents non supprimés. */
export function organizationScopeFilter(organizationId: string): {
  organizationId: string;
  deletedAt: null;
} {
  return {
    organizationId: requireOrganizationId(organizationId),
    ...activeDocumentFilter,
  };
}

/** Refuse un corps dont `organizationId` ne correspond pas au tenant attendu. */
export function scopeRequestBody<T extends object>(
  expectedOrganizationId: string,
  body: T,
): T & { organizationId: string } {
  const org = requireOrganizationId(expectedOrganizationId);
  const rawOrg =
    "organizationId" in body
      ? (body as { organizationId?: unknown }).organizationId
      : undefined;
  const bodyOrg = typeof rawOrg === "string" ? rawOrg.trim() : undefined;
  if (bodyOrg && bodyOrg !== org) {
    throw new OrganizationScopeError("organizationId mismatch");
  }
  return { ...body, organizationId: org };
}

/** Fusionne / valide le query param `organizationId`. */
export function scopeRequestQuery(
  expectedOrganizationId: string,
  query?: Record<string, unknown>,
): Record<string, unknown> {
  const org = requireOrganizationId(expectedOrganizationId);
  const queryOrg =
    typeof query?.organizationId === "string" ? query.organizationId.trim() : undefined;
  if (queryOrg && queryOrg !== org) {
    throw new OrganizationScopeError("organizationId mismatch");
  }
  return { ...(query ?? {}), organizationId: org };
}

export function isOrganizationScoped(value: unknown): value is OrganizationScoped {
  return (
    typeof value === "object" &&
    value !== null &&
    "organizationId" in value &&
    typeof (value as OrganizationScoped).organizationId === "string"
  );
}

/** Vérifie qu'une ressource appartient au tenant (défense en profondeur après lecture DB). */
export function assertOrganizationScopedResource<T extends OrganizationScoped>(
  expectedOrganizationId: string,
  resource: T | null | undefined,
): T {
  const org = requireOrganizationId(expectedOrganizationId);
  if (!resource) {
    throw new OrganizationScopeError("Resource not found");
  }
  if (resource.organizationId !== org) {
    throw new OrganizationScopeError("Resource not in organization scope");
  }
  return resource;
}

/** Vérifie chaque élément d'une liste (ex. clients d'une organisation). */
export function assertOrganizationScopedList<T extends OrganizationScoped>(
  expectedOrganizationId: string,
  resources: T[],
): T[] {
  const org = requireOrganizationId(expectedOrganizationId);
  for (const resource of resources) {
    if (resource.organizationId !== org) {
      throw new OrganizationScopeError("Resource not in organization scope");
    }
  }
  return resources;
}

/**
 * Valide une réponse HTTP (objet ou tableau) exposant `organizationId`.
 * Ignore les payloads sans champ tenant (ex. `{ deleted: true }`).
 */
export function assertOrganizationScopedPayload(
  expectedOrganizationId: string,
  payload: unknown,
): void {
  if (payload === null || payload === undefined) return;
  if (Array.isArray(payload)) {
    const scoped = payload.filter(isOrganizationScoped);
    if (scoped.length > 0) {
      assertOrganizationScopedList(expectedOrganizationId, scoped);
    }
    return;
  }
  if (isOrganizationScoped(payload)) {
    assertOrganizationScopedResource(expectedOrganizationId, payload);
  }
}
