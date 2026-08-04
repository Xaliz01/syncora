/** Référence catalogue dérivée du libellé (majuscules, sans accents). */
export function suggestCatalogReference(name: string, fallback: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 20);
  return slug || fallback;
}
