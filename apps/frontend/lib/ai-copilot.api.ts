import type {
  AiQuotaStatusResponse,
  CopilotCreateSessionBody,
  CopilotDecideBody,
  CopilotSessionListResponse,
  CopilotSessionResponse,
} from "@planwise/shared";
import { getToken } from "./auth.api";
import { fetchWithUserFacingErrors } from "./api-client";
import { normalizeApiErrorMessage } from "./api-errors";

const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:3000/api";

async function authed(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  if (!token) throw new Error("Session expirée");
  return fetchWithUserFacingErrors(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
}

async function parseError(response: Response, fallback: string): Promise<Error> {
  const err = await response.json().catch(() => ({}));
  const raw = (err as { message?: string | string[] }).message;
  const message = Array.isArray(raw) ? raw.join(", ") : raw;
  return new Error(normalizeApiErrorMessage(response.status, message, fallback));
}

export async function createCopilotSession(
  body: CopilotCreateSessionBody,
): Promise<CopilotSessionResponse> {
  const response = await authed("/ai/copilot/sessions", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await parseError(response, "Le copilote n'a pas pu lire l'instruction.");
  return response.json() as Promise<CopilotSessionResponse>;
}

export async function decideCopilotSession(
  sessionId: string,
  body: CopilotDecideBody,
): Promise<CopilotSessionResponse> {
  const response = await authed(`/ai/copilot/sessions/${sessionId}/decide`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await parseError(response, "L'instruction n'a pas pu être enregistrée.");
  return response.json() as Promise<CopilotSessionResponse>;
}

export async function listCopilotSessions(params: {
  limit: number;
  offset: number;
}): Promise<CopilotSessionListResponse> {
  const query = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  });
  const response = await authed(`/ai/copilot/sessions?${query.toString()}`);
  if (!response.ok) throw await parseError(response, "L'historique du copilote est indisponible.");
  return response.json() as Promise<CopilotSessionListResponse>;
}

export async function getCopilotQuota(): Promise<AiQuotaStatusResponse> {
  const response = await authed("/ai/copilot/quota");
  if (!response.ok) throw await parseError(response, "Le quota du copilote est indisponible.");
  return response.json() as Promise<AiQuotaStatusResponse>;
}

export async function fetchCopilotAudio(sessionId: string): Promise<Blob> {
  const response = await authed(`/ai/copilot/sessions/${sessionId}/audio`);
  if (!response.ok) throw await parseError(response, "L'enregistrement est indisponible.");
  return response.blob();
}
