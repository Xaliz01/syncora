import type { CasePriority, CaseStatus, InterventionStatus } from "./case";
import type { CustomerKind, PostalAddress } from "./customer";

/** Entités importables (ordre métier pour l’UI). */
export const DATA_IMPORT_ENTITIES = [
  "customers",
  "customer_sites",
  "order_givers",
  "articles",
  "prestations",
  "cases",
  "interventions",
] as const;

export type DataImportEntity = (typeof DATA_IMPORT_ENTITIES)[number];

export function isDataImportEntity(value: string): value is DataImportEntity {
  return (DATA_IMPORT_ENTITIES as readonly string[]).includes(value);
}

/** Limites V1. */
export const DATA_IMPORT_MAX_FILE_BYTES = 20 * 1024 * 1024;
export const DATA_IMPORT_MAX_ROWS = 25_000;
export const DATA_IMPORT_BATCH_SIZE = 50;
/** Séparateur CSV (Excel FR). */
export const DATA_IMPORT_CSV_SEPARATOR = ";";

export interface DataImportRowError {
  row: number;
  field?: string;
  message: string;
  severity: "error" | "warning";
}

export interface DataImportValidateResponse {
  entity: DataImportEntity;
  totalRows: number;
  validRows: number;
  errorCount: number;
  warningCount: number;
  errors: DataImportRowError[];
}

export type DataImportMappingAction = "created" | "updated";

export interface DataImportMapping {
  externalId: string;
  id: string;
  action: DataImportMappingAction;
}

export interface DataImportRunResponse {
  entity: DataImportEntity;
  created: number;
  updated: number;
  skipped: number;
  errors: DataImportRowError[];
  /** Mapping externalId → id Planwise pour les lignes réussies. */
  mappings: DataImportMapping[];
  /** Lot persisté (annulation possible). */
  runId?: string;
}

export interface DataImportBulkResult {
  created: number;
  updated: number;
  skipped: number;
  errors: DataImportRowError[];
  mappings: DataImportMapping[];
}

export type DataImportRunStatus = "completed" | "rolled_back";

export interface DataImportRunStats {
  created: number;
  updated: number;
  skipped: number;
  errorCount: number;
}

export interface DataImportRunSummary {
  id: string;
  organizationId: string;
  entity: DataImportEntity;
  fileName?: string;
  createdByUserId: string;
  createdAt: string;
  status: DataImportRunStatus;
  rolledBackAt?: string;
  stats: DataImportRunStats;
  /** Nombre d’ids créés encore annulables (après rollback = 0 côté affichage). */
  createdCount: number;
}

export interface DataImportRunListResponse {
  items: DataImportRunSummary[];
  total: number;
}

export interface CreateDataImportRunBody {
  organizationId: string;
  entity: DataImportEntity;
  fileName?: string;
  createdByUserId: string;
  stats: DataImportRunStats;
  createdResourceIds: string[];
}

export interface DataImportDeleteCreatedBody {
  organizationId: string;
  entity: DataImportEntity;
  ids: string[];
}

export interface DataImportDeleteCreatedResult {
  deleted: number;
}

export interface DataImportRollbackResponse {
  runId: string;
  entity: DataImportEntity;
  deleted: number;
  status: "rolled_back";
}

// ── Row payloads (microservice / gateway après parse CSV) ──

export interface ImportCustomerRow {
  externalId: string;
  kind: CustomerKind;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  legalIdentifier?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  notes?: string;
}

export interface ImportCustomerSiteRow {
  externalId: string;
  customerExternalId: string;
  label: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode: string;
  city: string;
  country?: string;
  isDefault?: boolean;
  notes?: string;
}

export interface ImportOrderGiverRow {
  externalId: string;
  kind: CustomerKind;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  legalIdentifier?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  notes?: string;
}

export interface ImportArticleRow {
  externalId: string;
  name: string;
  reference: string;
  description?: string;
  unit?: string;
  defaultPrice?: number;
  initialStock?: number;
  reorderPoint?: number;
  targetStock?: number;
  isActive?: boolean;
}

