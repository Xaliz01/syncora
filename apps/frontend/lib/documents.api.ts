import { API_BASE, getAccessToken } from "./api-client";
import type { DocumentEntityType, DocumentResponse } from "@syncora/shared";

export async function uploadDocument(
  entityType: DocumentEntityType,
  entityId: string,
  file: File
): Promise<DocumentResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("Session expirée");

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE}/documents/upload/${entityType}/${entityId}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Erreur lors de l'upload");
  }

  return response.json() as Promise<DocumentResponse>;
}

export async function listDocuments(
  entityType: DocumentEntityType,
  entityId: string
): Promise<DocumentResponse[]> {
  const token = getAccessToken();
  if (!token) throw new Error("Session expirée");

  const response = await fetch(
    `${API_BASE}/documents/${entityType}/${entityId}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Erreur lors du chargement");
  }

  return response.json() as Promise<DocumentResponse[]>;
}

export async function getDocumentDownloadUrl(documentId: string): Promise<string> {
  const token = getAccessToken();
  if (!token) throw new Error("Session expirée");

  const response = await fetch(
    `${API_BASE}/documents/${documentId}/download-url`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Erreur");
  }

  const data = (await response.json()) as { url: string };
  return data.url;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error("Session expirée");

  const response = await fetch(
    `${API_BASE}/documents/${documentId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Erreur lors de la suppression");
  }
}
