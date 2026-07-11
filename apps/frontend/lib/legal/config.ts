import { getAppOrigin, getMarketingOrigin } from "@/lib/host-routing";

/** Date de dernière mise à jour des documents légaux (affichée sur chaque page). */
export const LEGAL_LAST_UPDATED = "11 juillet 2026";

/** Valeurs par défaut — Benoist Babin, entrepreneur individuel (SIREN 979 102 803). */
const DEFAULT_LEGAL = {
  publisherName: "Planwise",
  companyName: "Benoist Babin",
  legalForm: "Entrepreneur individuel",
  siret: "97910280300017",
  rcs: "Brest 979 102 803",
  vatNumber: "FR11979102803",
  shareCapital: "",
  address: "2 rue Saint-Saëns, 29800 Landerneau, France",
  directorOfPublication: "Benoist Babin",
  contactEmail: "contact@planwise.fr",
  dpoEmail: "contact@planwise.fr",
} as const;

export interface LegalPublisherConfig {
  /** Nom commercial (ex. Planwise). */
  publisherName: string;
  /** Raison sociale complète (ex. Planwise SAS). */
  companyName: string;
  /** Forme juridique (SAS, SARL…). */
  legalForm: string;
  siret: string;
  rcs: string;
  vatNumber: string;
  shareCapital: string;
  address: string;
  directorOfPublication: string;
  contactEmail: string;
  dpoEmail: string;
  hostingProviderName: string;
  hostingProviderAddress: string;
}

function env(key: string, fallback: string): string {
  const value = process.env[key]?.trim();
  return value || fallback;
}

/** Informations éditeur / responsable de traitement (surchargeables via variables NEXT_PUBLIC_LEGAL_*). */
export function getLegalPublisherConfig(): LegalPublisherConfig {
  const publisherName = env("NEXT_PUBLIC_LEGAL_PUBLISHER_NAME", DEFAULT_LEGAL.publisherName);
  return {
    publisherName,
    companyName: env("NEXT_PUBLIC_LEGAL_COMPANY_NAME", DEFAULT_LEGAL.companyName),
    legalForm: env("NEXT_PUBLIC_LEGAL_LEGAL_FORM", DEFAULT_LEGAL.legalForm),
    siret: env("NEXT_PUBLIC_LEGAL_SIRET", DEFAULT_LEGAL.siret),
    rcs: env("NEXT_PUBLIC_LEGAL_RCS", DEFAULT_LEGAL.rcs),
    vatNumber: env("NEXT_PUBLIC_LEGAL_VAT", DEFAULT_LEGAL.vatNumber),
    shareCapital: env("NEXT_PUBLIC_LEGAL_SHARE_CAPITAL", DEFAULT_LEGAL.shareCapital),
    address: env("NEXT_PUBLIC_LEGAL_ADDRESS", DEFAULT_LEGAL.address),
    directorOfPublication: env("NEXT_PUBLIC_LEGAL_DIRECTOR", DEFAULT_LEGAL.directorOfPublication),
    contactEmail: env("NEXT_PUBLIC_LEGAL_CONTACT_EMAIL", DEFAULT_LEGAL.contactEmail),
    dpoEmail: env("NEXT_PUBLIC_LEGAL_DPO_EMAIL", DEFAULT_LEGAL.dpoEmail),
    hostingProviderName: env("NEXT_PUBLIC_LEGAL_HOST_NAME", "OVH SAS"),
    hostingProviderAddress: env(
      "NEXT_PUBLIC_LEGAL_HOST_ADDRESS",
      "2 rue Kellermann, 59100 Roubaix, France",
    ),
  };
}

export function isEntrepreneurIndividuel(legal: LegalPublisherConfig): boolean {
  return /entrepreneur individuel/i.test(legal.legalForm);
}

/** Libellé contractuel : « Benoist Babin, entrepreneur individuel (marque Planwise) ». */
export function getLegalContractPartyName(legal: LegalPublisherConfig): string {
  if (isEntrepreneurIndividuel(legal)) {
    return `${legal.companyName}, ${legal.legalForm.toLowerCase()}, exerçant sous la marque ${legal.publisherName}`;
  }
  return `${legal.companyName}${legal.legalForm ? `, ${legal.legalForm}` : ""}`;
}

/** URL absolue d'une page légale (priorité domaine app). */
export function getLegalPageUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${normalized}`;
  }
  return `${getAppOrigin()}${normalized}`;
}

export function getCgvUrl(): string {
  return `${getAppOrigin()}/cgv`;
}

export function getCguUrl(): string {
  return `${getAppOrigin()}/cgu`;
}

export function getPrivacyPolicyUrl(): string {
  return `${getAppOrigin()}/politique-confidentialite`;
}

export function getCookiePolicyUrl(): string {
  return `${getAppOrigin()}/politique-cookies`;
}

export function getLegalNoticeUrl(): string {
  return `${getMarketingOrigin()}/mentions-legales`;
}