export interface ImportPrestationRow {
  externalId: string;
  name: string;
  reference: string;
  description?: string;
  unit?: string;
  defaultPrice: number;
  defaultTvaRate?: 0 | 5.5 | 10 | 20;
  isActive?: boolean;
}

export interface ImportCaseRow {
  externalId: string;
  title: string;
  description?: string;
  status?: CaseStatus;
  priority?: CasePriority;
  dueDate?: string;
  customerExternalId?: string;
  orderGiverExternalId?: string;
  siteExternalId?: string;
  tags?: string;
}

export interface ImportInterventionRow {
  externalId: string;
  caseExternalId: string;
  title: string;
  description?: string;
  status?: InterventionStatus;
  scheduledStart?: string;
  scheduledEnd?: string;
  startedAt?: string;
  completedAt?: string;
  typeName?: string;
  typeColor?: string;
  assigneeEmail?: string;
  teamName?: string;
  notes?: string;
}

/** Bodies MS : organizationId + rows (+ maps de résolution pour FK). */
export interface ImportCustomersBody {
  organizationId: string;
  rows: ImportCustomerRow[];
}

export interface ImportCustomerSitesBody {
  organizationId: string;
  rows: ImportCustomerSiteRow[];
  /** customerExternalId → customer id */
  customerIdByExternalId: Record<string, string>;
}

export interface ImportOrderGiversBody {
  organizationId: string;
  rows: ImportOrderGiverRow[];
}

export interface ImportArticlesBody {
  organizationId: string;
  rows: ImportArticleRow[];
}

export interface ImportPrestationsBody {
  organizationId: string;
  rows: ImportPrestationRow[];
}

export interface ImportCasesBody {
  organizationId: string;
  rows: ImportCaseRow[];
  customerIdByExternalId?: Record<string, string>;
  orderGiverIdByExternalId?: Record<string, string>;
  siteIdByExternalId?: Record<string, string>;
}

export interface ImportInterventionsBody {
  organizationId: string;
  rows: ImportInterventionRow[];
  caseIdByExternalId: Record<string, string>;
  /** email lowercase → userId */
  assigneeIdByEmail?: Record<string, string>;
  /** team name lowercase → teamId */
  teamIdByName?: Record<string, string>;
}

export function postalAddressFromImportRow(row: {
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}): PostalAddress | undefined {
  const line1 = row.addressLine1?.trim();
  const postalCode = row.postalCode?.trim();
  const city = row.city?.trim();
  if (!line1 || !postalCode || !city) return undefined;
  return {
    line1,
    line2: row.addressLine2?.trim() || undefined,
    postalCode,
    city,
    country: (row.country?.trim() || "FR").toUpperCase(),
  };
}

/** Champs Planwise cibles par entité (pour mapping / conversion). */
export const DATA_IMPORT_TARGET_FIELDS: Record<
  DataImportEntity,
  readonly { key: string; label: string; required?: boolean }[]
