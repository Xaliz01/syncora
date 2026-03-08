const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:3000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("syncora_access_token");
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Connexion impossible");
  }
  return res.json() as Promise<{ accessToken: string; user: import("@syncora/shared").AuthUser }>;
}

export async function register(payload: {
  organizationName: string;
  adminEmail: string;
  adminPassword: string;
  adminName?: string;
}) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Création de compte impossible");
  }
  return res.json() as Promise<{ accessToken: string; user: import("@syncora/shared").AuthUser }>;
}

export async function acceptInvitation(payload: {
  invitationToken: string;
  password: string;
  name?: string;
}) {
  const res = await fetch(`${API_BASE}/auth/accept-invitation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Acceptation impossible");
  }
  return res.json() as Promise<{ accessToken: string; user: import("@syncora/shared").AuthUser }>;
}

export function setToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem("syncora_access_token", token);
}

export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem("syncora_access_token");
}

export async function getMe(): Promise<import("@syncora/shared").AuthUser> {
  const token = getToken();
  if (!token) throw new Error("No token");
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Session expired");
  return res.json();
}

export { getToken };
