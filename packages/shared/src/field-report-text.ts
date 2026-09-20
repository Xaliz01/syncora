const NARRATIVE_KEYS = [
  "travaux_realises",
  "travauxRealises",
  "compte_rendu",
  "compteRendu",
  "rapport",
  "report",
  "summary",
  "texte",
  "text",
  "contenu",
  "body",
] as const;

function pickString(obj: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function unwrapFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function proseFromJson(obj: Record<string, unknown>): string {
  const narrative = pickString(obj, NARRATIVE_KEYS);
  if (narrative) return narrative;

  const strings = Object.values(obj).filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  return strings.join("\n\n");
}

/** Transforme une réponse LLM JSON (ou fence markdown) en texte de compte-rendu. */
export function normalizeFieldReportText(raw: string | null | undefined): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const unfenced = unwrapFences(trimmed);
  if (!unfenced.startsWith("{") || !unfenced.endsWith("}")) {
    return trimmed;
  }

  try {
    const parsed: unknown = JSON.parse(unfenced);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return trimmed;
    }
    const prose = proseFromJson(parsed as Record<string, unknown>);
    return prose || trimmed;
  } catch {
    return trimmed;
  }
}
