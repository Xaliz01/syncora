import type {
  AuthResponse,
  AuthUser,
  CreateOrganizationBody,
  OnboardingAuthResponse,
  OnboardingUser,
} from "@syncora/shared";
import { apiRequestJson, getAccessToken, getOnboardingToken } from "./api-client";

export async function login(email: string, password: string) {
  return apiRequestJson<AuthResponse | OnboardingAuthResponse>("POST", "/auth/login", {
    body: { email, password },
    bearer: false,
    fallbackError: "Connexion impossible",
  });
}

export async function registerAccount(payload: { email: string; password: string; name?: string }) {
  return apiRequestJson<OnboardingAuthResponse>("POST", "/auth/register-account", {
    body: payload,
    bearer: false,
    fallbackError: "Création de compte impossible",
  });
}

export async function acceptInvitation(payload: {
  invitationToken: string;
  password: string;
  name?: string;
}) {
  return apiRequestJson<AuthResponse>("POST", "/auth/accept-invitation", {
    body: payload,
    bearer: false,
    fallbackError: "Acceptation impossible",
  });
}

export async function createOrganization(payload: CreateOrganizationBody) {
  return apiRequestJson<AuthResponse>("POST", "/auth/create-organization", {
    body: payload,
    preferOnboardingToken: true,
    noTokenMessage: "Session d'inscription expirée",
    fallbackError: "Impossible de créer l’organisation",
  });
}

export async function createOrganizationAsMember(payload: CreateOrganizationBody) {
  return apiRequestJson<AuthResponse>("POST", "/auth/create-organization", {
    body: payload,
    fallbackError: "Impossible de créer l’organisation",
  });
}

export async function switchOrganization(payload: { organizationId: string }) {
  return apiRequestJson<AuthResponse>("POST", "/auth/switch-organization", {
    body: payload,
    fallbackError: "Impossible de changer d’organisation",
  });
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("syncora_access_token", token);
    localStorage.removeItem("syncora_onboarding_token");
  }
}

export function setOnboardingToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("syncora_onboarding_token", token);
    localStorage.removeItem("syncora_access_token");
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("syncora_access_token");
    localStorage.removeItem("syncora_onboarding_token");
  }
}

export async function getMe(): Promise<AuthUser> {
  return apiRequestJson<AuthUser>("GET", "/auth/me", {
    noTokenMessage: "Session non authentifiée",
    fallbackError: "Session expirée",
  });
}

export async function getOnboardingMe(): Promise<OnboardingUser> {
  return apiRequestJson<OnboardingUser>("GET", "/auth/onboarding/me", {
    preferOnboardingToken: true,
    noTokenMessage: "Session d'inscription expirée",
    fallbackError: "Session d'inscription expirée",
  });
}

export function getToken() {
  return getAccessToken();
}

export function getOnboardingTokenFromStorage() {
  return getOnboardingToken();
}

export function isAuthUser(user: AuthUser | OnboardingUser): user is AuthUser {
  return "organizationId" in user;
}
