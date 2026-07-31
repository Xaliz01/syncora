import type {
  UpdateUserNameBody,
  ChangePasswordBody,
  UpdateUserPreferencesBody,
  UserPreferencesResponse,
  UserResponse,
  UserSessionsListResponse,
} from "@planwise/shared";
import { apiRequestJson } from "./api-client";

export function updateName(body: UpdateUserNameBody) {
  return apiRequestJson<UserResponse>("PUT", "/account/name", {
    body,
    fallbackError: "Impossible de mettre à jour le nom",
  });
}

export function changePassword(body: ChangePasswordBody) {
  return apiRequestJson<void>("POST", "/account/change-password", {
    body,
    fallbackError: "Impossible de changer le mot de passe",
  });
}

export function getPreferences() {
  return apiRequestJson<UserPreferencesResponse>("GET", "/account/preferences", {
    fallbackError: "Impossible de charger les préférences",
  });
}

export function updatePreferences(body: UpdateUserPreferencesBody) {
  return apiRequestJson<UserPreferencesResponse>("PUT", "/account/preferences", {
    body,
    fallbackError: "Impossible de mettre à jour les préférences",
  });
}

export function listSessions() {
  return apiRequestJson<UserSessionsListResponse>("GET", "/account/sessions", {
    fallbackError: "Impossible de charger les appareils connectés",
  });
}

export function revokeSession(sessionId: string) {
  return apiRequestJson<void>("DELETE", `/account/sessions/${encodeURIComponent(sessionId)}`, {
    fallbackError: "Impossible de déconnecter cet appareil",
  });
}

export function revokeOtherSessions() {
  return apiRequestJson<void>("POST", "/account/sessions/revoke-others", {
    fallbackError: "Impossible de déconnecter les autres appareils",
  });
}
