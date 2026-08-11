import { VOICE_FIELD_INTENT_CATALOG } from "@planwise/shared";
import { isLocalDevHost } from "@/lib/host-routing";

/** Sous-ensemble minimal de l’API Web Speech (évite de dépendre des .d.ts DOM incomplets). */
export interface VoiceSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: VoiceSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

export interface VoiceSpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    length?: number;
    0?: { transcript: string };
    [index: number]: { transcript: string } | undefined;
  }>;
}

type VoiceSpeechRecognitionCtor = new () => VoiceSpeechRecognition;

function getSpeechRecognitionCtor(): VoiceSpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: VoiceSpeechRecognitionCtor;
    webkitSpeechRecognition?: VoiceSpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isVoiceFieldSpeechSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

/** Hôte local / LAN privé — autorise le test desktop sans mobile. */
export function isVoiceFieldLocalTestHost(hostname?: string): boolean {
  if (typeof window === "undefined" && !hostname) return false;
  const host = (hostname ?? window.location.hostname).split(":")[0].toLowerCase();
  if (isLocalDevHost(host)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

/** Appareil mobile / tablette (UA), aligné sur la règle sessions users-service. */
export function isVoiceFieldMobileDevice(userAgent?: string): boolean {
  if (typeof navigator === "undefined" && !userAgent) return false;
  const ua = (userAgent ?? navigator.userAgent ?? "").trim();
  if (!ua) return false;
  if (/Android|iPhone|iPod|iPad|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true;
  }
  if (/Mobile/i.test(ua) && !/Windows NT/i.test(ua)) return true;
  return false;
}

/**
 * La feature est réservée au mobile, sauf en local (localhost / IP privée)
 * pour tester depuis un navigateur desktop.
 */
export function isVoiceFieldDeviceAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (isVoiceFieldLocalTestHost()) return true;
  if (isVoiceFieldMobileDevice()) return true;
  // Tablettes / téléphones avec pointeur coarse sans UA mobile clair.
  try {
    if (window.matchMedia("(pointer: coarse)").matches) return true;
  } catch {
    // ignore
  }
  return false;
}

/**
 * Affichage possible : préférence utilisateur + appareil autorisé + SpeechRecognition.
 * (Plus de feature flag d’environnement.)
 */
export function isVoiceFieldRuntimeEnabled(voiceFieldEnabledPreference: boolean): boolean {
  return (
    voiceFieldEnabledPreference === true &&
    isVoiceFieldDeviceAllowed() &&
    isVoiceFieldSpeechSupported()
  );
}

export function createVoiceFieldRecognition(): VoiceSpeechRecognition | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = "fr-FR";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  return recognition;
}

export function voiceFieldHelpLines(): string[] {
  return VOICE_FIELD_INTENT_CATALOG.map((e) => `${e.label} — ex. « ${e.examples[0] ?? ""} »`);
}

const FEMALE_VOICE_NAME =
  /am[eé]lie|marie|julie|hortense|denise|audrey|virginie|virgine|léa|lea|samantha|female|femme|woman/i;
const MALE_VOICE_NAME = /thomas|nicolas|pierre|paul|jacques|david|fred|male|homme|\bman\b/i;

function pickFrenchFemaleVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return undefined;
  const fr = voices.filter((v) => v.lang.toLowerCase().startsWith("fr"));
  const pool = fr.length > 0 ? fr : voices;
  const namedFemale = pool.find(
    (v) => FEMALE_VOICE_NAME.test(v.name) && !MALE_VOICE_NAME.test(v.name),
  );
  if (namedFemale) return namedFemale;
  return pool.find((v) => !MALE_VOICE_NAME.test(v.name)) ?? pool[0];
}

function speakWithPreferredVoice(text: string): void {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "fr-FR";
  utter.rate = 1.05;
  const voice = pickFrenchFemaleVoice();
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang || "fr-FR";
  }
  window.speechSynthesis.speak(utter);
}

/** Annonce courte (TTS) en voix féminine FR si disponible. */
export function speakVoiceFieldFeedback(text: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.getVoices().length === 0) {
      const onVoices = () => {
        window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
        speakWithPreferredVoice(text);
      };
      window.speechSynthesis.addEventListener("voiceschanged", onVoices);
      window.setTimeout(() => {
        window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
        if (!window.speechSynthesis.speaking) speakWithPreferredVoice(text);
      }, 400);
      return;
    }
    speakWithPreferredVoice(text);
  } catch {
    // ignore
  }
}
