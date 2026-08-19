/** Escape user input for safe use in Mongo `$regex`. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const IDENTITY_FIELDS = ["companyName", "firstName", "lastName"] as const;
const CONTACT_FIELDS = ["email", "phone", "mobile", "legalIdentifier"] as const;
/** Adresse principale (client / donneur d’ordre). */
const ADDRESS_FIELDS = [
  "address.line1",
  "address.line2",
  "address.postalCode",
  "address.city",
] as const;
/** Sites d’intervention (clients uniquement — no-op sur les donneurs d’ordre). */
const SITE_ADDRESS_FIELDS = [
  "sites.label",
  "sites.address.line1",
  "sites.address.line2",
  "sites.address.postalCode",
  "sites.address.city",
] as const;

const TOKEN_MATCH_FIELDS = [...IDENTITY_FIELDS, ...ADDRESS_FIELDS, ...SITE_ADDRESS_FIELDS] as const;

function regexClause(field: string, pattern: string): Record<string, unknown> {
  return { [field]: { $regex: pattern, $options: "i" } };
}

/**
 * Construit le `$or` de recherche personne (client / donneur d’ordre).
 * - 1 mot : correspondance sur identité, contact, adresse (et sites client).
 * - plusieurs mots (« Jean Moulin », « rue République Paris ») : chaque token doit
 *   matcher un champ identité ou adresse (en plus des correspondances pleine requête).
 */
export function buildPersonSearchOr(rawQuery: string): Record<string, unknown>[] {
  const q = rawQuery.trim();
  if (!q) return [];

  const escaped = escapeRegex(q);
  const tokens = q.split(/\s+/).filter(Boolean).map(escapeRegex);

  const fullFieldOr: Record<string, unknown>[] = [
    ...IDENTITY_FIELDS.map((field) => regexClause(field, escaped)),
    ...CONTACT_FIELDS.map((field) => regexClause(field, escaped)),
    ...ADDRESS_FIELDS.map((field) => regexClause(field, escaped)),
    ...SITE_ADDRESS_FIELDS.map((field) => regexClause(field, escaped)),
  ];

  if (tokens.length <= 1) {
    return fullFieldOr;
  }

  return [
    ...fullFieldOr,
    {
      $and: tokens.map((token) => ({
        $or: TOKEN_MATCH_FIELDS.map((field) => regexClause(field, token)),
      })),
    },
  ];
}
