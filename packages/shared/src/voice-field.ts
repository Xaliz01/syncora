/**
 * Commandes vocales terrain (expérimental) — Ma journée uniquement.
 * Séparé de l’assistant guide produit (pas d’écriture via le chat).
 */

import type { PermissionCode } from "./permissions";

export type VoiceFieldIntentKind =
  | "start"
  | "complete"
  | "comment"
  | "next"
  | "open_case"
  | "unknown";

export interface VoiceFieldIntent {
  kind: VoiceFieldIntentKind;
  /** Texte du commentaire (après « note que » / « ajoute un commentaire »). */
  commentText?: string;
  /**
   * Cible citée dans la même phrase (« la première », « Intervention démo #34 »).
   * Absente → résolution classique (focus / ambiguïté / choix).
   */
  targetHint?: VoiceFieldTargetHint;
  /** Transcript normalisé utilisé pour le parse. */
  raw: string;
}

/** Cible inline dans une commande vocale. */
export interface VoiceFieldTargetHint {
  /** Index 0-based (« la première » → 0). */
  ordinalIndex?: number;
  /** Fragment de titre (« Intervention démo #34 »). */
  titleQuery?: string;
}

export interface VoiceFieldIntentCatalogEntry {
  kind: Exclude<VoiceFieldIntentKind, "unknown">;
  /** Libellé court pour docs / aide. */
  label: string;
  /** Exemples de formulations FR. */
  examples: readonly string[];
  /** Permission requise pour exécuter (lecture seule = interventions.read). */
  permission: PermissionCode;
  /** Écriture métier (nécessite confirmation UI pour complete). */
  writes: boolean;
  requiresConfirmation: boolean;
}

/** Catalogue des intentions supportées (V1 expérimentale). */
export const VOICE_FIELD_INTENT_CATALOG: readonly VoiceFieldIntentCatalogEntry[] = [
  {
    kind: "start",
    label: "Démarrer l’intervention",
    examples: ["démarre", "démarre la première", "démarre Intervention démo"],
    permission: "interventions.update",
    writes: true,
    requiresConfirmation: false,
  },
  {
    kind: "complete",
    label: "Terminer l’intervention",
    examples: ["termine", "termine la première", "termine Intervention démo"],
    permission: "interventions.update",
    writes: true,
    requiresConfirmation: true,
  },
  {
    kind: "comment",
    label: "Ajouter un commentaire",
    examples: [
      "note que le client est absent",
      "ajoute un commentaire à la première",
      "ajoute un commentaire à Intervention démo porte fermée",
    ],
    permission: "comments.create",
    writes: true,
    requiresConfirmation: false,
  },
  {
    kind: "next",
    label: "Prochaine intervention",
    examples: ["prochaine", "quelle est la prochaine", "prochaine intervention"],
    permission: "interventions.read",
    writes: false,
    requiresConfirmation: false,
  },
  {
    kind: "open_case",
    label: "Ouvrir le dossier",
    examples: [
      "ouvre le dossier",
      "ouvre le dossier de la première",
      "ouvre le dossier Intervention démo",
    ],
    permission: "cases.read",
    writes: false,
    requiresConfirmation: false,
  },
] as const;

function normalizeTranscript(input: string): string {
  return input
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("fr")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ");
}

