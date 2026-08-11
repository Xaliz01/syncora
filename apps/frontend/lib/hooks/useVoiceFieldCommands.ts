"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  parseVoiceFieldTranscript,
  parseVoiceFieldWake,
  type VoiceFieldIntent,
} from "@planwise/shared";
import {
  createVoiceFieldRecognition,
  isVoiceFieldRuntimeEnabled,
  isVoiceFieldSpeechSupported,
  speakVoiceFieldFeedback,
  type VoiceSpeechRecognition,
  type VoiceSpeechRecognitionEvent,
} from "@/lib/voice-field";

export type VoiceFieldListenState = "idle" | "standby" | "listening" | "processing";

type SpeechResultLike = {
  isFinal: boolean;
  length?: number;
  0?: { transcript: string };
  [index: number]: { transcript: string } | undefined;
};

function collectTranscripts(event: VoiceSpeechRecognitionEvent): {
  interim: string;
  finals: string[];
  allCandidates: string[];
} {
  let interim = "";
  const finals: string[] = [];
  const allCandidates: string[] = [];

  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    const result = event.results[i] as SpeechResultLike | undefined;
    if (!result) continue;
    const altCount = typeof result.length === "number" ? result.length : 1;
    for (let a = 0; a < Math.max(altCount, 1); a += 1) {
      const piece = result[a]?.transcript?.trim();
      if (!piece) continue;
      allCandidates.push(piece);
      if (a === 0) {
        if (result.isFinal) finals.push(piece);
        else interim += (interim ? " " : "") + piece;
      }
    }
  }

  return { interim, finals, allCandidates };
}

function firstWakeHit(candidates: string[]) {
  for (const c of candidates) {
    const wake = parseVoiceFieldWake(c);
    if (wake.woken) return { text: c, wake };
  }
  return null;
}

/**
 * - Auto (standby) : écoute « Planwise » sans appui.
 * - Clic micro : passe tout de suite en mode commande (« Je vous écoute »).
 * - Re-clic en écoute commande : retour veille.
 * - `continueListening` sur le résultat d’intent : reste en mode commande (ex. choix d’intervention).
 */
export type VoiceFieldIntentHandlerResult = {
  /** Rester en écoute commande sans redemander « Planwise ». */
  continueListening?: boolean;
};

