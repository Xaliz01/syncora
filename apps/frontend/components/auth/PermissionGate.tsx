"use client";

import type { PermissionCode } from "@syncora/shared";
import { usePermissions } from "@/lib/hooks/usePermissions";

interface PermissionGateProps {
  /** Single permission code required. */
  permission?: PermissionCode;
  /** Multiple codes — user needs at least one (OR). */
  anyOf?: PermissionCode[];
  /** Multiple codes — user needs all of them (AND). */
  allOf?: PermissionCode[];
  /** Content rendered when the user has the required permission(s). */
  children: React.ReactNode;
  /** Optional fallback rendered when permission is denied. */
  fallback?: React.ReactNode;
}

/**
 * Declarative permission gate.
 *
 * Renders `children` only if the current user satisfies the permission
 * requirement. Accepts exactly one of `permission`, `anyOf`, or `allOf`.
 *
 * ```tsx
 * <PermissionGate permission="customers.create">
 *   <ListPrimaryAction href="/customers/new">Nouveau client</ListPrimaryAction>
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { can, canAny, canAll } = usePermissions();

  let allowed = false;

  if (permission) {
    allowed = can(permission);
  } else if (anyOf && anyOf.length > 0) {
    allowed = canAny(anyOf);
  } else if (allOf && allOf.length > 0) {
    allowed = canAll(allOf);
  }

  return <>{allowed ? children : fallback}</>;
}
