import type { Metadata } from "next";
import { BASE_SUBSCRIPTION_PLAN } from "@planwise/shared";
import { TarifsPage, TARIFS_FAQ } from "@/components/landing/TarifsPage";
import { getMarketingOrigin } from "@/lib/host-routing";
import { buildSoftwareApplicationJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: `Tarifs Planwise — ${BASE_SUBSCRIPTION_PLAN.priceDisplay}/mois HT, sans engagement`,
  },
  description: `Prix Planwise : abonnement Essentiel à ${BASE_SUBSCRIPTION_PLAN.priceDisplay} HT par mois, sans engagement. Essai ${BASE_SUBSCRIPTION_PLAN.trialDays} jours gratuit sans carte bancaire. CRM terrain pour indépendants, artisans et TPE.`,
  alternates: { canonical: "/tarifs" },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Tarifs Planwise — ${BASE_SUBSCRIPTION_PLAN.priceDisplay}/mois`,
    description: `Essentiel à ${BASE_SUBSCRIPTION_PLAN.priceDisplay} HT / mois, sans engagement. Essai ${BASE_SUBSCRIPTION_PLAN.trialDays} jours gratuits.`,
    url: "/tarifs",
  },
};

function buildFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: TARIFS_FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export default function TarifsRoutePage() {
  const offerLd = buildSoftwareApplicationJsonLd();
  // Pointer l’offre vers la page tarifs dédiée
  if (offerLd.offers && typeof offerLd.offers === "object") {
    (offerLd.offers as { url?: string }).url = `${getMarketingOrigin()}/tarifs`;
  }
  const payloads = [offerLd, buildFaqJsonLd()];

  return (
    <>
      {payloads.map((payload, index) => (
        <script
          // eslint-disable-next-line react/no-danger
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
        />
      ))}
      <TarifsPage />
    </>
  );
}
