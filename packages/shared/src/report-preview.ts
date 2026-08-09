import type { PermissionCode } from "./permissions";

/** Entités navigables vers une fiche détail dans l’app. */
export type EntityKind =
  | "case"
  | "customer"
  | "order_giver"
  | "technician"
  | "team"
  | "vehicle"
  | "agence"
  | "user"
  | "article"
  | "location";

/** Codes de permission permettant d’ouvrir la fiche (OR). */
export const ENTITY_READ_PERMISSIONS: Record<EntityKind, readonly PermissionCode[]> = {
  case: ["cases.read"],
  customer: ["customers.read"],
  order_giver: ["order_givers.read"],
  technician: ["fleet.technicians.read", "technicians.read"],
  team: ["teams.read"],
  vehicle: ["fleet.vehicles.read"],
  agence: ["agences.read"],
  user: ["users.read"],
  article: ["stock.articles.read"],
  location: ["stock.locations.read"],
};

export type ReportPreviewType =
  | "cases_list"
  | "interventions_list"
  | "technicians_activity"
  | "mileage_report"
  | "customers_list"
  | "users_list"
  | "invoices_list";

export const REPORT_PREVIEW_TYPES: readonly ReportPreviewType[] = [
  "cases_list",
  "interventions_list",
  "technicians_activity",
  "mileage_report",
  "customers_list",
  "users_list",
  "invoices_list",
] as const;

export function isReportPreviewType(value: string): value is ReportPreviewType {
  return (REPORT_PREVIEW_TYPES as readonly string[]).includes(value);
}

export interface ReportEntityRef {
  kind: EntityKind;
  id: string;
  label: string;
}

export type ReportCellValue = string | number | null | ReportEntityRef;

export function isReportEntityRef(value: ReportCellValue | undefined): value is ReportEntityRef {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    "id" in value &&
    "label" in value
  );
}

export interface ReportPreviewColumn {
  key: string;
  label: string;
}

export interface ReportPreviewRow {
  cells: Record<string, ReportCellValue>;
}

export interface ReportPreviewResponse {
  reportType: ReportPreviewType;
  title: string;
  columns: ReportPreviewColumn[];
  rows: ReportPreviewRow[];
  total: number;
}

export interface ReportPreviewQuery {
  startDate?: string;
  endDate?: string;
  status?: string;
  billingStatus?: string;
  priority?: string;
  assigneeId?: string;
  search?: string;
  kind?: string;
  teamId?: string;
  technicianId?: string;
  remoteStatus?: string;
  provider?: string;
  invoiceKind?: string;
  customerId?: string;
  orderGiverId?: string;
  /** Rapport kilométrique : équipes (défaut) ou techniciens. */
  groupBy?: "team" | "technician";
  /** Liste des interventions : filtre type (vide = tous). */
  typeId?: string;
}
