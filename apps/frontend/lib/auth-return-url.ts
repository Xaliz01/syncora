/**
 * Valide un chemin de retour post-login (deep link notif / email).
 * Refuse les URLs absolues et les protocol-relative (`//…`).
 */
export function sanitizeAuthReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/login") || trimmed.startsWith("/register")) return null;
  return trimmed;
}

export function buildLoginHref(returnPath?: string | null): string {
  const safe = sanitizeAuthReturnPath(returnPath);
  if (!safe) return "/login";
  return `/login?next=${encodeURIComponent(safe)}`;
}
