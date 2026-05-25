/** Erreurs HTTP renvoyées par api-client (utilisées pour l’affichage UI). */

export const API_FORBIDDEN_MESSAGE = "Vous n'avez pas l'autorisation pour effectuer cette action.";

export type ApiErrorVariant = "error" | "forbidden";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const GENERIC_FORBIDDEN_MESSAGES = new Set(["Forbidden", "Forbidden resource", "Accès refusé"]);

export function normalizeApiErrorMessage(
  status: number,
  message: string | undefined,
  fallbackError: string,
): string {
  const trimmed = message?.trim();
  if (status === 403) {
    if (!trimmed || GENERIC_FORBIDDEN_MESSAGES.has(trimmed)) {
      return API_FORBIDDEN_MESSAGE;
    }
    return trimmed;
  }
  return trimmed || fallbackError;
}

export function resolveErrorDisplay(
  error: unknown,
  fallbackMessage = "Une erreur est survenue.",
): { message: string; variant: ApiErrorVariant } {
  if (isApiError(error) && error.isForbidden) {
    return { message: error.message, variant: "forbidden" };
  }
  if (typeof error === "string" && error.trim()) {
    return { message: error.trim(), variant: "error" };
  }
  if (error instanceof Error && error.message.trim()) {
    return { message: error.message, variant: "error" };
  }
  return { message: fallbackMessage, variant: "error" };
}

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage = "Une erreur est survenue.",
): string {
  return resolveErrorDisplay(error, fallbackMessage).message;
}