export function useVoiceFieldCommands(options: {
  enabled: boolean;
  /** Préférence utilisateur (Mon compte). */
  voiceFieldEnabledPreference: boolean;
  onIntent: (
    intent: VoiceFieldIntent,
  ) => void | VoiceFieldIntentHandlerResult | Promise<void | VoiceFieldIntentHandlerResult>;
  onError?: (message: string) => void;
}) {
  const { enabled, voiceFieldEnabledPreference, onIntent, onError } = options;
  const [state, setState] = useState<VoiceFieldListenState>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [lastTranscript, setLastTranscript] = useState("");
  /** Utterance en veille sans wake — pour le feedback UI (pas les commandes réussies). */
  const [lastStandbyMiss, setLastStandbyMiss] = useState("");
  const [needsGesture, setNeedsGesture] = useState(false);
  const recognitionRef = useRef<VoiceSpeechRecognition | null>(null);
  const modeRef = useRef<"standby" | "command">("standby");
  const stateRef = useRef<VoiceFieldListenState>("idle");
  const onIntentRef = useRef(onIntent);
  const onErrorRef = useRef(onError);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userStoppedRef = useRef(false);
  const permissionToastShownRef = useRef(false);
  const activatingWakeRef = useRef(false);
  /** Action en cours qui attend une suite (choix, etc.). */
  const awaitingFollowUpRef = useRef(false);
  const startRecognitionRef = useRef<(mode: "standby" | "command") => void>(() => undefined);

  useEffect(() => {
    onIntentRef.current = onIntent;
  }, [onIntent]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const runtimeEnabled = isVoiceFieldRuntimeEnabled(voiceFieldEnabledPreference);
  const available = enabled && runtimeEnabled;

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const detachRecognition = useCallback((rec: VoiceSpeechRecognition | null) => {
    if (!rec) return;
    try {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.stop();
    } catch {
      // ignore
    }
  }, []);

  const stopRecognition = useCallback(() => {
    clearRestartTimer();
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    detachRecognition(rec);
  }, [clearRestartTimer, detachRecognition]);

  const stop = useCallback(() => {
    userStoppedRef.current = true;
    activatingWakeRef.current = false;
    awaitingFollowUpRef.current = false;
    stopRecognition();
    modeRef.current = "standby";
    setState("idle");
    setInterimTranscript("");
  }, [stopRecognition]);

  // Démontage : libérer le micro seulement (ne pas bloquer un prochain montage / Strict Mode).
  useEffect(
    () => () => {
      stopRecognition();
    },
    [stopRecognition],
  );

  /** Pause technique (feature off / jour ≠ aujourd’hui) — ne bloque pas le redémarrage auto. */
  const pauseForUnavailable = useCallback(() => {
    activatingWakeRef.current = false;
    awaitingFollowUpRef.current = false;
    stopRecognition();
    modeRef.current = "standby";
    setState("idle");
    setInterimTranscript("");
  }, [stopRecognition]);

  const scheduleStandby = useCallback(
    (delayMs = 550) => {
      if (!available || userStoppedRef.current) return;
      if (awaitingFollowUpRef.current) return;
      clearRestartTimer();
      restartTimerRef.current = setTimeout(() => {
        if (!userStoppedRef.current && !awaitingFollowUpRef.current) {
          startRecognitionRef.current("standby");
        }
      }, delayMs);
    },
    [available, clearRestartTimer],
  );

  const scheduleCommandListening = useCallback(
    (delayMs = 600) => {
      if (!available || userStoppedRef.current) return;
      clearRestartTimer();
      modeRef.current = "command";
      setState("listening");
      restartTimerRef.current = setTimeout(() => {
        if (!userStoppedRef.current) startRecognitionRef.current("command");
      }, delayMs);
    },
    [available, clearRestartTimer],
  );

  /** Fin d’une action qui attendait un choix (annulation UI / sélection tactile). */
  const resumeStandby = useCallback(() => {
    awaitingFollowUpRef.current = false;
    activatingWakeRef.current = false;
    if (!available || userStoppedRef.current) {
      setState("idle");
      return;
    }
    modeRef.current = "standby";
    setState("standby");
    scheduleStandby(350);
  }, [available, scheduleStandby]);

  /** Reprendre / maintenir l’écoute commande (ex. après choix UI, attendre le texte du commentaire). */
  const requestContinueListening = useCallback(
    (delayMs = 700) => {
      if (!available || userStoppedRef.current) return;
      awaitingFollowUpRef.current = true;
      scheduleCommandListening(delayMs);
    },
    [available, scheduleCommandListening],
  );

  const runIntent = useCallback(
    (transcript: string) => {
      const text = transcript.trim();
      if (!text) {
        if (!userStoppedRef.current) {
          if (awaitingFollowUpRef.current) scheduleCommandListening(400);
          else {
            setState("standby");
            scheduleStandby();
          }
        }
        return;
      }
      setLastTranscript(text);
      setInterimTranscript("");
      setState("processing");
      const intent = parseVoiceFieldTranscript(text);
      void Promise.resolve(onIntentRef.current(intent))
        .then((result) => {
          activatingWakeRef.current = false;
          if (!available || userStoppedRef.current) {
            awaitingFollowUpRef.current = false;
            setState("idle");
            return;
          }
          const keepListening = Boolean(
            result && typeof result === "object" && result.continueListening,
          );
          awaitingFollowUpRef.current = keepListening;
          if (keepListening) {
            // Laisse le TTS « laquelle ? » se terminer avant de réécouter.
            scheduleCommandListening(900);
            return;
          }
          modeRef.current = "standby";
          setState("standby");
          scheduleStandby();
        })
        .catch(() => {
          activatingWakeRef.current = false;
          awaitingFollowUpRef.current = false;
          if (available && !userStoppedRef.current) {
            modeRef.current = "standby";
            setState("standby");
            scheduleStandby();
          } else {
            setState("idle");
          }
        });
    },
    [available, scheduleCommandListening, scheduleStandby],
  );

  const activateCommandMode = useCallback(
    (heard: string, rest: string, wakeOnly: boolean) => {
      if (activatingWakeRef.current) return;
      activatingWakeRef.current = true;

      setLastTranscript(heard);
      setInterimTranscript("");
      setLastStandbyMiss("");
      stopRecognition();

      if (!wakeOnly && rest.trim()) {
        runIntent(rest);
        return;
      }

      // Couper le TTS avant de réouvrir le micro (évite de s’écouter soi-même).
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
      speakVoiceFieldFeedback("Je vous écoute");
      modeRef.current = "command";
      setState("listening");
      clearRestartTimer();
      restartTimerRef.current = setTimeout(() => {
        activatingWakeRef.current = false;
        if (!userStoppedRef.current) startRecognitionRef.current("command");
      }, 900);
    },
    [clearRestartTimer, runIntent, stopRecognition],
  );

  const startRecognition = useCallback(
    (mode: "standby" | "command") => {
      if (!available || userStoppedRef.current) return;
      stopRecognition();
      modeRef.current = mode;
      if (mode === "standby") activatingWakeRef.current = false;

      const recognition = createVoiceFieldRecognition();
      if (!recognition) {
        onErrorRef.current?.("Micro non supporté sur ce navigateur.");
        setState("idle");
        return;
      }

      // Chrome gère mal continuous=true ; on relance à chaque fin d’utterance.
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 5;
      recognitionRef.current = recognition;
      setInterimTranscript("");
      setState(mode === "standby" ? "standby" : "listening");

      recognition.onresult = (event: VoiceSpeechRecognitionEvent) => {
        if (recognitionRef.current !== recognition) return;
        const { interim, finals, allCandidates } = collectTranscripts(event);
        if (interim) setInterimTranscript(interim);

        if (modeRef.current === "standby") {
          // Wake dès l’intérim (le final Chrome est souvent perdu au restart).
          const hit = firstWakeHit(
            finals.length > 0
              ? [...finals, ...allCandidates]
              : allCandidates.length > 0
                ? allCandidates
                : interim
                  ? [interim]
                  : [],
          );
          if (hit) {
            activateCommandMode(hit.text, hit.wake.rest, hit.wake.wakeOnly);
            return;
          }
          if (finals.length > 0) {
            const missed = finals.join(" ").trim();
            setLastTranscript(missed);
            setLastStandbyMiss(missed);
            setInterimTranscript("");
            recognitionRef.current = null;
            detachRecognition(recognition);
            scheduleStandby(400);
          }
          return;
        }

        // Mode commande : attendre un final (ou wake+commande).
        if (!finals.length) return;
        const text = finals.join(" ").trim();
        setLastTranscript(text);
        setLastStandbyMiss("");
        recognitionRef.current = null;
        detachRecognition(recognition);
        const wake = parseVoiceFieldWake(text);
        runIntent(wake.woken ? wake.rest || text : text);
      };

      recognition.onerror = (event: { error: string }) => {
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;
        if (event.error === "aborted") return;
        if (event.error === "no-speech") {
          if (userStoppedRef.current) return;
          if (awaitingFollowUpRef.current) {
            scheduleCommandListening(350);
            return;
          }
          if (stateRef.current === "listening") {
            modeRef.current = "standby";
            setState("standby");
          }
          scheduleStandby(350);
          return;
        }
        if (event.error === "not-allowed") {
          awaitingFollowUpRef.current = false;
          setState("idle");
          setNeedsGesture(true);
          if (!permissionToastShownRef.current) {
            permissionToastShownRef.current = true;
            onErrorRef.current?.(
              "Autorisez le micro une fois via le bouton, puis dites « Planwise » ou « Plan ».",
            );
          }
          return;
        }
        if (userStoppedRef.current) return;
        if (awaitingFollowUpRef.current) {
          scheduleCommandListening(700);
          return;
        }
        scheduleStandby(700);
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;
        if (userStoppedRef.current || activatingWakeRef.current) return;
        const current = stateRef.current;
        if (current === "processing") return;
        if (awaitingFollowUpRef.current) {
          scheduleCommandListening(400);
          return;
        }
        if (current === "listening") {
          modeRef.current = "standby";
          setState("standby");
        }
        scheduleStandby(450);
      };

      try {
        recognition.start();
        setNeedsGesture(false);
      } catch {
        recognitionRef.current = null;
        if (mode === "command") {
          if (awaitingFollowUpRef.current) {
            scheduleCommandListening(900);
            return;
          }
          setNeedsGesture(true);
          setState("idle");
          onErrorRef.current?.("Impossible de démarrer le micro.");
          return;
        }
        // InvalidStateError fréquent si restart trop tôt — retenter sans bloquer.
        setState("standby");
        scheduleStandby(900);
      }
    },
    [
      activateCommandMode,
      available,
      detachRecognition,
      runIntent,
      scheduleCommandListening,
      scheduleStandby,
      stopRecognition,
    ],
  );

  useEffect(() => {
    startRecognitionRef.current = startRecognition;
  }, [startRecognition]);

  /** Clic : écoute commande immédiate. Re-clic : retour veille « Planwise ». */
  const pushToTalk = useCallback(() => {
    if (!available) return;
    if (state === "listening" || state === "processing") {
      userStoppedRef.current = false;
      activatingWakeRef.current = false;
      awaitingFollowUpRef.current = false;
      stopRecognition();
      modeRef.current = "standby";
      setInterimTranscript("");
      setState("standby");
      scheduleStandby(400);
      return;
    }
    userStoppedRef.current = false;
    permissionToastShownRef.current = false;
    activatingWakeRef.current = false;
    awaitingFollowUpRef.current = false;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    speakVoiceFieldFeedback("Je vous écoute");
    startRecognition("command");
  }, [available, state, startRecognition, stopRecognition, scheduleStandby]);

  const start = useCallback(() => {
    if (!available) return;
    userStoppedRef.current = false;
    permissionToastShownRef.current = false;
    if (state === "standby" || state === "listening" || state === "processing") return;
    startRecognition("standby");
  }, [available, state, startRecognition]);

  const toggle = pushToTalk;

  // Feature indisponible → pause soft ; dès qu’elle revient → autoriser la veille auto.
  useEffect(() => {
    if (!available) {
      pauseForUnavailable();
      return;
    }
    userStoppedRef.current = false;
  }, [available, pauseForUnavailable]);

  // Démarre (ou redémarre) la veille dès que possible.
  useEffect(() => {
    if (!available) return;
    if (needsGesture) return;
    if (userStoppedRef.current) return;
    if (state !== "idle") return;

    // Court délai après reload : Chrome refuse souvent un start() synchrone au premier paint.
    const t = setTimeout(() => {
      if (userStoppedRef.current) return;
      if (stateRef.current !== "idle") return;
      startRecognitionRef.current("standby");
    }, 350);

    return () => clearTimeout(t);
  }, [available, needsGesture, state]);

  return {
    available,
    supported: isVoiceFieldSpeechSupported(),
    runtimeEnabled,
    preferenceEnabled: voiceFieldEnabledPreference,
    state,
    interimTranscript,
    lastTranscript,
    lastStandbyMiss,
    needsGesture,
    start,
    stop,
    toggle,
    pushToTalk,
    resumeStandby,
    requestContinueListening,
  };
}
