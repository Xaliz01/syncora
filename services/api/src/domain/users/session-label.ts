export type SessionDeviceClass = "desktop" | "mobile";

/**
 * Classe d'appareil pour la règle 1 bureau + 1 mobile par compte.
 * Heuristique User-Agent (suffisante pour le besoin métier, sans fingerprinting).
 */
export function deriveSessionDeviceClass(userAgent?: string): SessionDeviceClass {
  const ua = (userAgent ?? "").trim();
  if (!ua) return "desktop";

  if (/Android|iPhone|iPod|iPad|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return "mobile";
  }
  // « Mobile » hors desktop Windows (évite certains UA hybrides).
  if (/Mobile/i.test(ua) && !/Windows NT/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

/** Dérive un libellé court à partir du User-Agent (sans dépendance externe). */
export function deriveSessionLabel(userAgent?: string): string {
  const ua = (userAgent ?? "").trim();
  if (!ua) return "Appareil inconnu";

  let os = "Appareil";
  if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Linux/i.test(ua)) os = "Linux";
  else if (/CrOS/i.test(ua)) os = "ChromeOS";

  let browser = "Navigateur";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  return `${browser} · ${os}`;
}
