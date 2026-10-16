import type Stripe from "stripe";

function resolveMarketingOrigin(): string {
  const fromEnv =
    process.env.STRIPE_LEGAL_MARKETING_URL?.trim() ||
    process.env.PUBLIC_MARKETING_URL?.trim() ||
    (process.env.MARKETING_DOMAIN?.trim() ? `https://${process.env.MARKETING_DOMAIN.trim()}` : "");
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return "https://planwise.fr";
}

/** Paramètres Stripe Checkout pour l'acceptation des CGV/CGU avant paiement. */
export function buildStripeCheckoutLegalParams(): Pick<
  Stripe.Checkout.SessionCreateParams,
  "consent_collection" | "custom_text"
> {
  // Domaine marketing : évite app.planwise.fr/ → dashboard si l'utilisateur est connecté.
  const origin = resolveMarketingOrigin();
  const cgvUrl = process.env.STRIPE_CGV_URL?.trim() || `${origin}/cgv`;
  const cguUrl = process.env.STRIPE_CGU_URL?.trim() || `${origin}/cgu`;

  return {
    consent_collection: { terms_of_service: "required" },
    custom_text: {
      terms_of_service_acceptance: {
        message: `J'accepte les [Conditions Générales de Vente](${cgvUrl}) et les [Conditions Générales d'Utilisation](${cguUrl}) de Planwise.`,
      },
    },
  };
}
