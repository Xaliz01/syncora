import { createHmac, timingSafeEqual } from "crypto";

const STATE_TTL_MS = 15 * 60 * 1000;

export interface OAuthStatePayload {
  organizationId: string;
  nonce: string;
  exp: number;
}

function signingKey(): Buffer {
  const raw = process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim();
  if (!raw || !/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error("INTEGRATIONS_ENCRYPTION_KEY manquante ou invalide (64 hex).");
  }
  return Buffer.from(raw, "hex");
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

/** Émet un state CSRF signé (HMAC-SHA256) contenant l’org. */
export function signOAuthState(organizationId: string, now = Date.now()): string {
  const payload: OAuthStatePayload = {
    organizationId,
    nonce: b64url(Buffer.from(`${now}-${Math.random()}`)),
    exp: now + STATE_TTL_MS,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = createHmac("sha256", signingKey()).update(body).digest();
  return `${body}.${b64url(sig)}`;
}

/** Vérifie et décode le state ; lève si invalide / expiré. */
export function verifyOAuthState(state: string, now = Date.now()): OAuthStatePayload {
  const [body, sigB64] = state.split(".");
  if (!body || !sigB64) {
    throw new Error("State OAuth invalide.");
  }
  const expected = createHmac("sha256", signingKey()).update(body).digest();
  const actual = fromB64url(sigB64);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("State OAuth falsifié.");
  }
  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(fromB64url(body).toString("utf8")) as OAuthStatePayload;
  } catch {
    throw new Error("State OAuth illisible.");
  }
  if (!payload.organizationId || !payload.exp) {
    throw new Error("State OAuth incomplet.");
  }
  if (payload.exp < now) {
    throw new Error("State OAuth expiré. Relancez la connexion.");
  }
  return payload;
}
