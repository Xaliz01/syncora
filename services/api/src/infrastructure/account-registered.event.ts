/** Événement gateway : compte utilisateur créé (avant org / onboarding). */
export const ACCOUNT_REGISTERED_EVENT = "planwise.account.registered";

export interface AccountRegisteredEvent {
  userId: string;
  email: string;
  name?: string;
}
