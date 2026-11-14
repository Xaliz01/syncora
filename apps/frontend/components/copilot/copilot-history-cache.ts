import type { QueryClient } from "@tanstack/react-query";
import type { CopilotSessionListResponse, CopilotSessionResponse } from "@planwise/shared";

export const COPILOT_HISTORY_PAGE_SIZE = 20;
export const COPILOT_SESSIONS_QUERY_KEY = ["copilot-sessions"] as const;
export const COPILOT_HISTORY_FOCUS_KEY = ["copilot-history-focus"] as const;

const publishedSessions = new Map<string, CopilotSessionResponse>();

function sameSnapshot(left: CopilotSessionResponse, right: CopilotSessionResponse): boolean {
  return left.status === right.status && left.decision === right.decision;
}

function applySession(
  data: CopilotSessionListResponse,
  offset: number,
  session: CopilotSessionResponse,
  alreadyListed: boolean,
): CopilotSessionListResponse {
  const index = data.sessions.findIndex((item) => item.id === session.id);
  if (index >= 0) {
    const sessions = data.sessions.slice();
    sessions[index] = session;
    return { ...data, sessions };
  }
  if (offset !== 0) return data;
  const sessions = [session, ...data.sessions].slice(0, COPILOT_HISTORY_PAGE_SIZE);
  return {
    total: alreadyListed ? Math.max(data.total, sessions.length) : data.total + 1,
    sessions,
  };
}

/** Rejoue les sessions publiées sur une page renvoyée par l'API. */
export function mergePublishedCopilotSessions(
  data: CopilotSessionListResponse,
  offset: number,
): CopilotSessionListResponse {
  const serverIds = new Set(data.sessions.map((item) => item.id));
  const sessions = data.sessions.map((item) => {
    const published = publishedSessions.get(item.id);
    if (!published) return item;
    if (sameSnapshot(published, item)) {
      publishedSessions.delete(item.id);
      return item;
    }
    return published;
  });

  let total = data.total;
  if (offset === 0) {
    const missing = [...publishedSessions.values()]
      .filter((item) => !serverIds.has(item.id))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (missing.length > 0) {
      sessions.unshift(...missing);
      total += missing.length;
    }
  }

  return {
    total,
    sessions: sessions.slice(0, COPILOT_HISTORY_PAGE_SIZE),
  };
}

/** Insère ou met à jour une session dans l'historique déjà affiché, puis relance le chargement. */
export function publishCopilotSession(
  queryClient: QueryClient,
  session: CopilotSessionResponse,
  options?: { focusLatest?: boolean },
): void {
  const alreadyListed = publishedSessions.has(session.id);
  publishedSessions.set(session.id, session);
  const entries = queryClient.getQueriesData<CopilotSessionListResponse>({
    queryKey: COPILOT_SESSIONS_QUERY_KEY,
  });
  for (const [key, data] of entries) {
    if (!data?.sessions) continue;
    const offset = key[1];
    if (typeof offset !== "number") continue;
    queryClient.setQueryData(key, applySession(data, offset, session, alreadyListed));
  }
  if (options?.focusLatest) {
    queryClient.setQueryData<number>(COPILOT_HISTORY_FOCUS_KEY, (value) =>
      typeof value === "number" ? value + 1 : 1,
    );
  }
  void queryClient.invalidateQueries({ queryKey: COPILOT_SESSIONS_QUERY_KEY });
}
