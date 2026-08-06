import type { Metadata } from "next";
import { getLegalPublisherConfig } from "@/lib/legal/config";
import { getMarketingOrigin } from "@/lib/host-routing";
import { LEGAL_PATHS } from "@/lib/legal/routes";

export const SEO_SITE_NAME = "Planwise";

export const SEO_DEFAULT_TITLE =
  "Planwise — CRM terrain accessible pour indépendants, artisans et TPE";

export const SEO_DEFAULT_DESCRIPTION =
  "CRM abordable pour indépendants, artisans et TPE : dossiers, interventions, contrats de maintenance, planning, stock et facturation via votre outil comptable. Dès 9,99 €/mois, essai gratuit sans carte bancaire.";

export const SEO_KEYWORDS = [
  "CRM accessible",
  "CRM abordable",
  "CRM indépendant",
  "CRM artisans",
  "CRM TPE",
  "gestion interventions",
  "logiciel terrain",
  "planning techniciens",
  "contrats de maintenance",
  "suivi de dossiers",
  "facturation artisans",
  "Pennylane",
  "Qonto",
  "Planwise",
] as const;

/** Chemins publics indexables sur le domaine marketing (hors robots/sitemap). */
export const MARKETING_INDEXABLE_PATHS = ["/", ...LEGAL_PATHS] as const;

export function getSeoMetadataBase(): URL {
  return new URL(getMarketingOrigin());
}

export function buildRootMetadata(): Metadata {
  const base = getSeoMetadataBase();
  const ogImage = new URL("/planwise-logo-512.png", base).toString();

  return {
    metadataBase: base,
    applicationName: SEO_SITE_NAME,
    title: {
      default: SEO_DEFAULT_TITLE,
      template: `%s — ${SEO_SITE_NAME}`,
    },
    description: SEO_DEFAULT_DESCRIPTION,
    keywords: [...SEO_KEYWORDS],
    authors: [{ name: getLegalPublisherConfig().companyName }],
    creator: SEO_SITE_NAME,
    publisher: SEO_SITE_NAME,
    alternates: {
      canonical: "/",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: SEO_SITE_NAME,
    },
    formatDetection: {
      telephone: false,
    },
    openGraph: {
      type: "website",
      locale: "fr_FR",
      url: base.toString(),
      siteName: SEO_SITE_NAME,
      title: SEO_DEFAULT_TITLE,
      description: SEO_DEFAULT_DESCRIPTION,
      images: [
        {
          url: ogImage,
          width: 512,
          height: 512,
          alt: "Logo Planwise",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: SEO_DEFAULT_TITLE,
      description: SEO_DEFAULT_DESCRIPTION,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function buildOrganizationJsonLd(): Record<string, unknown> {
  const legal = getLegalPublisherConfig();
  const base = getMarketingOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: legal.publisherName,
    legalName: legal.companyName,
    url: base,
    logo: `${base}/planwise-logo-512.png`,
    email: legal.contactEmail,
    address: {
      "@type": "PostalAddress",
      streetAddress: "2 rue Saint-Saëns",
      addressLocality: "Landerneau",
      postalCode: "29800",
      addressCountry: "FR",
    },
    contactPoint: {
      "@type": "ContactPoint",
      email: legal.contactEmail,
      contactType: "customer support",
      availableLanguage: ["French"],
    },
  };
}

export function buildSoftwareApplicationJsonLd(): Record<string, unknown> {
  const base = getMarketingOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SEO_SITE_NAME,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "CRM",
    operatingSystem: "Web, iOS, Android",
    url: base,
    description: SEO_DEFAULT_DESCRIPTION,
    featureList: [
      "Gestion de dossiers et interventions",
      "Contrats de maintenance et planification des visites",
      "Planning techniciens et calendrier",
      "Stock multi-emplacements",
      "Rapports d'intervention et signature client",
      "Facturation via votre outil comptable, ou mode démo pendant l’essai",
      "Profils de permissions et modèles de dossier prêts à importer",
    ],
    audience: {
      "@type": "BusinessAudience",
      audienceType: "Indépendants, artisans et TPE",
    },
    offers: {
      "@type": "Offer",
      name: "Essentiel",
      price: "9.99",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${base}/#tarifs`,
      description: "Abonnement Essentiel — 9,99 € / mois, sans engagement",
    },
    inLanguage: "fr-FR",
    publisher: {
      "@type": "Organization",
      name: SEO_SITE_NAME,
      url: base,
    },
  };
}
