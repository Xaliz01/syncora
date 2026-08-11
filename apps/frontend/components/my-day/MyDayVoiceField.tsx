"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useToast } from "@/components/ui/ToastProvider";
import * as accountApi from "@/lib/account.api";
import * as api from "@/lib/cases.api";
import type {
  InterventionResponse,
  VoiceFieldIntent,
  VoiceFieldInterventionRef,
} from "@planwise/shared";
import {
  isVoiceFieldAffirmUtterance,
  isVoiceFieldCancelUtterance,
  parseVoiceFieldChoiceIndex,
  resolveVoiceFieldTarget,
  voiceFieldTitlesMatch,
} from "@planwise/shared";
import {
  useVoiceFieldCommands,
  type VoiceFieldIntentHandlerResult,
} from "@/lib/hooks/useVoiceFieldCommands";
import { speakVoiceFieldFeedback, voiceFieldHelpLines } from "@/lib/voice-field";

const VOICE_PICK_PROMPTS: Record<
  Exclude<VoiceFieldIntent["kind"], "unknown" | "next">,
  { title: string; ask: string }
> = {
  start: {
    title: "Laquelle démarrer ?",
    ask: "Plusieurs interventions. Laquelle démarrer ?",
  },
  complete: {
    title: "Laquelle terminer ?",
    ask: "Plusieurs interventions en cours. Laquelle terminer ?",
  },
  comment: {
    title: "Sur laquelle noter ?",
    ask: "Plusieurs interventions. Sur laquelle ajouter le commentaire ?",
  },
  open_case: {
    title: "Quel dossier ouvrir ?",
    ask: "Plusieurs interventions. Quel dossier ouvrir ?",
  },
};

