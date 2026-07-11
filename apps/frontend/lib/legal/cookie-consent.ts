export const COOKIE_CONSENT_STORAGE_KEY = "planwise_cookie_consent";
export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_CHANGED_EVENT = "planwise:cookie-consent";

export type CookieConsent = {
  version: number;
  /** Cookies strictement nécessaires (toujours actifs). */
  necessary: true;
  /** Support client (Crisp). */
  support: boolean;
  decidedAt: string;
};

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    if (parsed.necessary !== true) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasCookieConsentDecision(): boolean {
  return getCookieConsent() !== null;
}

export function hasSupportCookieConsent(): boolean {
  return getCookieConsent()?.support === true;
}

export function saveCookieConsent(support: boolean): CookieConsent {
  const consent: CookieConsent = {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    support,
    decidedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_CHANGED_EVENT));
  }
  return consent;
}

export function acceptAllCookies(): CookieConsent {
  return saveCookieConsent(true);
}

export function rejectOptionalCookies(): CookieConsent {
  return saveCookieConsent(false);
}
