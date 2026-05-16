import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  OrganizationScopeError,
  requireOrganizationId,
  assertOrganizationScopedResource,
  assertOrganizationScopedList,
  assertOrganizationScopedPayload,
} from "./organization-scope";

export function parseOrganizationIdQuery(organizationId: string | undefined): string {
  try {
    return requireOrganizationId(organizationId);
  } catch (err) {
    if (err instanceof OrganizationScopeError) {
      throw new BadRequestException("organizationId query param is required");
    }
    throw err;
  }
}

export function parseOrganizationIdBody(organizationId: string | undefined): string {
  try {
    return requireOrganizationId(organizationId);
  } catch (err) {
    if (err instanceof OrganizationScopeError) {
      throw new BadRequestException("organizationId is required");
    }
    throw err;
  }
}

/** Convertit une erreur de scope en 404 (pas de fuite inter-tenant). */
export function rethrowOrganizationScopeError(
  err: unknown,
  notFoundMessage = "Resource not found",
): never {
  if (err instanceof OrganizationScopeError) {
    if (err.message === "Resource not found") {
      throw new NotFoundException(notFoundMessage);
    }
    throw new ForbiddenException("Resource not in organization scope");
  }
  throw err;
}

export function assertOrganizationScopedResourceNest<T extends { organizationId: string }>(
  expectedOrganizationId: string,
  resource: T | null | undefined,
  notFoundMessage?: string,
): T {
  try {
    return assertOrganizationScopedResource(expectedOrganizationId, resource);
  } catch (err) {
    rethrowOrganizationScopeError(err, notFoundMessage);
  }
}

export function assertOrganizationScopedListNest<T extends { organizationId: string }>(
  expectedOrganizationId: string,
  resources: T[],
): T[] {
  try {
    return assertOrganizationScopedList(expectedOrganizationId, resources);
  } catch (err) {
    rethrowOrganizationScopeError(err);
  }
}

export function assertOrganizationScopedPayloadNest(
  expectedOrganizationId: string,
  payload: unknown,
): void {
  try {
    assertOrganizationScopedPayload(expectedOrganizationId, payload);
  } catch (err) {
    rethrowOrganizationScopeError(err);
  }
}
