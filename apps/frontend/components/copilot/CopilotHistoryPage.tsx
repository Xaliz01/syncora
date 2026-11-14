"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  COPILOT_ACTION_LABELS,
  repairCopilotIntent,
  type CopilotSessionResponse,
} from "@planwise/shared";
import { ListPageHeader, ListPageRoot, ListPagination } from "@/components/ui/list-page";
import { AppErrorAlert } from "@/components/ui/AppErrorAlert";
import { PlanwiseLoader } from "@/components/ui/PlanwiseLoader";
import { fetchCopilotAudio, listCopilotSessions } from "@/lib/ai-copilot.api";
import { CopilotReviewDialog } from "./CopilotReviewDialog";
import {
  COPILOT_HISTORY_FOCUS_KEY,
  COPILOT_HISTORY_PAGE_SIZE,
  COPILOT_SESSIONS_QUERY_KEY,
  mergePublishedCopilotSessions,
  publishCopilotSession,
} from "./copilot-history-cache";

const DECISION_LABELS: Record<string, string> = {
  confirmed: "Confirmée",
  edited: "Modifiée puis confirmée",
  rejected: "Ignorée",
};

const STATUS_LABELS: Record<CopilotSessionResponse["status"], string> = {
  pending: "En attente de confirmation",
  confirmed: "Enregistrée",
  rejected: "Ignorée",
  llm_unavailable: "À réessayer",
};

function safeHref(href?: string): string | undefined {
  if (!href || !href.startsWith("/") || href.startsWith("//")) return undefined;
  return href;
}

export function CopilotHistoryPage() {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [review, setReview] = useState<CopilotSessionResponse | null>(null);
  const [audioError, setAudioError] = useState("");
  const focus = useQuery({
    queryKey: COPILOT_HISTORY_FOCUS_KEY,
    queryFn: () => 0,
    enabled: false,
    initialData: 0,
    staleTime: Infinity,
  });
  const query = useQuery({
    queryKey: [...COPILOT_SESSIONS_QUERY_KEY, offset],
    queryFn: async () =>
      mergePublishedCopilotSessions(
        await listCopilotSessions({ limit: COPILOT_HISTORY_PAGE_SIZE, offset }),
        offset,
      ),
  });

  useEffect(() => {
    if ((focus.data ?? 0) > 0) setOffset(0);
  }, [focus.data]);

  async function play(sessionId: string) {
    setAudioError("");
    try {
      const blob = await fetchCopilotAudio(sessionId);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : "L'enregistrement est indisponible.");
    }
  }

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Copilote"
        description="Ce que vous avez dit, ce qui a été proposé, et ce qui a été enregistré dans le CRM."
      />
      {query.isLoading ? <PlanwiseLoader /> : null}
      {query.error ? (
        <AppErrorAlert error={query.error} fallbackMessage="L'historique est indisponible." />
      ) : null}
      {audioError ? <AppErrorAlert message={audioError} /> : null}
      {query.data && query.data.sessions.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aucune instruction pour le moment. Le bouton Dicter une instruction est disponible sur
          toutes les pages.
        </p>
      ) : null}
      {query.data && query.data.sessions.length > 0 ? (
        <ListPagination
          offset={offset}
          limit={COPILOT_HISTORY_PAGE_SIZE}
          total={query.data.total}
          onOffsetChange={setOffset}
        >
          <ul className="space-y-3">
            {query.data.sessions.map((session) => (
              <li
                key={session.id}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {session.userName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(session.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">
                  {session.transcript}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {repairCopilotIntent(session.intent, session.actions)} ·{" "}
                  {DECISION_LABELS[session.decision ?? ""] ?? STATUS_LABELS[session.status]}
                </p>
                {session.message ? (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {session.message}
                  </p>
                ) : null}
                <ul className="mt-3 space-y-1">
                  {session.actions.map((action) => (
                    <li key={action.id} className="text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-medium">{COPILOT_ACTION_LABELS[action.type]}.</span>{" "}
                      {action.summary}
                      {action.result && safeHref(action.result.href) ? (
                        <>
                          {" "}
                          <Link
                            href={safeHref(action.result.href)!}
                            className="font-medium text-brand-600 hover:text-brand-500"
                          >
                            {action.result.label}
                          </Link>
                        </>
                      ) : null}
                      {action.blockReason &&
                      action.blockReason !== action.summary &&
                      action.status !== "confirmed" ? (
                        <span className="block text-xs text-slate-500">{action.blockReason}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  {session.status === "pending" ? (
                    <button
                      type="button"
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
                      onClick={() => setReview(session)}
                    >
                      Revoir
                    </button>
                  ) : null}
                  {session.audioAvailable ? (
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-600"
                      onClick={() => void play(session.id)}
                    >
                      Écouter
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </ListPagination>
      ) : null}
      <CopilotReviewDialog
        session={review}
        onClose={() => setReview(null)}
        onDecided={(updated) => {
          setReview(updated);
          publishCopilotSession(queryClient, updated);
        }}
      />
    </ListPageRoot>
  );
}
