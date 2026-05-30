/** Réponse gateway pour l’identification Crisp (widget support). */
export interface CrispIdentityResponse {
  email: string;
  nickname: string;
  /** HMAC-SHA256 hex si CRISP_IDENTITY_SECRET est configuré côté gateway. */
  signature?: string;
}
