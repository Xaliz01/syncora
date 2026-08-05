"use client";

import Link from "next/link";
import type { EntityKind, PermissionCode } from "@planwise/shared";
import { ENTITY_READ_PERMISSIONS } from "@planwise/shared";
import { useAuth } from "@/components/auth/AuthContext";
import { hasAnyPermission } from "@/lib/auth-permissions";
import { getEntityHref } from "@/lib/entity-href";

export function EntityRef({
  kind,
  id,
  label,
  className,
  permissions,
}: {
  kind: EntityKind;
  id?: string | null;
  label: string;
  className?: string;
  /** Override des permissions de lecture (défaut : catalogue ENTITY_READ_PERMISSIONS). */
  permissions?: readonly PermissionCode[];
}) {
  const { user } = useAuth();
  const text = label.trim() || "—";
  const href = id ? getEntityHref(kind, id) : null;
  const required = permissions ?? ENTITY_READ_PERMISSIONS[kind];
  const canOpen = Boolean(href && hasAnyPermission(user, [...required]));
  const classes =
    className ??
    (canOpen
      ? "block max-w-full truncate text-brand-600 dark:text-brand-400 hover:underline font-medium"
      : "block max-w-full truncate");

  if (!canOpen || !href) {
    return <span className={classes}>{text}</span>;
  }

  return (
    <Link href={href} className={classes} onClick={(e) => e.stopPropagation()}>
      {text}
    </Link>
  );
}
