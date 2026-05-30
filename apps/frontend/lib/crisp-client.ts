import { Crisp } from "crisp-sdk-web";

declare global {
  interface Window {
    $crisp: Array<unknown>;
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

let configuredWebsiteId: string | null = null;
let crispLoaded = false;

function removeLegacyCrispScript(): void {
  document
    .querySelectorAll('script[src*="client.crisp.chat"], script[src*="crisp.chat"]')
    .forEach((node) => node.remove());
}

function setCrispEmail(email: string, signature?: string): void {
  if (signature) {
    Crisp.user.setEmail(email, signature);
    return;
  }
  window.$crisp.push(["set", "user:email", [email]]);
}

function bindCrispUser(identity: CrispUserIdentity): void {
  setCrispEmail(identity.email, identity.signature);
  Crisp.user.setNickname(identity.nickname);
  Crisp.session.setData(identity.sessionData);
}

function ensureConfigured(websiteId: string): void {
  if (configuredWebsiteId === websiteId) {
    return;
  }

  removeLegacyCrispScript();
  window.$crisp = [];
  configuredWebsiteId = websiteId;
  crispLoaded = false;

  Crisp.configure(websiteId, {
    autoload: false,
    locale: "fr",
  });
}

/** Charge Crisp uniquement après avoir lié l'utilisateur connecté (évite visitor1). */
export function bootCrispWithUser(websiteId: string, identity: CrispUserIdentity): void {
  ensureConfigured(websiteId);
  Crisp.setTokenId(identity.tokenId);

  const applyIdentity = () => bindCrispUser(identity);
  Crisp.session.onLoaded(applyIdentity);

  if (!crispLoaded) {
    applyIdentity();
    Crisp.load();
    crispLoaded = true;
    return;
  }

  applyIdentity();
  Crisp.session.reset();
}

export function shutdownCrispSession(): void {
  if (!configuredWebsiteId) {
    return;
  }
  Crisp.setTokenId();
  Crisp.session.reset();
}

/** Ouvre le centre d'aide Crisp. Retourne false si indisponible (non configuré ou erreur SDK). */
export function openCrispHelpdesk(): boolean {
  if (!isCrispHelpdeskEnabled()) {
    return false;
  }
  try {
    Crisp.chat.setHelpdeskView();
    return true;
  } catch {
    openCrispChat();
    return false;
  }
}

export function openCrispChat(): void {
  Crisp.chat.open();
}
