import {
  DATA_IMPORT_CSV_SEPARATOR,
  DATA_IMPORT_MAX_ROWS,
  type DataImportEntity,
  type DataImportRowError,
  type ImportArticleRow,
  type ImportCaseRow,
  type ImportCustomerRow,
  type ImportCustomerSiteRow,
  type ImportInterventionRow,
  type ImportOrderGiverRow,
  type ImportPrestationRow,
} from "@planwise/shared";

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

/** Parse CSV UTF-8 with `;` separator; supports quoted fields. */
export function parseCsv(content: string, separator = DATA_IMPORT_CSV_SEPARATOR): ParsedCsv {
  const text = content
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const lines = text.split("\n").filter((line, idx, arr) => {
    if (line.trim() === "" && idx === arr.length - 1) return false;
    return true;
  });
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = splitCsvLine(lines[0]!, separator).map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (!line.trim()) continue;
    const cells = splitCsvLine(line, separator);
    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c += 1) {
      row[headers[c]!] = (cells[c] ?? "").trim();
    }
    rows.push(row);
  }
  return { headers, rows };
}

function splitCsvLine(line: string, separator: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === separator) {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

export const ENTITY_REQUIRED_HEADERS: Record<DataImportEntity, string[]> = {
  customers: ["externalId", "kind"],
  customer_sites: [
    "externalId",
    "customerExternalId",
    "label",
    "addressLine1",
    "postalCode",
    "city",
  ],
  order_givers: ["externalId", "kind"],
  articles: ["externalId", "name", "reference"],
  prestations: ["externalId", "name", "reference", "defaultPrice"],
  cases: ["externalId"],
  interventions: ["externalId", "caseExternalId", "title"],
};

export function assertCsvLimits(rowCount: number): DataImportRowError | null {
  if (rowCount > DATA_IMPORT_MAX_ROWS) {
    return {
      row: 0,
      message: `Trop de lignes (${rowCount}). Maximum : ${DATA_IMPORT_MAX_ROWS}.`,
      severity: "error",
    };
  }
  return null;
}

export function validateHeaders(entity: DataImportEntity, headers: string[]): DataImportRowError[] {
  const required = ENTITY_REQUIRED_HEADERS[entity];
  const set = new Set(headers);
  const errors: DataImportRowError[] = [];
  for (const h of required) {
    if (!set.has(h)) {
      errors.push({
        row: 1,
        field: h,
        message: `Colonne manquante : ${h}`,
        severity: "error",
      });
    }
  }
  return errors;
}

function optNum(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function optBool(value: string | undefined): boolean | undefined {
  if (value === undefined || value === "") return undefined;
  const v = value.toLowerCase();
  if (v === "true" || v === "1" || v === "oui" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "non" || v === "no") return false;
  return undefined;
}

export function mapCustomerRows(rows: Record<string, string>[]): ImportCustomerRow[] {
  return rows.map((r) => ({
    externalId: r.externalId ?? "",
    kind: (r.kind as ImportCustomerRow["kind"]) ?? "company",
    firstName: r.firstName || undefined,
    lastName: r.lastName || undefined,
    companyName: r.companyName || undefined,
    legalIdentifier: r.legalIdentifier || undefined,
    email: r.email || undefined,
    phone: r.phone || undefined,
    mobile: r.mobile || undefined,
    addressLine1: r.addressLine1 || undefined,
    addressLine2: r.addressLine2 || undefined,
    postalCode: r.postalCode || undefined,
    city: r.city || undefined,
    country: r.country || undefined,
    notes: r.notes || undefined,
  }));
}

export function mapCustomerSiteRows(rows: Record<string, string>[]): ImportCustomerSiteRow[] {
  return rows.map((r) => ({
    externalId: r.externalId ?? "",
    customerExternalId: r.customerExternalId ?? "",
    label: r.label ?? "",
    addressLine1: r.addressLine1 ?? "",
    addressLine2: r.addressLine2 || undefined,
    postalCode: r.postalCode ?? "",
    city: r.city ?? "",
    country: r.country || undefined,
    isDefault: optBool(r.isDefault),
    notes: r.notes || undefined,
  }));
}

export function mapOrderGiverRows(rows: Record<string, string>[]): ImportOrderGiverRow[] {
  return mapCustomerRows(rows) as ImportOrderGiverRow[];
}

export function mapArticleRows(rows: Record<string, string>[]): ImportArticleRow[] {
  return rows.map((r) => ({
    externalId: r.externalId ?? "",
    name: r.name ?? "",
    reference: r.reference ?? "",
    description: r.description || undefined,
    unit: r.unit || undefined,
    defaultPrice: optNum(r.defaultPrice),
    initialStock: optNum(r.initialStock),
    reorderPoint: optNum(r.reorderPoint),
    targetStock: optNum(r.targetStock),
    // Toujours actifs à l’import (colonne isActive non utilisée).
    isActive: true,
  }));
}

export function mapPrestationRows(rows: Record<string, string>[]): ImportPrestationRow[] {
  return rows.map((r) => ({
    externalId: r.externalId ?? "",
    name: r.name ?? "",
    reference: r.reference ?? "",
    description: r.description || undefined,
    unit: r.unit || undefined,
    defaultPrice: optNum(r.defaultPrice) ?? 0,
    defaultTvaRate: optNum(r.defaultTvaRate) as ImportPrestationRow["defaultTvaRate"],
    // Toujours actifs à l’import (colonne isActive non utilisée).
    isActive: true,
  }));
}

export function mapCaseRows(rows: Record<string, string>[]): ImportCaseRow[] {
  return rows.map((r) => ({
    externalId: r.externalId ?? "",
    reference: r.reference || undefined,
    description: r.description || undefined,
    status: r.status as ImportCaseRow["status"],
    priority: r.priority as ImportCaseRow["priority"],
    dueDate: r.dueDate || undefined,
    customerExternalId: r.customerExternalId || undefined,
    orderGiverExternalId: r.orderGiverExternalId || undefined,
    siteExternalId: r.siteExternalId || undefined,
    tags: r.tags || undefined,
  }));
}

export function mapInterventionRows(rows: Record<string, string>[]): ImportInterventionRow[] {
  return rows.map((r) => ({
    externalId: r.externalId ?? "",
    caseExternalId: r.caseExternalId ?? "",
    title: r.title ?? "",
    description: r.description || undefined,
    status: r.status as ImportInterventionRow["status"],
    scheduledStart: r.scheduledStart || undefined,
    scheduledEnd: r.scheduledEnd || undefined,
    startedAt: r.startedAt || undefined,
    completedAt: r.completedAt || undefined,
    typeName: r.typeName || undefined,
    typeColor: r.typeColor || undefined,
    assigneeEmail: r.assigneeEmail || undefined,
    teamName: r.teamName || undefined,
    notes: r.notes || undefined,
  }));
}
