import type {
  UpdateUserNameBody,
  ChangePasswordBody,
  UpdateUserPreferencesBody,
  UserPreferencesResponse,
  UserResponse,
} from "@syncora/shared";
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
