import type {
  DataImportEntity,
  DataImportRollbackResponse,
  DataImportRunListResponse,
  DataImportRunResponse,
  DataImportSuggestMappingRequest,
  DataImportSuggestMappingResponse,
  DataImportValidateResponse,
} from "@planwise/shared";
import { API_BASE, fetchWithUserFacingErrors, getAccessToken } from "./api-client";

async function postImportFile(
  path: string,
  entity: DataImportEntity,
  file: File,
): Promise<DataImportValidateResponse | DataImportRunResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("Session expirée");
  const form = new FormData();
  form.append("file", file);
  const res = await fetchWithUserFacingErrors(
    `${API_BASE}${path}?entity=${encodeURIComponent(entity)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { message?: string | string[] }).message ?? `Erreur import (${res.status})`;
    throw new Error(Array.isArray(message) ? message.join(", ") : String(message));
  }
  return data as DataImportValidateResponse | DataImportRunResponse;
}

export function validateDataImport(
  entity: DataImportEntity,
  file: File,
): Promise<DataImportValidateResponse> {
  return postImportFile("/imports/validate", entity, file) as Promise<DataImportValidateResponse>;
}

export function runDataImport(
  entity: DataImportEntity,
  file: File,
): Promise<DataImportRunResponse> {
  return postImportFile("/imports/run", entity, file) as Promise<DataImportRunResponse>;
}

export async function suggestDataImportMapping(
  body: DataImportSuggestMappingRequest,
): Promise<DataImportSuggestMappingResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("Session expirée");
  const res = await fetchWithUserFacingErrors(`${API_BASE}/imports/suggest-mapping`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { message?: string | string[] }).message ?? `Erreur mapping (${res.status})`;
    throw new Error(Array.isArray(message) ? message.join(", ") : String(message));
  }
  return data as DataImportSuggestMappingResponse;
}

export async function listDataImportRuns(opts?: {
  limit?: number;
  offset?: number;
}): Promise<DataImportRunListResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("Session expirée");
  const params = new URLSearchParams();
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  const res = await fetchWithUserFacingErrors(`${API_BASE}/imports/runs${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { message?: string | string[] }).message ?? `Erreur historique (${res.status})`;
    throw new Error(Array.isArray(message) ? message.join(", ") : String(message));
  }
  return data as DataImportRunListResponse;
}

export async function rollbackDataImportRun(runId: string): Promise<DataImportRollbackResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("Session expirée");
  const res = await fetchWithUserFacingErrors(
    `${API_BASE}/imports/runs/${encodeURIComponent(runId)}/rollback`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { message?: string | string[] }).message ?? `Annulation impossible (${res.status})`;
    throw new Error(Array.isArray(message) ? message.join(", ") : String(message));
  }
  return data as DataImportRollbackResponse;
}

export const DATA_IMPORT_ENTITY_META: Record<
  DataImportEntity,
  { label: string; templateFile: string; order: number; hint: string; details: string[] }
> = {
  customers: {
    label: "Clients",
    templateFile: "clients.csv",
    order: 1,
    hint: "Importer en premier.",
    details: [
      "externalId : identifiant unique de ce client dans votre ancien CRM (ex. CLI-001). Conservez la même valeur pour le retrouver au ré-import et pour y faire référence depuis les sites ou dossiers.",
    ],
  },
  customer_sites: {
    label: "Sites clients",
    templateFile: "sites_clients.csv",
    order: 2,
    hint: "Après les clients.",
    details: [
      "externalId : identifiant unique de ce site dans votre ancien CRM (ex. SITE-001).",
      "customerExternalId : doit reprendre exactement l’externalId du client déjà importé (ex. CLI-001).",
    ],
  },
  order_givers: {
    label: "Donneurs d’ordre",
    templateFile: "donneurs_ordre.csv",
    order: 3,
    hint: "Indépendant des clients.",
    details: [
      "externalId : identifiant unique de ce donneur d’ordre dans votre ancien CRM (ex. DO-001). Réutilisez-le dans les dossiers via orderGiverExternalId.",
    ],
  },
  articles: {
    label: "Articles",
    templateFile: "articles.csv",
    order: 4,
    hint: "Catalogue stock.",
    details: ["externalId : identifiant unique de l’article dans votre ancien CRM (ex. ART-001)."],
  },
  prestations: {
    label: "Prestations",
    templateFile: "prestations.csv",
    order: 5,
    hint: "Catalogue prestations",
    details: [
      "externalId : identifiant unique de la prestation dans votre ancien CRM (ex. PREST-001).",
    ],
  },
  cases: {
    label: "Dossiers",
    templateFile: "dossiers.csv",
    order: 6,
    hint: "Après clients / sites / donneurs d’ordre.",
    details: [
      "externalId : identifiant unique du dossier dans votre ancien CRM (ex. DOS-001).",
      "customerExternalId : externalId du client déjà importé (colonne externalId du fichier clients.csv).",
      "orderGiverExternalId : externalId du donneur d’ordre déjà importé (fichier donneurs_ordre.csv).",
      "siteExternalId : externalId du site client déjà importé (fichier sites_clients.csv).",
    ],
  },
  interventions: {
    label: "Interventions",
    templateFile: "interventions.csv",
    order: 7,
    hint: "Après les dossiers ; historique autorisé.",
    details: [
      "externalId : identifiant unique de l’intervention dans votre ancien CRM (ex. INT-001).",
      "caseExternalId : externalId du dossier déjà importé (colonne externalId du fichier dossiers.csv).",
    ],
  },
};
