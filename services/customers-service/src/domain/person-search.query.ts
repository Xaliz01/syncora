/** Escape user input for safe use in Mongo `$regex`. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const IDENTITY_FIELDS = ["companyName", "firstName", "lastName"] as const;
const CONTACT_FIELDS = ["email", "phone", "mobile", "legalIdentifier"] as const;

/**
 * Construit le `$or` de recherche personne (client / donneur d’ordre).
 * - 1 mot : correspondance sur chaque champ.
 * - plusieurs mots (« Jean Moulin ») : chaque token doit matcher prénom, nom ou raison sociale
 *   (en plus des correspondances exactes sur e-mail / téléphone / raison sociale complète).
 */
export function buildPersonSearchOr(rawQuery: string): Record<string, unknown>[] {
  const q = rawQuery.trim();
  if (!q) return [];

  const escaped = escapeRegex(q);
  const tokens = q.split(/\s+/).filter(Boolean).map(escapeRegex);

  const fullFieldOr: Record<string, unknown>[] = [
    ...IDENTITY_FIELDS.map((field) => ({ [field]: { $regex: escaped, $options: "i" } })),
    ...CONTACT_FIELDS.map((field) => ({ [field]: { $regex: escaped, $options: "i" } })),
  ];

  if (tokens.length <= 1) {
    return fullFieldOr;
  }

  return [
    ...fullFieldOr,
    {
      $and: tokens.map((token) => ({
        $or: IDENTITY_FIELDS.map((field) => ({
          [field]: { $regex: token, $options: "i" },
        })),
      })),
    },
  ];
}