export function MyDayVoiceField({
  interventions,
  viewingToday,
  onStart,
  onComplete,
  lastStartedId = null,
}: {
  interventions: InterventionResponse[];
  viewingToday: boolean;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  /** Mis à jour quand une intervention est démarrée depuis la carte (focus vocal). */
  lastStartedId?: string | null;
}) {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { showToast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: accountPrefs } = useQuery({
    queryKey: ["account-preferences", user?.id, user?.organizationId],
    queryFn: () => accountApi.getPreferences(),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
  const voiceFieldEnabledPreference = accountPrefs?.preferences.voiceFieldEnabled === true;

  const [voiceFocusId, setVoiceFocusId] = useState<string | null>(null);
  const [voicePick, setVoicePick] = useState<{
    intent: VoiceFieldIntent;
    candidates: VoiceFieldInterventionRef[];
  } | null>(null);
  const [voiceCommentDraft, setVoiceCommentDraft] = useState<{
    interventionId: string;
    title: string;
  } | null>(null);
  const [voiceCompletePending, setVoiceCompletePending] = useState<{
    interventionId: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    if (lastStartedId) setVoiceFocusId(lastStartedId);
  }, [lastStartedId]);

  const voiceRefs = useMemo(
    () =>
      interventions.map((i) => ({
        id: i.id,
        caseId: i.caseId,
        title: i.title,
        status: i.status,
        scheduledStart: i.scheduledStart,
      })),
    [interventions],
  );

  const postVoiceComment = useCallback(
    async (interventionId: string, body: string) => {
      try {
        await api.createComment({
          entityType: "intervention",
          entityId: interventionId,
          body,
        });
        setVoiceCommentDraft(null);
        showToast("Commentaire ajouté", "success");
        speakVoiceFieldFeedback("Commentaire ajouté");
        void queryClient.invalidateQueries({
          queryKey: ["comments", "intervention", interventionId],
        });
        return true;
      } catch {
        showToast("Impossible d’ajouter le commentaire", "error");
        return false;
      }
    },
    [queryClient, showToast],
  );

  const requestVoiceComplete = useCallback(
    (intervention: { id: string; title: string }): VoiceFieldIntentHandlerResult => {
      setVoiceCompletePending({
        interventionId: intervention.id,
        title: intervention.title,
      });
      speakVoiceFieldFeedback(`Terminer ${intervention.title} ? Dites oui, ou annuler.`);
      return { continueListening: true };
    },
    [],
  );

  const confirmVoiceComplete = useCallback(() => {
    if (!voiceCompletePending) return;
    const { interventionId } = voiceCompletePending;
    setVoiceCompletePending(null);
    onComplete(interventionId);
    speakVoiceFieldFeedback("Intervention terminée");
  }, [onComplete, voiceCompletePending]);

  const applyVoicePickedIntervention = useCallback(
    async (
      pending: VoiceFieldIntent,
      picked: VoiceFieldInterventionRef,
    ): Promise<void | VoiceFieldIntentHandlerResult> => {
      setVoicePick(null);
      setVoiceFocusId(picked.id);
      if (pending.kind === "start") {
        onStart(picked.id);
        speakVoiceFieldFeedback(`Démarrage de ${picked.title}`);
        return;
      }
      if (pending.kind === "complete") {
        return requestVoiceComplete(picked);
      }
      if (pending.kind === "comment") {
        const body = pending.commentText?.trim();
        if (!body) {
          setVoiceCommentDraft({ interventionId: picked.id, title: picked.title });
          speakVoiceFieldFeedback("Quel est le commentaire ?");
          return { continueListening: true };
        }
        await postVoiceComment(picked.id, body);
        return;
      }
      if (pending.kind === "open_case") {
        router.push(`/cases/${picked.caseId}`);
        speakVoiceFieldFeedback("Ouverture du dossier");
      }
    },
    [onStart, postVoiceComment, requestVoiceComplete, router],
  );

  const handleVoiceIntent = useCallback(
    async (intent: VoiceFieldIntent): Promise<void | VoiceFieldIntentHandlerResult> => {
      if (
        (voicePick || voiceCommentDraft || voiceCompletePending) &&
        isVoiceFieldCancelUtterance(intent.raw)
      ) {
        setVoicePick(null);
        setVoiceCommentDraft(null);
        setVoiceCompletePending(null);
        speakVoiceFieldFeedback("Annulé");
        return;
      }

      if (voiceCompletePending) {
        if (isVoiceFieldAffirmUtterance(intent.raw) || intent.kind === "complete") {
          confirmVoiceComplete();
          return;
        }
        const raw = intent.raw.trim().toLocaleLowerCase("fr");
        if (raw === "non" || raw === "no") {
          setVoiceCompletePending(null);
          speakVoiceFieldFeedback("Annulé");
          return;
        }
        speakVoiceFieldFeedback("Dites oui pour terminer, ou annuler.");
        return { continueListening: true };
      }

      if (voiceCommentDraft) {
        if (intent.kind === "comment") {
          const text = intent.commentText?.trim();
          if (!text) {
            speakVoiceFieldFeedback("Dictez le texte du commentaire.");
            return { continueListening: true };
          }
          await postVoiceComment(voiceCommentDraft.interventionId, text);
          return;
        }
        if (intent.kind === "unknown") {
          const body = intent.raw.trim();
          if (!body) {
            speakVoiceFieldFeedback("Je n’ai pas compris. Dictez le commentaire.");
            return { continueListening: true };
          }
          await postVoiceComment(voiceCommentDraft.interventionId, body);
          return;
        }
        setVoiceCommentDraft(null);
      }

      if (intent.kind === "unknown") {
        if (voicePick) {
          const ordinal = parseVoiceFieldChoiceIndex(intent.raw, voicePick.candidates.length);
          if (ordinal !== null) {
            const picked = voicePick.candidates[ordinal];
            if (picked) return applyVoicePickedIntervention(voicePick.intent, picked);
          }
          const raw = intent.raw.toLocaleLowerCase("fr");
          const match = voicePick.candidates.find((c) => voiceFieldTitlesMatch(c.title, raw));
          if (match) {
            return applyVoicePickedIntervention(voicePick.intent, match);
          }
          speakVoiceFieldFeedback(
            "Je n’ai pas compris. Dites le numéro, par exemple la troisième, ou annuler.",
          );
          return { continueListening: true };
        }
        const hint = voiceFieldHelpLines()
          .slice(0, 2)
          .map((l) => l.split(" — ")[0])
          .join(", ");
        showToast(`Commande non reconnue. Essayez : ${hint}…`, "error");
        speakVoiceFieldFeedback("Commande non reconnue. Essayez par exemple démarre, ou termine.");
        return;
      }

      if (intent.kind === "start" && !can("interventions.update")) {
        const msg = "Droit insuffisant pour démarrer";
        showToast(msg, "error");
        speakVoiceFieldFeedback(msg);
        return;
      }
      if (intent.kind === "complete" && !can("interventions.update")) {
        const msg = "Droit insuffisant pour terminer";
        showToast(msg, "error");
        speakVoiceFieldFeedback(msg);
        return;
      }
      if (intent.kind === "comment" && !can("comments.create")) {
        const msg = "Droit insuffisant pour commenter";
        showToast(msg, "error");
        speakVoiceFieldFeedback(msg);
        return;
      }
      if (intent.kind === "open_case" && !can("cases.read")) {
        const msg = "Droit insuffisant pour ouvrir le dossier";
        showToast(msg, "error");
        speakVoiceFieldFeedback(msg);
        return;
      }

      if (intent.kind === "next") {
        setVoicePick(null);
        setVoiceCommentDraft(null);
        setVoiceCompletePending(null);
        const target = resolveVoiceFieldTarget(voiceRefs, {
          preferStatus: "planned",
          onAmbiguous: "earliest",
        });
        if (!target.ok) {
          const msg = "Aucune intervention planifiée aujourd’hui";
          showToast(msg, "error");
          speakVoiceFieldFeedback(msg);
          return;
        }
        setVoiceFocusId(target.intervention.id);
        const msg = `Prochaine : ${target.intervention.title}`;
        showToast(msg, "success");
        speakVoiceFieldFeedback(msg);
        return;
      }

      const preferStatus =
        intent.kind === "start" ? "planned" : intent.kind === "complete" ? "in_progress" : "todo";
      const target = resolveVoiceFieldTarget(voiceRefs, {
        focusedId: voiceFocusId,
        preferStatus,
        targetHint: intent.targetHint,
      });
      if (!target.ok) {
        if (target.reason === "none") {
          setVoicePick(null);
          let msg: string;
          if (intent.targetHint && target.candidates.length === 1) {
            const title = target.candidates[0]!.title;
            msg =
              intent.kind === "complete"
                ? `${title} n’est pas en cours`
                : intent.kind === "start"
                  ? `${title} n’est pas à démarrer`
                  : `Impossible d’agir sur ${title}`;
          } else if (intent.targetHint) {
            msg =
              intent.kind === "complete"
                ? "Intervention introuvable parmi celles en cours"
                : intent.kind === "start"
                  ? "Intervention introuvable parmi celles à démarrer"
                  : "Intervention introuvable";
          } else {
            msg =
              intent.kind === "complete"
                ? "Aucune intervention en cours"
                : intent.kind === "start"
                  ? "Aucune intervention à démarrer"
                  : "Aucune intervention cible";
          }
          showToast(msg, "error");
          speakVoiceFieldFeedback(msg);
          return;
        }
        setVoicePick({ intent, candidates: target.candidates });
        const prompt =
          intent.kind in VOICE_PICK_PROMPTS
            ? VOICE_PICK_PROMPTS[intent.kind as keyof typeof VOICE_PICK_PROMPTS]
            : { title: "Laquelle choisir ?", ask: "Plusieurs interventions. Laquelle ?" };
        const names = target.candidates.map((c, i) => `${i + 1}. ${c.title}`).join(". ");
        showToast(`${prompt.ask} ${names}`, "error");
        speakVoiceFieldFeedback(prompt.ask);
        return { continueListening: true };
      }

      setVoicePick(null);
      const intervention = target.intervention;
      setVoiceFocusId(intervention.id);

      if (intent.kind === "start") {
        onStart(intervention.id);
        speakVoiceFieldFeedback(`Démarrage de ${intervention.title}`);
        return;
      }

      if (intent.kind === "complete") {
        return requestVoiceComplete(intervention);
      }

      if (intent.kind === "comment") {
        const body = intent.commentText?.trim();
        if (!body) {
          setVoiceCommentDraft({
            interventionId: intervention.id,
            title: intervention.title,
          });
          speakVoiceFieldFeedback("Quel est le commentaire ?");
          return { continueListening: true };
        }
        await postVoiceComment(intervention.id, body);
        return;
      }

      if (intent.kind === "open_case") {
        router.push(`/cases/${intervention.caseId}`);
        speakVoiceFieldFeedback("Ouverture du dossier");
      }
    },
    [
      applyVoicePickedIntervention,
      can,
      confirmVoiceComplete,
      onStart,
      postVoiceComment,
      requestVoiceComplete,
      router,
      showToast,
      voiceCommentDraft,
      voiceCompletePending,
      voiceFocusId,
      voicePick,
      voiceRefs,
    ],
  );

  const voice = useVoiceFieldCommands({
    enabled: viewingToday && can("interventions.read"),
    voiceFieldEnabledPreference,
    onIntent: handleVoiceIntent,
    onError: (message) => showToast(message, "error"),
  });

  if (!voice.available) return null;

  return (
    <>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={() => voice.toggle()}
          aria-label={
            voice.needsGesture
              ? "Autoriser le micro pour les commandes vocales"
              : voice.state === "listening" || voice.state === "processing"
                ? "Revenir à la veille"
                : "Parler maintenant (sans dire Planwise ni Plan)"
          }
          aria-pressed={voice.state === "listening" || voice.state === "standby"}
          title={
            voice.needsGesture
              ? "Le navigateur demande une autorisation micro (une fois)"
              : "Appui = dicter une commande · ou dites « Planwise » ou « Plan » sans appuyer"
          }
          className={`flex h-11 w-11 items-center justify-center rounded-full shadow-md transition active:scale-95 ${
            voice.state === "listening"
              ? "bg-red-600 text-white ring-4 ring-red-300/50 animate-pulse"
              : voice.state === "standby"
                ? "bg-brand-600 text-white ring-4 ring-brand-300/40"
                : voice.state === "processing"
                  ? "bg-amber-500 text-white"
                  : voice.needsGesture
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          }`}
        >
          {voice.state !== "idle" && voice.state !== "processing" ? (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
            </svg>
          )}
        </button>
        {(voice.needsGesture && voice.state === "idle") ||
        (voice.available && voice.state === "idle" && !voice.needsGesture) ||
        voice.state === "standby" ||
        voice.state === "listening" ||
        voice.interimTranscript ||
        voice.lastTranscript ? (
          <div className="max-w-[14rem] rounded-lg border border-slate-200 dark:border-slate-600 bg-white/95 dark:bg-slate-900/95 px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-200 shadow-sm text-right">
            {voice.needsGesture && voice.state === "idle" ? (
              <span className="text-amber-700 dark:text-amber-300 font-medium">
                Appui unique pour autoriser le micro
              </span>
            ) : null}
            {voice.available && voice.state === "idle" && !voice.needsGesture ? (
              <span className="text-slate-500 font-medium">Démarrage de la veille…</span>
            ) : null}
            {voice.state === "standby" && !voice.interimTranscript ? (
              <span className="text-brand-600 dark:text-brand-400 font-medium">
                Dites « Planwise » ou « Plan »
              </span>
            ) : null}
            {voice.state === "listening" && !voice.interimTranscript ? (
              <span className="text-brand-600 dark:text-brand-400 font-medium">
                {voiceCompletePending
                  ? "Confirmez — dites « oui » ou « annuler »"
                  : voiceCommentDraft
                    ? "Dictez le commentaire…"
                    : voicePick
                      ? "Choix — dites « la première »…"
                      : "Commande — ex. « démarre »"}
              </span>
            ) : null}
            {voice.interimTranscript ? (
              <span className="italic text-slate-500">
                {voice.state === "standby" ? "J’entends : " : ""}
                {voice.interimTranscript}
              </span>
            ) : null}
            {!voice.interimTranscript && voice.state === "standby" && voice.lastStandbyMiss ? (
              <span className="block text-slate-400 truncate" title={voice.lastStandbyMiss}>
                Dernier : « {voice.lastStandbyMiss} » (pas reconnu comme activation)
              </span>
            ) : null}
            {voice.state === "processing" && voice.lastTranscript ? (
              <span>« {voice.lastTranscript} »</span>
            ) : null}
          </div>
        ) : null}
      </div>

      {voiceCompletePending ? (
        <VoiceFieldModal
          title="Terminer l’intervention ?"
          description={`Confirmer la clôture de « ${voiceCompletePending.title} ». Dites « oui » ou « terminer », ou « annuler ».`}
          confirmLabel="Terminer"
          confirmVariant="danger"
          onConfirm={() => {
            confirmVoiceComplete();
            voice.resumeStandby();
          }}
          onClose={() => {
            setVoiceCompletePending(null);
            voice.resumeStandby();
          }}
        />
      ) : null}

      {voiceCommentDraft ? (
        <VoiceFieldModal
          title={`Commentaire — ${voiceCommentDraft.title}`}
          description="Dictez le texte du commentaire, ou dites « annuler » / « retour »."
          onClose={() => {
            setVoiceCommentDraft(null);
            voice.resumeStandby();
          }}
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Micro en écoute — pas besoin de redire Planwise ni Plan.
          </p>
        </VoiceFieldModal>
      ) : null}

      {voicePick ? (
        <VoiceFieldModal
          title={
            voicePick.intent.kind in VOICE_PICK_PROMPTS
              ? VOICE_PICK_PROMPTS[voicePick.intent.kind as keyof typeof VOICE_PICK_PROMPTS].title
              : "Laquelle choisir ?"
          }
          description="Touchez une intervention, ou dites « la première », « la troisième », « numéro 4 », « annuler »…"
          onClose={() => {
            setVoicePick(null);
            voice.resumeStandby();
          }}
        >
          <ul className="flex flex-col gap-2">
            {voicePick.candidates.map((c, index) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-3 text-left text-sm text-slate-800 dark:text-slate-100 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/50 transition focus:outline-none focus:ring-2 focus:ring-brand-400"
                  onClick={() => {
                    void applyVoicePickedIntervention(voicePick.intent, c).then((result) => {
                      if (result?.continueListening) {
                        voice.requestContinueListening();
                      } else {
                        voice.resumeStandby();
                      }
                    });
                  }}
                >
                  <span className="font-semibold text-brand-700 dark:text-brand-300">
                    {index + 1}.
                  </span>{" "}
                  {c.title}
                </button>
              </li>
            ))}
          </ul>
        </VoiceFieldModal>
      ) : null}
    </>
  );
}

function VoiceFieldModal({
  title,
  description,
  onClose,
  onConfirm,
  confirmLabel,
  confirmVariant = "default",
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmVariant?: "default" | "danger";
  children?: React.ReactNode;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[3px]"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-field-dialog-title"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-900/5"
      >
        <div className="p-6">
          <h2
            id="voice-field-dialog-title"
            className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {description}
            </p>
          ) : null}
          {children ? <div className="mt-4">{children}</div> : null}
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
            >
              Annuler
            </button>
            {onConfirm && confirmLabel ? (
              <button
                type="button"
                onClick={onConfirm}
                className={
                  confirmVariant === "danger"
                    ? "rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                    : "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                }
              >
                {confirmLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
