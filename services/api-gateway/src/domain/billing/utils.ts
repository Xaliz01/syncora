/** Escape user input for safe use in Mongo `$regex`. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function regexClause(field: string, pattern: string): Record<string, unknown> {
  return { [field]: { $regex: pattern, $options: "i" } };
}

const INVOICE_SEARCH_FIELDS = [
  "number",
  "draftNumber",
  "caseTitle",
  "customer.displayName",
  "customer.email",
  "customer.legalIdentifier",
  "lines.label",
] as const;

/** `$or` de recherche facture (numéro, client, dossier, libellés de lignes). */
export function buildInvoiceSearchOr(rawQuery: string): Record<string, unknown>[] {
  const q = rawQuery.trim();
  if (!q) return [];
  const escaped = escapeRegex(q);
  return INVOICE_SEARCH_FIELDS.map((field) => regexClause(field, escaped));
}