> = {
  customers: [
    { key: "externalId", label: "Identifiant source (externalId)", required: true },
    { key: "kind", label: "Type (individual|company)", required: true },
    { key: "firstName", label: "Prénom" },
    { key: "lastName", label: "Nom" },
    { key: "companyName", label: "Raison sociale" },
    { key: "legalIdentifier", label: "SIRET / identifiant légal" },
    { key: "email", label: "E-mail" },
    { key: "phone", label: "Téléphone" },
    { key: "mobile", label: "Mobile" },
    { key: "addressLine1", label: "Adresse ligne 1" },
    { key: "addressLine2", label: "Adresse ligne 2" },
    { key: "postalCode", label: "Code postal" },
    { key: "city", label: "Ville" },
    { key: "country", label: "Pays" },
    { key: "notes", label: "Notes" },
  ],
  customer_sites: [
    { key: "externalId", label: "Identifiant source du site", required: true },
    { key: "customerExternalId", label: "externalId du client", required: true },
    { key: "label", label: "Libellé du site", required: true },
    { key: "addressLine1", label: "Adresse ligne 1", required: true },
    { key: "addressLine2", label: "Adresse ligne 2" },
    { key: "postalCode", label: "Code postal", required: true },
    { key: "city", label: "Ville", required: true },
    { key: "country", label: "Pays" },
    { key: "isDefault", label: "Site par défaut (true/false)" },
    { key: "notes", label: "Notes" },
  ],
  order_givers: [
    { key: "externalId", label: "Identifiant source", required: true },
    { key: "kind", label: "Type (individual|company)", required: true },
    { key: "firstName", label: "Prénom" },
    { key: "lastName", label: "Nom" },
    { key: "companyName", label: "Raison sociale" },
    { key: "legalIdentifier", label: "SIRET / identifiant légal" },
    { key: "email", label: "E-mail" },
    { key: "phone", label: "Téléphone" },
    { key: "mobile", label: "Mobile" },
    { key: "addressLine1", label: "Adresse ligne 1" },
    { key: "addressLine2", label: "Adresse ligne 2" },
    { key: "postalCode", label: "Code postal" },
    { key: "city", label: "Ville" },
    { key: "country", label: "Pays" },
    { key: "notes", label: "Notes" },
  ],
  articles: [
    { key: "externalId", label: "Identifiant source", required: true },
    { key: "name", label: "Nom", required: true },
    { key: "reference", label: "Référence", required: true },
    { key: "description", label: "Description" },
    { key: "unit", label: "Unité" },
    { key: "defaultPrice", label: "Prix par défaut" },
    { key: "initialStock", label: "Stock initial" },
    { key: "reorderPoint", label: "Seuil de réappro" },
    { key: "targetStock", label: "Stock cible" },
  ],
  prestations: [
    { key: "externalId", label: "Identifiant source", required: true },
    { key: "name", label: "Nom", required: true },
    { key: "reference", label: "Référence", required: true },
    { key: "description", label: "Description" },
    { key: "unit", label: "Unité" },
    { key: "defaultPrice", label: "Prix par défaut", required: true },
    { key: "defaultTvaRate", label: "TVA (0|5.5|10|20)" },
  ],
  cases: [
    { key: "externalId", label: "Identifiant source", required: true },
    { key: "title", label: "Libellé (souvent le client)", required: true },
    { key: "description", label: "Description" },
    { key: "status", label: "Statut" },
    { key: "priority", label: "Priorité" },
    { key: "dueDate", label: "Échéance" },
    { key: "customerExternalId", label: "externalId du client" },
    { key: "orderGiverExternalId", label: "externalId du donneur d’ordre" },
    { key: "siteExternalId", label: "externalId du site" },
    { key: "tags", label: "Tags (séparés par |)" },
  ],
  interventions: [
    { key: "externalId", label: "Identifiant source", required: true },
    { key: "caseExternalId", label: "externalId du dossier", required: true },
    { key: "title", label: "Titre", required: true },
    { key: "description", label: "Description" },
    { key: "status", label: "Statut" },
    { key: "scheduledStart", label: "Début planifié" },
    { key: "scheduledEnd", label: "Fin planifiée" },
    { key: "startedAt", label: "Démarré à" },
    { key: "completedAt", label: "Terminé à" },
    { key: "typeName", label: "Type d’intervention (nom)" },
    { key: "typeColor", label: "Couleur type (#RRGGBB)" },
    { key: "assigneeEmail", label: "E-mail assigné" },
    { key: "teamName", label: "Nom d’équipe" },
    { key: "notes", label: "Notes" },
  ],
};

export interface DataImportSuggestMappingRequest {
  entity: DataImportEntity;
  headers: string[];
  /** 3–10 lignes d’exemple max. */
  sampleRows: Record<string, string>[];
}

export interface DataImportSuggestMappingResponse {
  /** Champ Planwise → en-tête source (ou null si non mappé). */
  mapping: Record<string, string | null>;
  confidence: "high" | "medium" | "low";
  notes?: string;
  /** true si heuristique sans LLM. */
  usedLlm: boolean;
}
