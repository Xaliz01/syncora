import { API_BASE, getAccessToken } from "./api-client";
import type { DocumentEntityType, DocumentResponse } from "@syncora/shared";

/** URL absolue utilisable par fetch (stockage local → /api/documents/download/…). */
export function resolveDocumentFileUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const origin = API_BASE.replace(/\/api\/?$/, "");
  if (url.startsWith("/api/")) return `${origin}${url}`;
  if (url.startsWith("/documents/download/")) return `${origin}/api${url}`;
  return url;
}

function needsAuthenticatedFetch(url: string): boolean {
  return url.includes("/api/documents/download/");
}

export async function uploadDocument(
  entityType: DocumentEntityType,
  entityId: string,
  file: File,
): Promise<DocumentResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("Session expirée");

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/documents/upload/${entityType}/${entityId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Erreur lors de l'upload");
  }

  return response.json() as Promise<DocumentResponse>;
}

export async function listDocuments(
  entityType: DocumentEntityType,
  entityId: string,
): Promise<DocumentResponse[]> {
  const token = getAccessToken();
  if (!token) throw new Error("Session expirée");

  const response = await fetch(`${API_BASE}/documents/${entityType}/${entityId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Erreur lors du chargement");
  }

  return response.json() as Promise<DocumentResponse[]>;
}

export async function getDocumentDownloadUrl(documentId: string): Promise<string> {
  const token = getAccessToken();
  if (!token) throw new Error("Session expirée");

  const response = await fetch(`${API_BASE}/documents/${documentId}/download-url`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Erreur");
  }

  const data = (await response.json()) as { url: string };
  return resolveDocumentFileUrl(data.url);
}

/** URL affichable en aperçu (image/PDF : blob + JWT en local, URL directe pour S3). */
export async function fetchDocumentPreviewUrl(documentId: string): Promise<string> {
  const fileUrl = await getDocumentDownloadUrl(documentId);
  if (!needsAuthenticatedFetch(fileUrl)) return fileUrl;

  const token = getAccessToken();
  if (!token) throw new Error("Session expirée");

  const response = await fetch(fileUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Impossible de charger l'aperçu");
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function openDocumentDownload(
  documentId: string,
  originalName: string,
): Promise<void> {
  const fileUrl = await getDocumentDownloadUrl(documentId);
  if (!needsAuthenticatedFetch(fileUrl)) {
    window.open(fileUrl, "_blank");
    return;
  }

  const token = getAccessToken();
  if (!token) throw new Error("Session expirée");

  const response = await fetch(fileUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Erreur lors du téléchargement");
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = originalName;
  anchor.click();
  URL.revokeObjectURL(blobUrl);
}

export async function deleteDocument(documentId: string): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error("Session expirée");

  const response = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Erreur lors de la suppression");
  }
}
