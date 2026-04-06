/** État métier côté app (hors statuts Stripe bruts). */
export type OrganizationSubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired";

export interface OrganizationSubscriptionResponse {
  organizationId: string;
  status: OrganizationSubscriptionStatus;
  /** Indique si l’organisation peut utiliser l’app (essai ou abonnement actif). */
  hasAccess: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** Montant / période affichables (ex. abonnement mensuel). */
  planLabel: string;
}

/** Corps attendu par le microservice (organizationId fourni par la gateway). */
export interface CreateCheckoutSessionBody {
  organizationId: string;
  /** Email Stripe (nouveau client) ; ignoré si un client Stripe existe déjà. */
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

/** Corps côté client → API gateway (sans organizationId). */
export interface CreateCheckoutSessionGatewayBody {
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutSessionResponse {
  url: string;
}

export interface CreateBillingPortalBody {
  organizationId: string;
  returnUrl: string;
}

export interface CreateBillingPortalGatewayBody {
  returnUrl: string;
}

export interface CreateBillingPortalResponse {
  url: string;
}