/** Forme sans accents / ponctuation pour matcher le STT approximatif. */
function foldTranscript(input: string): string {
  return normalizeTranscript(input)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clé de titre pour matching vocal : ignore accents, `#`, ponctuation et espaces.
 * « Intervention démo #33 » ≡ « intervention demo 33 ».
 */
export function voiceFieldTitleMatchKey(input: string): string {
  return foldTranscript(input).replace(/\s+/g, "");
}

/** Vrai si la requête vocale désigne le titre (avec tolérance STT / `#` / espaces). */
export function voiceFieldTitlesMatch(title: string, query: string): boolean {
  const qFold = foldTranscript(query);
  const tFold = foldTranscript(title);
  if (!qFold || !tFold) return false;
  if (tFold.includes(qFold) || qFold.includes(tFold)) return true;
  if (tFold.length >= 8 && qFold.includes(tFold.slice(0, 12))) return true;
  if (qFold.length >= 8 && tFold.includes(qFold.slice(0, 12))) return true;

  const qKey = voiceFieldTitleMatchKey(query);
  const tKey = voiceFieldTitleMatchKey(title);
  if (!qKey || !tKey) return false;
  return tKey.includes(qKey) || qKey.includes(tKey);
}

/**
 * Variantes STT FR de « Planwise » (plan Louise, plan ouise, planoise…).
 * Motif souple : plan/plain/plein/play + wise-like, éventuellement collés.
 * « Plan » seul est aussi accepté (après les formes longues, pour ne pas couper « planwise »).
 */
const WAKE_SUFFIX =
  "(?:wise|uise|oise|ouis|ouise|weiss|vice|ways|white|ouai|ouais|louise|louize|louis)";

const WAKE_TOKEN = `(?:plan|plain|plein|play|blan)[\\s\\-]*${WAKE_SUFFIX}`;

const WAKE_PATTERN = new RegExp(`(?:^|\\s)(?:ok|okay|hey|salut|bonjour)?\\s*${WAKE_TOKEN}\\b`);

/** « Plan » court — uniquement en mot entier (pas « planifier »). */
const WAKE_SHORT_PATTERN = /(?:^|\s)(?:ok|okay|hey|salut|bonjour)?\s*plan\b/;

/** Mot d’activation vocal (doc + fallback exact du parseur). */
export const VOICE_FIELD_WAKE_WORDS = [
  "planwise",
  "plan wise",
  "plan-wise",
  "planouis",
  "planoise",
  "plan ouise",
  "plein wise",
  "plain wise",
  "plan louise",
  "plan",
] as const;

export type VoiceFieldWakeParse =
  | { woken: false; rest: string }
  | { woken: true; rest: string; wakeOnly: boolean };

/**
 * Détecte « Planwise » ou « Plan » (éventuellement précédé de « ok » / « hey »),
 * y compris au milieu d’une phrase et avec approximations STT.
 */
export function parseVoiceFieldWake(transcript: string): VoiceFieldWakeParse {
  const raw = normalizeTranscript(transcript);
  if (!raw) return { woken: false, rest: "" };

  const folded = foldTranscript(raw);
  const compact = folded.replace(/\s+/g, "");

  // Forme collée : "planwise", "planoise", "planlouise"…
  const compactWake = new RegExp(`(?:plan|plain|plein|play|blan)${WAKE_SUFFIX}`).exec(compact);
  const spacedMatch = WAKE_PATTERN.exec(folded);

  // Fallback : entrée exacte de VOICE_FIELD_WAKE_WORDS (début de phrase).
  // « planwise » avant « plan » dans la liste pour ne pas couper le wake long.
  let listRest: string | null = null;
  const stripped = folded.replace(/^(?:ok|okay|hey|salut|bonjour)\s+/, "");
  const rawStripped = normalizeTranscript(raw).replace(/^(?:ok|okay|hey|salut|bonjour)\s+/i, "");
  for (const wake of VOICE_FIELD_WAKE_WORDS) {
    const w = foldTranscript(wake);
    if (stripped === w) {
      listRest = "";
      break;
    }
    if (stripped.startsWith(`${w} `)) {
      const wakeParts = wake
        .trim()
        .split(/\s+/)
        .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const rawMatch = rawStripped.match(new RegExp(`^${wakeParts.join("\\s+")}\\s+(.*)$`, "i"));
      listRest = rawMatch?.[1]?.trim() ?? stripped.slice(w.length).trim();
      break;
    }
  }

  const shortMatch =
    !compactWake && !spacedMatch && listRest === null ? WAKE_SHORT_PATTERN.exec(folded) : null;

  if (!compactWake && !spacedMatch && listRest === null && !shortMatch) {
    return { woken: false, rest: raw };
  }

  // Extraire le reste sur le texte original (accents conservés).
  const wakeInRaw = new RegExp(
    `(?:^|\\s)(?:ok|okay|hey|salut|bonjour)?\\s*${WAKE_TOKEN}\\b`,
    "i",
  ).exec(raw);
  if (wakeInRaw && wakeInRaw.index !== undefined) {
    const after = raw.slice(wakeInRaw.index + wakeInRaw[0].length).trim();
    return { woken: true, rest: after, wakeOnly: after.length === 0 };
  }

  if (spacedMatch && spacedMatch.index !== undefined) {
    const after = folded.slice(spacedMatch.index + spacedMatch[0].length).trim();
    return { woken: true, rest: after, wakeOnly: after.length === 0 };
  }

  if (listRest !== null) {
    return { woken: true, rest: listRest, wakeOnly: listRest.length === 0 };
  }

  if (shortMatch && shortMatch.index !== undefined) {
    const shortInRaw = /(?:^|\s)(?:ok|okay|hey|salut|bonjour)?\s*plan\b/i.exec(raw);
    if (shortInRaw && shortInRaw.index !== undefined) {
      const after = raw.slice(shortInRaw.index + shortInRaw[0].length).trim();
      return { woken: true, rest: after, wakeOnly: after.length === 0 };
    }
    const after = folded.slice(shortMatch.index + shortMatch[0].length).trim();
    return { woken: true, rest: after, wakeOnly: after.length === 0 };
  }

  // Wake seulement visible en forme collée → pas de reste fiable.
  return { woken: true, rest: "", wakeOnly: true };
}

/** Annulation / retour pendant un choix ou une dictée de commentaire. */
export function isVoiceFieldCancelUtterance(transcript: string): boolean {
  const wake = parseVoiceFieldWake(transcript);
  const text = wake.rest.trim();
  if (!text) return false;
  return (
    /^(?:annule|annuler|annulation|retour|revenir|cancel|stop|arr[eê]te|arr[eê]ter)$/i.test(text) ||
    /^(?:je\s+)?(?:annule|retourne|reviens)\b/i.test(text)
  );
}

/** Confirmation vocale (ex. clôture d’intervention). */
export function isVoiceFieldAffirmUtterance(transcript: string): boolean {
  const wake = parseVoiceFieldWake(transcript);
  const text = foldTranscript(wake.woken ? wake.rest : wake.rest);
  if (!text) return false;
  return /^(?:oui|ouais|ok|okay|d accord|daccord|confirme|confirmer|confirmation|valide|valider|termine|terminer|c est bon|go|yes)$/i.test(
    text,
  );
}

const CHOICE_ORDINAL_WORDS: readonly { re: RegExp; index: number }[] = [
  { re: /(?:la\s+|le\s+)?(?:premi(?:ere|ère)|1(?:ere|ère)?)\b/, index: 0 },
  { re: /(?:la\s+|le\s+)?(?:deuxieme|deuxième|seconde|2(?:e|eme|ème)?)\b/, index: 1 },
  { re: /(?:la\s+|le\s+)?(?:troisieme|troisième|3(?:e|eme|ème)?)\b/, index: 2 },
  { re: /(?:la\s+|le\s+)?(?:quatrieme|quatrième|4(?:e|eme|ème)?)\b/, index: 3 },
  { re: /(?:la\s+|le\s+)?(?:cinquieme|cinquième|5(?:e|eme|ème)?)\b/, index: 4 },
  { re: /(?:la\s+|le\s+)?(?:sixieme|sixième|6(?:e|eme|ème)?)\b/, index: 5 },
  { re: /(?:la\s+|le\s+)?(?:septieme|septième|7(?:e|eme|ème)?)\b/, index: 6 },
  { re: /(?:la\s+|le\s+)?(?:huitieme|huitième|8(?:e|eme|ème)?)\b/, index: 7 },
  { re: /(?:la\s+|le\s+)?(?:neuvieme|neuvième|9(?:e|eme|ème)?)\b/, index: 8 },
  { re: /(?:la\s+|le\s+)?(?:dixieme|dixième|10(?:e|eme|ème)?)\b/, index: 9 },
];

const ORDINAL_ANCHORED: readonly { re: RegExp; index: number }[] = CHOICE_ORDINAL_WORDS.map(
  ({ re, index }) => ({ re: new RegExp(`^${re.source}`), index }),
);

/**
 * Index 0-based d’un choix vocal (« la troisième », « numéro 4 », « 3 »).
 * `null` si non reconnu ou hors bornes.
 */
export function parseVoiceFieldChoiceIndex(transcript: string, optionCount: number): number | null {
  if (optionCount <= 0) return null;
  const wake = parseVoiceFieldWake(transcript);
  let text = foldTranscript(wake.woken ? wake.rest : wake.rest);
  if (!text) return null;

  // Retirer suffixes fréquents STT.
  text = text
    .replace(/\b(?:intervention|option|choix|proposition)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const { re, index } of ORDINAL_ANCHORED) {
    if (re.test(text) && index < optionCount) return index;
  }

  // « numéro 3 », « le 3 », « la 3 », « 3 »
  const numMatch = text.match(
    /^(?:(?:numero|number|n)\s+)?(?:(?:la|le)\s+)?(\d{1,2})(?:\s*(?:e|eme|ème))?$/,
  );
  if (numMatch?.[1]) {
    const n = Number.parseInt(numMatch[1], 10);
    if (n >= 1 && n <= optionCount) return n - 1;
  }

  return null;
}

/**
 * Extrait une cible citée (« la première », « intervention Pose A ») et un reste
 * (ex. texte de commentaire après la cible).
 */
export function extractVoiceFieldTargetHint(phrase: string): {
  hint?: VoiceFieldTargetHint;
  remainder: string;
} {
  const normalized = normalizeTranscript(phrase);
  if (!normalized) return { remainder: "" };

  let folded = foldTranscript(normalized);
  folded = folded.replace(/^(?:a|sur|pour|de|du)\s+/, "").trim();
  if (!folded) return { remainder: "" };

  // « la première [intervention] [reste] »
  for (const { re, index } of ORDINAL_ANCHORED) {
    const m = folded.match(new RegExp(`^(${re.source})(?:\\s+intervention)?(?:\\s+(.*))?$`));
    if (m) {
      return {
        hint: { ordinalIndex: index },
        remainder: (m[2] ?? "").trim(),
      };
    }
  }

  // « numero 3 [intervention] [reste] »
  const num = folded.match(
    /^(?:(?:numero|number|n)\s+)?(\d{1,2})(?:\s*(?:e|eme|eme))?(?:\s+intervention)?(?:\s+(.*))?$/,
  );
  if (num?.[1]) {
    const n = Number.parseInt(num[1], 10);
    if (n >= 1 && n <= 10) {
      return {
        hint: { ordinalIndex: n - 1 },
        remainder: (num[2] ?? "").trim(),
      };
    }
  }

  // « l intervention TITLE » / « intervention TITLE »
  const named = folded.match(/^(?:l\s+)?intervention\s+(.+)$/);
  if (named?.[1]) {
    const titleQuery = named[1].trim();
    if (titleQuery) return { hint: { titleQuery }, remainder: "" };
  }

  // Titre nu (pas seulement des mots vides) — ex. « Pose SAV » après « termine »
  if (
    !/^(?:l\s+)?intervention$/.test(folded) &&
    folded.length >= 2 &&
    !/^(?:la|le|une|un)$/.test(folded)
  ) {
    return { hint: { titleQuery: folded }, remainder: "" };
  }

  return { remainder: "" };
}

function stripLeadingAction(raw: string, patterns: RegExp[]): string {
  let text = raw.trim();
  for (const re of patterns) {
    const next = text.replace(re, "").trim();
    if (next !== text) return next;
  }
  return text;
}

/**
 * Parse un transcript FR vers une intention bornée.
 * Accepte optionnellement le préfixe « Planwise … ».
 * Pas de LLM : mots-clés uniquement.
 */
export function parseVoiceFieldTranscript(transcript: string): VoiceFieldIntent {
  const wake = parseVoiceFieldWake(transcript);
  const raw = wake.woken ? wake.rest : wake.rest;
  if (!raw) {
    return { kind: "unknown", raw: normalizeTranscript(transcript) };
  }

  // « note que … sur/à la première »
  const noteWithTarget = raw.match(
    /^note\s+que\s+(.+?)\s+(?:sur|a|à|pour)\s+((?:la|le)\s+\S.*|l['']?intervention\s+.+|intervention\s+.+)$/i,
  );
  if (noteWithTarget) {
    const commentText = noteWithTarget[1]?.trim() || undefined;
    const { hint } = extractVoiceFieldTargetHint(noteWithTarget[2] ?? "");
    return { kind: "comment", commentText, targetHint: hint, raw };
  }

  // « ajoute un commentaire à/sur … »
  const commentTo = raw.match(
    /^(?:ajout(?:e|er)\s+(?:un\s+)?commentaire|commentaire)\s+(?:a|à|sur|pour)\s+(.+)$/i,
  );
  if (commentTo) {
    const { hint, remainder } = extractVoiceFieldTargetHint(commentTo[1] ?? "");
    return {
      kind: "comment",
      commentText: remainder || undefined,
      targetHint: hint,
      raw,
    };
  }

  const commentMatch = raw.match(
    /^(?:note\s+que|ajout(?:e|er)\s+(?:un\s+)?commentaire|commentaire)\s*[:-]?\s*(.*)$/i,
  );
  if (commentMatch) {
    const commentText = commentMatch[1]?.trim() || undefined;
    return { kind: "comment", commentText, raw };
  }

  if (/^(?:ouvre|ouvrir)(?:\s+le)?\s+dossier\b/.test(raw) || /^ouvrir\s+dossier\b/.test(raw)) {
    const tail = stripLeadingAction(raw, [
      /^(?:ouvre|ouvrir)(?:\s+le)?\s+dossier\s*(?:de\s+|d[''])?/i,
      /^ouvrir\s+dossier\s*/i,
    ]);
    const { hint } = extractVoiceFieldTargetHint(tail);
    // « ouvre le dossier » seul → pas de hint (tail vide ou trivial)
    const trivial = !tail || /^(?:de|du|la|le)?$/i.test(tail);
    return {
      kind: "open_case",
      raw,
      targetHint: trivial ? undefined : hint,
    };
  }

  if (
    /\bprochaine\b/.test(raw) ||
    /quelle\s+est\s+la\s+prochaine/.test(raw) ||
    /^suivant[e]?\b/.test(raw)
  ) {
    return { kind: "next", raw };
  }

  if (
    /\btermin(?:e|er|é|ée)\b/.test(raw) ||
    /\bcl[oô]tur(?:e|er)\b/.test(raw) ||
    /c'?est\s+fini\b/.test(raw) ||
    /^fini\b/.test(raw)
  ) {
    if (/^c'?est\s+fini\b/i.test(raw) || /^fini\b/i.test(raw)) {
      return { kind: "complete", raw };
    }
    const tail = stripLeadingAction(raw, [/^(?:je\s+)?(?:termin(?:e|er)|cl[oô]tur(?:e|er))\s*/i]);
    const { hint } = extractVoiceFieldTargetHint(tail);
    const trivial = !tail || /^(?:l['']|la|le)?\s*intervention$/i.test(tail);
    return { kind: "complete", raw, targetHint: trivial ? undefined : hint };
  }

  if (
    /\bd[eé]marr(?:e|er)\b/.test(raw) ||
    /\bcommenc(?:e|er)\b/.test(raw) ||
    /je\s+commence\b/.test(raw)
  ) {
    if (/^je\s+commence\b/i.test(raw) && !/intervention/i.test(raw)) {
      return { kind: "start", raw };
    }
    const tail = stripLeadingAction(raw, [/^(?:je\s+)?(?:d[eé]marr(?:e|er)|commenc(?:e|er))\s*/i]);
    const { hint } = extractVoiceFieldTargetHint(tail);
    const trivial = !tail || /^(?:l['']|la|le)?\s*intervention$/i.test(tail);
    return { kind: "start", raw, targetHint: trivial ? undefined : hint };
  }

  return { kind: "unknown", raw };
}

export interface VoiceFieldInterventionRef {
  id: string;
  caseId: string;
  title: string;
  status: string;
  scheduledStart?: string;
}

export type VoiceFieldTargetResult =
  | { ok: true; intervention: VoiceFieldInterventionRef }
  | { ok: false; reason: "none" | "ambiguous"; candidates: VoiceFieldInterventionRef[] };

function matchVoiceFieldTargetHint(
  candidates: readonly VoiceFieldInterventionRef[],
  hint: VoiceFieldTargetHint,
): VoiceFieldTargetResult {
  if (hint.ordinalIndex !== undefined) {
    const picked = candidates[hint.ordinalIndex];
    if (picked) return { ok: true, intervention: picked };
    return { ok: false, reason: "none", candidates: [] };
  }
  const q = hint.titleQuery?.trim() ?? "";
  if (!q) return { ok: false, reason: "none", candidates: [] };

  const matches = candidates.filter((c) => voiceFieldTitlesMatch(c.title, q));
  if (matches.length === 1) return { ok: true, intervention: matches[0]! };
  if (matches.length === 0) return { ok: false, reason: "none", candidates: [] };
  return { ok: false, reason: "ambiguous", candidates: matches.slice(0, 8) };
}

/**
 * Résout la cible d’une commande.
 * - `targetHint` (ordinal / nom) si présent dans la phrase.
 * - Focus explicite (« prochaine », choix précédent) si compatible — sauf « terminer »
 *   avec plusieurs `in_progress` (toujours demander, focus / dernière démarrée inclus).
 * - Une seule cible compatible → prise automatiquement.
 * - Plusieurs → ambiguous (sauf `onAmbiguous: "earliest"` pour « prochaine »).
 * `lastStartedId` est ignoré (ne doit pas masquer une ambiguïté).
 */
export function resolveVoiceFieldTarget(
  interventions: readonly VoiceFieldInterventionRef[],
  options?: {
    focusedId?: string | null;
    /** @deprecated Ignoré : ne doit pas masquer une ambiguïté. Conservé pour compat. */
    lastStartedId?: string | null;
    /** Pour start : cibler planned. Pour complete : in_progress. Pour le reste : à faire. */
    preferStatus?: "planned" | "in_progress" | "todo";
    /**
     * Si plusieurs cibles : `fail` (défaut) renvoie ambiguous ;
     * `earliest` prend la planned la plus tôt (ex. « prochaine »).
     */
    onAmbiguous?: "fail" | "earliest";
    /** Cible citée dans la commande (« la première », titre…). */
    targetHint?: VoiceFieldTargetHint | null;
  },
): VoiceFieldTargetResult {
  const prefer = options?.preferStatus ?? "todo";
  const onAmbiguous = options?.onAmbiguous ?? "fail";

  const pool = interventions.filter((i) => matchesPrefer(i, prefer));

  if (
    options?.targetHint &&
    (options.targetHint.ordinalIndex !== undefined || options.targetHint.titleQuery)
  ) {
    const inPool = matchVoiceFieldTargetHint(pool, options.targetHint);
    if (inPool.ok || inPool.reason === "ambiguous") return inPool;
    // Titre cité mais hors statut attendu → chercher quand même pour un message plus clair côté UI
    if (options.targetHint.titleQuery) {
      const any = matchVoiceFieldTargetHint(interventions, options.targetHint);
      if (any.ok) return { ok: false, reason: "none", candidates: [any.intervention] };
    }
    return inPool;
  }

  if (pool.length === 0) {
    return { ok: false, reason: "none", candidates: [] };
  }
  if (pool.length === 1) {
    return { ok: true, intervention: pool[0]! };
  }

  // Plusieurs cibles : le focus peut trancher pour start / commentaire / dossier,
  // mais pas pour « terminer » — trop risqué de clôturer la mauvaise.
  const byId = (id: string | null | undefined) =>
    id ? interventions.find((i) => i.id === id) : undefined;
  const focused = byId(options?.focusedId);
  if (focused && matchesPrefer(focused, prefer) && prefer !== "in_progress") {
    return { ok: true, intervention: focused };
  }

  const plannedSorted = [...pool]
    .filter((i) => i.status === "planned")
    .sort((a, b) => (a.scheduledStart ?? "").localeCompare(b.scheduledStart ?? ""));

  if (onAmbiguous === "earliest" && plannedSorted.length > 0) {
    return { ok: true, intervention: plannedSorted[0]! };
  }

  return { ok: false, reason: "ambiguous", candidates: pool.slice(0, 8) };
}

function matchesPrefer(
  i: VoiceFieldInterventionRef,
  prefer: "planned" | "in_progress" | "todo",
): boolean {
  if (prefer === "planned") return i.status === "planned";
  if (prefer === "in_progress") return i.status === "in_progress";
  return i.status === "planned" || i.status === "in_progress";
}
