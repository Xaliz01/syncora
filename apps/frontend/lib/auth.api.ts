import { apiRequestJson, getAccessToken } from "./api-client";

export async function login(email: string, password: string) {
  return apiRequestJson<{ accessToken: string; user: import("@syncora/shared").AuthUser }>(
    "POST",
    "/auth/login",
    {
      body: { email, password },
      bearer: false,
      fallbackError: "Connexion impossible"
    }
  );
}

export async function register(payload: {
  organizationName: string;
  adminEmail: string;
  adminPassword: string;
  adminName?: string;
}) {
  return apiRequestJson<{ accessToken: string; user: import("@syncora/shared").AuthUser }>(
    "POST",
    "/auth/register",
    {
      body: payload,
      bearer: false,
      fallbackError: "Création de compte impossible"
    }
  );
}

export async function acceptInvitation(payload: {
  invitationToken: string;
  password: string;
  name?: string;
}) {
  return apiRequestJson<{ accessToken: string; user: import("@syncora/shared").AuthUser }>(
    "POST",
    "/auth/accept-invitation",
    {
      body: payload,
      bearer: false,
      fallbackError: "Acceptation impossible"
    }
  );
}

export async function createOrganization(payload: { name: string }) {
  return apiRequestJson<{ accessToken: string; user: import("@syncora/shared").AuthUser }>(
    "POST",
    "/auth/create-organization",
    {
      body: payload,
      fallbackError: "Impossible de créer l’organisation"
    }
  );
}

export async function switchOrganization(payload: { organizationId: string }) {
  return apiRequestJson<{ accessToken: string; user: import("@syncora/shared").AuthUser }>(
    "POST",
    "/auth/switch-organization",
    {
      body: payload,
      fallbackError: "Impossible de changer d’organisation"
    }
  );
}

export function setToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem("syncora_access_token", token);
}

export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem("syncora_access_token");
}

export async function getMe(): Promise<import("@syncora/shared").AuthUser> {
  return apiRequestJson<import("@syncora/shared").AuthUser>("GET", "/auth/me", {
    noTokenMessage: "Session non authentifiée",
    fallbackError: "Session expirée"
  });
}

export function getToken() {
  return getAccessToken();
}
