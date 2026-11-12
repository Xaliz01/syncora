"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  copilotContextFromPathname,
  copilotQuotaRemainingLabel,
  type CopilotSessionResponse,
} from "@planwise/shared";
import { useAuth } from "@/components/auth/AuthContext";
import { hasPermission } from "@/lib/auth-permissions";
import {
  FormDialog,
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  formFieldHintClassName,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";
import { createCopilotSession, getCopilotQuota } from "@/lib/ai-copilot.api";
import { CopilotReviewDialog } from "./CopilotReviewDialog";

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

function speechConstructor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("audio"));
    reader.readAsDataURL(blob);
  });
}

export function CopilotDictaphone() {
  const { user } = useAuth();
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [writeMode, setWriteMode] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [micMessage, setMicMessage] = useState("");
  const [quotaLabel, setQuotaLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState<CopilotSessionResponse | null>(null);
  const [mounted, setMounted] = useState(false);
  const recognitionRef = useRef<SpeechRec | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      recognitionRef.current?.stop();
    };
  }, []);

  if (!user || !hasPermission(user, "ai.copilot")) return null;

  async function openPanel() {
    setOpen(true);
    setError("");
    setMicMessage("");
    try {
      const quota = await getCopilotQuota();
      setQuotaLabel(copilotQuotaRemainingLabel(quota.tier, quota.remaining));
    } catch (err) {
      setQuotaLabel("");
      setError(err instanceof Error ? err.message : "Le quota du copilote est indisponible.");
    }
  }

  function stopCapture(): Promise<Blob | null> {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    const recorder = recorderRef.current;
    const stream = streamRef.current;
    recorderRef.current = null;
    setRecording(false);
    return new Promise((resolve) => {
      const finish = () => {
        stream?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        resolve(blobRef.current);
      };
      if (!recorder || recorder.state === "inactive") {
        finish();
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        blobRef.current = blob.size > 0 ? blob : null;
        finish();
      };
      recorder.stop();
    });
  }

  async function startRecording() {
    setError("");
    setMicMessage("");
    blobRef.current = null;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicMessage("Ce navigateur ne donne pas accès au micro. Écrivez l'instruction.");
      setWriteMode(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start();
      recorderRef.current = recorder;
      const Ctor = speechConstructor();
      if (Ctor) {
        const recognition = new Ctor();
        recognition.lang = "fr-FR";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          let text = "";
          for (let index = 0; index < event.results.length; index += 1) {
            text += event.results[index]?.[0]?.transcript ?? "";
          }
          setTranscript(text.trim());
        };
        recognition.onerror = () => {
          setMicMessage(
            "La dictée n'a pas pu être transcrite. Écrivez l'instruction pour continuer.",
          );
          setWriteMode(true);
        };
        recognition.start();
        recognitionRef.current = recognition;
      } else {
        setMicMessage("La transcription vocale n'est pas disponible ici. Écrivez l'instruction.");
        setWriteMode(true);
      }
      setRecording(true);
    } catch {
      setMicMessage(
        "Le micro est bloqué. Autorisez-le dans le navigateur, ou écrivez l'instruction.",
      );
      setWriteMode(true);
      setRecording(false);
    }
  }

  async function submit() {
    const text = transcript.trim();
    if (!text) {
      setError("Dictez ou écrivez une instruction avant de l'envoyer.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const blob = await stopCapture();
      let audio: { audioBase64: string; audioMimeType: string } | undefined;
      if (blob && blob.size > 1_400_000) {
        setMicMessage("L'enregistrement est trop long pour être conservé. Le texte sera envoyé.");
      } else if (blob && blob.size > 0) {
        audio = { audioBase64: await blobToBase64(blob), audioMimeType: blob.type || "audio/webm" };
      }
      const context = copilotContextFromPathname(pathname);
      const session = await createCopilotSession({
        transcript: text,
        context,
        ...audio,
      });
      setOpen(false);
      setReview(session);
      setTranscript("");
      blobRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le copilote n'a pas pu lire l'instruction.");
    } finally {
      setBusy(false);
    }
  }

  const button = (
    <button
      type="button"
      onClick={() => void openPanel()}
      className="fixed bottom-24 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
      aria-label="Dicter une instruction"
    >
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
        />
      </svg>
    </button>
  );

  return (
    <>
      {mounted ? createPortal(button, document.body) : null}
      <FormDialog
        open={open}
        onClose={() => {
          stopCapture();
          setOpen(false);
        }}
        title="Dicter une instruction"
        description="Décrivez le compte-rendu, le client, le devis, la note ou le rendez-vous. Vous confirmerez avant tout enregistrement."
        closeDisabled={busy}
        footer={
          <>
            <FormDialogCancelButton
              disabled={busy}
              onClick={() => {
                stopCapture();
                setOpen(false);
              }}
            >
              Fermer
            </FormDialogCancelButton>
            <FormDialogPrimaryButton
              disabled={busy || !transcript.trim()}
              onClick={() => void submit()}
            >
              {busy ? "Interprétation…" : "Interpréter"}
            </FormDialogPrimaryButton>
          </>
        }
      >
        {quotaLabel ? <p className={formFieldHintClassName}>{quotaLabel}</p> : null}
        {micMessage ? (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{micMessage}</p>
        ) : null}
        {error ? (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {recording ? (
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600"
              onClick={stopCapture}
            >
              Arrêter
            </button>
          ) : (
            <button
              type="button"
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500"
              onClick={() => void startRecording()}
            >
              Enregistrer
            </button>
          )}
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600"
            onClick={() => setWriteMode(true)}
          >
            Écrire à la place
          </button>
        </div>
        <label className="mt-3 block">
          <span className={formFieldLabelClassName}>Instruction</span>
          <textarea
            className={formFieldInputClassName}
            rows={4}
            value={transcript}
            readOnly={recording && !writeMode}
            placeholder="Le texte dicté s'affiche ici."
            onChange={(event) => setTranscript(event.target.value)}
          />
        </label>
        <p className="mt-3 text-sm">
          <Link href="/copilote" className="font-medium text-brand-600 hover:text-brand-500">
            Historique du copilote
          </Link>
        </p>
      </FormDialog>
      <CopilotReviewDialog session={review} onClose={() => setReview(null)} onDecided={setReview} />
    </>
  );
}
