import type {
  AuthResponse,
  AuthUser,
  CreateOrganizationBody,
  EmailVerificationRequiredResponse,
  ForgotPasswordResponse,
  OnboardingAuthResponse,
  OnboardingUser,
  ResendEmailVerificationResponse,
  ResetPasswordResponse,
} from "@planwise/shared";
import { apiRequestJson, getAccessToken, getOnboardingToken } from "./api-client";

export async function login(email: string, password: string) {
  return apiRequestJson<AuthResponse | OnboardingAuthResponse>("POST", "/auth/login", {
    body: { email, password },
    bearer: false,
    fallbackError: "Connexion impossible",
  });
}

export async function registerAccount(payload: { email: string; password: string; name?: string }) {
  return apiRequestJson<EmailVerificationRequiredResponse>("POST", "/auth/register-account", {
    body: payload,
    bearer: false,
    fallbackError: "Création de compte impossible",
  });
}

export async function verifyEmail(payload: { email: string; code: string }) {
  return apiRequestJson<OnboardingAuthResponse>("POST", "/auth/verify-email", {
    body: payload,
    bearer: false,
    fallbackError: "Vérification impossible",
  });
}

export async function resendEmailVerification(payload: { email: string }) {
  return apiRequestJson<ResendEmailVerificationResponse>(
    "POST",
    "/auth/resend-email-verification",
    {
      body: payload,
      bearer: false,
      fallbackError: "Renvoi du code impossible",
    },
  );
}

export async function forgotPassword(payload: { email: string }) {
  return apiRequestJson<ForgotPasswordResponse>("POST", "/auth/forgot-password", {
    body: payload,
    bearer: false,
    fallbackError: "Demande impossible",
  });
}

export async function resetPassword(payload: { token: string; newPassword: string }) {
  return apiRequestJson<ResetPasswordResponse>("POST", "/auth/reset-password", {
    body: payload,
    bearer: false,
    fallbackError: "Réinitialisation impossible",
  });
}

export async function acceptInvitation(payload: {
  invitationToken: string;
  password?: string;
  name?: string;
}) {
  const hasSession = Boolean(getAccessToken());
  return apiRequestJson<AuthResponse>("POST", "/auth/accept-invitation", {
    body: payload,
    // Envoie le JWT si présent pour rejoindre une 2ᵉ org sans ressaisir le mot de passe.
    bearer: hasSession,
    fallbackError: "Acceptation impossible",
  });
}

export async function resolveInvitation(invitationToken: string) {
  return apiRequestJson<{
    invitedEmail: string;
    invitedName?: string;
    requiresPasswordSetup: boolean;
  }>("POST", "/auth/resolve-invitation", {
    body: { invitationToken },
    bearer: false,
    fallbackError: "Invitation introuvable",
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
    localStorage.setItem("planwise_access_token", token);
    localStorage.removeItem("planwise_onboarding_token");
  }
}

export function setOnboardingToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("planwise_onboarding_token", token);
    localStorage.removeItem("planwise_access_token");
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("planwise_access_token");
    localStorage.removeItem("planwise_onboarding_token");
  }
}

export async function getMe(): Promise<AuthUser> {
  return apiRequestJson<AuthUser>("GET", "/auth/me", {
    noTokenMessage: "Session non authentifiée",
    fallbackError: "Session expirée",
  });
}

export async function logout(): Promise<void> {
  try {
    await apiRequestJson<{ ok: true }>("POST", "/auth/logout", {
      fallbackError: "Déconnexion impossible",
    });
  } catch {
    // Clear local token even if the server revoke fails.
  } finally {
    clearToken();
  }
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
