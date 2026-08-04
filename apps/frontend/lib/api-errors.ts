/** Erreurs HTTP renvoyées par api-client (utilisées pour l’affichage UI). */

export const API_FORBIDDEN_MESSAGE = "Vous n'avez pas l'autorisation pour effectuer cette action.";

export const NETWORK_UNAVAILABLE_MESSAGE =
  "Impossible de contacter le serveur. Vérifiez votre connexion internet, puis réessayez.";

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

/** Messages API anglais → libellés FR pour l’UI. */
const API_MESSAGE_FR: Record<string, string> = {
  "An article with this reference already exists":
    "Un article avec cette référence existe déjà. Choisissez une autre référence.",
  "A prestation with this reference already exists":
    "Une prestation avec cette référence existe déjà. Choisissez une autre référence.",
};

const NETWORK_ERROR_PATTERNS = [
  /^failed to fetch$/i,
  /^network\s*error/i,
  /^load failed$/i,
  /^network request failed$/i,
  /^fetch failed$/i,
  /^the internet connection appears to be offline$/i,
];

export function isNetworkErrorMessage(message: string): boolean {
  return NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(message.trim()));
}

/** Traduit les erreurs réseau navigateur (ex. « Failed to fetch ») en message FR. */
export function normalizeThrownFetchError(error: unknown): Error {
  if (error instanceof Error && isNetworkErrorMessage(error.message)) {
    return new Error(NETWORK_UNAVAILABLE_MESSAGE);
  }
  if (error instanceof Error) return error;
  return new Error(NETWORK_UNAVAILABLE_MESSAGE);
}

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
    return API_MESSAGE_FR[trimmed] ?? trimmed;
  }
  if (trimmed && API_MESSAGE_FR[trimmed]) {
    return API_MESSAGE_FR[trimmed];
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
    const message = isNetworkErrorMessage(error) ? NETWORK_UNAVAILABLE_MESSAGE : error.trim();
    return { message, variant: "error" };
  }
  if (error instanceof Error && error.message.trim()) {
    const message = isNetworkErrorMessage(error.message)
      ? NETWORK_UNAVAILABLE_MESSAGE
      : error.message.trim();
    return { message, variant: "error" };
  }
  return { message: fallbackMessage, variant: "error" };
}

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage = "Une erreur est survenue.",
): string {
  return resolveErrorDisplay(error, fallbackMessage).message;
}
