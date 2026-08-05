import type { EntityKind } from "@planwise/shared";

/** Chemins détail alignés sur la recherche / le routing app. */
export function getEntityHref(kind: EntityKind, id: string): string | null {
  if (!id.trim()) return null;
  switch (kind) {
    case "case":
      return `/cases/${id}`;
    case "customer":
      return `/customers/${id}`;
    case "order_giver":
      return `/order-givers/${id}`;
    case "technician":
      return `/fleet/technicians/${id}`;
    case "team":
      return `/fleet/teams/${id}`;
    case "vehicle":
      return `/fleet/vehicles/${id}`;
    case "agence":
      return `/fleet/agences/${id}`;
    case "user":
      return `/users/${id}`;
    case "article":
      return `/settings/stock/articles/${id}`;
    case "location":
      return `/settings/stock/locations/${id}`;
    default:
      return null;
  }
}
