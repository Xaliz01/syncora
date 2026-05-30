declare global {
  interface Window {
    $crisp: Array<unknown> & {
      is?: (path: string) => boolean;
      push: (args: unknown[]) => unknown;
    };
    CRISP_WEBSITE_ID?: string;
    CRISP_TOKEN_ID?: string;
    CRISP_RUNTIME_CONFIG?: { locale?: string };
  }
}

/** ID du site Crisp (public, injecté côté client). */
export function getCrispWebsiteId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID?.trim();
  return id || undefined;
}

export function isCrispEnabled(): boolean {
  return Boolean(getCrispWebsiteId());
}

/**
 * Centre d'aide Crisp (Knowledge Base / Helpdesk).
 * À activer dans Crisp (Plugins → Helpdesk) puis via
 * `NEXT_PUBLIC_CRISP_HELPDESK_ENABLED=true` dans `.env.local`.
 */
export function isCrispHelpdeskEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_CRISP_HELPDESK_ENABLED?.trim().toLowerCase();
  return flag === "true" || flag === "1";
}

export type CrispUserIdentity = {
  tokenId: string;
  email: string;
  nickname: string;
  signature?: string;
  sessionData: Record<string, string | number | boolean>;
};

let loadPromise: Promise<void> | null = null;
let loadedWebsiteId: string | null = null;

function crispPush(args: unknown[]): void {
  if (typeof window === "undefined") return;
  window.$crisp = window.$crisp || [];
  window.$crisp.push(args);
}

function queueUserIdentity(identity: CrispUserIdentity): void {
  if (identity.signature) {
    crispPush(["set", "user:email", [identity.email, identity.signature]]);
  } else {
    crispPush(["set", "user:email", [identity.email]]);
  }
  crispPush(["set", "user:nickname", [identity.nickname]]);

  const sessionData = Object.entries(identity.sessionData)
    .filter(
      ([, value]) =>
        typeof value === "string" || typeof value === "number" || typeof value === "boolean",
    )
    .map(([key, value]) => [key, value] as [string, string | number | boolean]);

  if (sessionData.length > 0) {
    crispPush(["set", "session:data", [sessionData]]);
  }
}

function isCrispAvailable(): boolean {
  return typeof window.$crisp?.is === "function" && window.$crisp.is("website:available");
}

function ensureCrispScript(websiteId: string, tokenId: string): Promise<void> {
  if (loadPromise && loadedWebsiteId === websiteId) {
    return loadPromise;
  }

  loadedWebsiteId = websiteId;
  loadPromise = new Promise<void>((resolve) => {
    window.$crisp = window.$crisp || [];
    window.CRISP_WEBSITE_ID = websiteId;
    window.CRISP_TOKEN_ID = tokenId;
    window.CRISP_RUNTIME_CONFIG = { locale: "fr" };

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    if (isCrispAvailable()) {
      finish();
      return;
    }

    crispPush([
      "on",
      "session:loaded",
      () => {
        finish();
      },
    ]);

    if (!document.querySelector('script[src*="client.crisp.chat/l.js"]')) {
      const script = document.createElement("script");
      script.src = "https://client.crisp.chat/l.js";
      script.async = true;
      script.onerror = () => finish();
      document.head.appendChild(script);
    }

    const poll = window.setInterval(() => {
      if (isCrispAvailable()) {
        window.clearInterval(poll);
        finish();
      }
    }, 250);

    window.setTimeout(() => {
      window.clearInterval(poll);
      finish();
    }, 10_000);
  });

  return loadPromise;
}

/** Charge Crisp uniquement après avoir lié l'utilisateur connecté (évite visitor1). */
export async function bootCrispWithUser(
  websiteId: string,
  identity: CrispUserIdentity,
): Promise<void> {
  if (typeof window === "undefined") return;

  window.CRISP_TOKEN_ID = identity.tokenId;
  queueUserIdentity(identity);

  await ensureCrispScript(websiteId, identity.tokenId);

  queueUserIdentity(identity);
  crispPush(["do", "chat:show"]);
}

export function shutdownCrispSession(): void {
  if (typeof window === "undefined") return;

  loadPromise = null;
  loadedWebsiteId = null;

  crispPush(["do", "session:reset", [false]]);
  crispPush(["do", "chat:hide"]);
}

/** Ouvre le centre d'aide Crisp. Retourne false si indisponible (non configuré ou erreur SDK). */
export function openCrispHelpdesk(): boolean {
  if (!isCrispHelpdeskEnabled()) {
    return false;
  }
  crispPush(["do", "helpdesk:search"]);
  return true;
}

export function openCrispChat(): void {
  crispPush(["do", "chat:open"]);
}
