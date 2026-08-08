import type { AssistantChatRequest, AssistantChatResponse } from "@planwise/shared";
import { getToken } from "./auth.api";
import { fetchWithUserFacingErrors } from "./api-client";

const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:3000/api";

export function isAssistantUiEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ASSISTANT_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") return false;
  return true;
}

export async function postAssistantChat(
  body: AssistantChatRequest,
): Promise<AssistantChatResponse> {
  const token = getToken();
  if (!token) throw new Error("Session expirée");

  const response = await fetchWithUserFacingErrors(`${API_BASE}/assistant/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = (err as { message?: string | string[] }).message;
    if (Array.isArray(message)) throw new Error(message.join(", "));
    throw new Error(message ?? "Assistant indisponible");
  }

  return response.json() as Promise<AssistantChatResponse>;
}
