import type { Metadata } from "next";
import { getLegalPublisherConfig } from "@/lib/legal/config";
import { getMarketingOrigin } from "@/lib/host-routing";
import { LEGAL_PATHS } from "@/lib/legal/routes";

export const SEO_SITE_NAME = "Planwise";

export const SEO_DEFAULT_TITLE = "Planwise — CRM et interventions pour artisans et TPE";

export const SEO_DEFAULT_DESCRIPTION =
  "CRM orienté opérations terrain : dossiers, interventions, planning techniciens, stock et facturation (Pennylane, Qonto). Conçu pour artisans et TPE.";

export const SEO_KEYWORDS = [
  "CRM artisans",
  "gestion interventions",
  "logiciel terrain",
  "planning techniciens",
  "CRM TPE",
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
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${base}/#tarifs`,
    },
    inLanguage: "fr-FR",
    publisher: {
      "@type": "Organization",
      name: SEO_SITE_NAME,
      url: base,
    },
  };
}
