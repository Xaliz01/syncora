/** Types plateforme (backoffice Planwise) */

import type { AuthResponse, AuthUser, LoginBody } from "./auth";
import type { OrganizationResponse } from "./organization";
import type { UserResponse, UserStatus } from "./user";
import type { UserRole } from "./auth";

/** JWT staff plateforme (sous-domaine backoffice). */
export interface PlatformJwtPayload {
  kind: "platform";
  sub: string;
  email: string;
  name?: string;
}

export interface PlatformAuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface PlatformAuthResponse {
  accessToken: string;
  user: PlatformAuthUser;
}

export function isPlatformJwtPayload(payload: unknown): payload is PlatformJwtPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "kind" in payload &&
    (payload as { kind?: unknown }).kind === "platform"
  );
}

/**
 * Emails exacts autorisés (CSV) — ex. `mail@benoistbabin.fr`.
 * Env : PLATFORM_STAFF_EMAILS
 */
export function parsePlatformStaffEmails(raw?: string | null): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Domaines autorisés (CSV) — défaut `planwise.fr`.
 * Env : PLATFORM_STAFF_EMAIL_DOMAINS
 */
export function parsePlatformStaffEmailDomains(raw?: string | null): Set<string> {
  const parsed = (raw ?? "planwise.fr")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  return new Set(parsed.length ? parsed : ["planwise.fr"]);
}

export function isPlatformStaffEmail(
  email: string,
  options?: { emails?: string | null; domains?: string | null },
): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return false;
  const exact = parsePlatformStaffEmails(options?.emails ?? process.env.PLATFORM_STAFF_EMAILS);
  if (exact.has(normalized)) return true;
  const domain = normalized.split("@")[1] ?? "";
  const domains = parsePlatformStaffEmailDomains(
    options?.domains ?? process.env.PLATFORM_STAFF_EMAIL_DOMAINS,
  );
  return domains.has(domain);
}

export interface PlatformOrganizationSummary {
  id: string;
  name: string;
  siret?: string;
  email?: string;
  city?: string;
  createdAt?: string;
  userCount: number;
  lastUserLoginAt?: string;
}

export interface PlatformOrganizationsListResponse {
  organizations: PlatformOrganizationSummary[];
  total: number;
}

export interface PlatformUserSummary {
  id: string;
  email: string;
  name?: string;
  status: UserStatus;
  organizationId?: string;
  organizationName?: string;
  role?: UserRole;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface PlatformUsersListResponse {
  users: PlatformUserSummary[];
  total: number;
}

export interface PlatformOrganizationDetailResponse {
  organization: OrganizationResponse;
  users: PlatformUserSummary[];
  subscription?: {
    status: string;
    planName?: string;
    hasAccess: boolean;
    trialEndsAt?: string;
    billingOpen?: boolean;
    canExtendTrial?: boolean;
    trialExtensionCount?: number;
    maxTrialExtensions?: number;
  };
  integrations: PlatformIntegrationSummary[];
}

export interface PlatformIntegrationSummary {
  organizationId: string;
  organizationName?: string;
  provider: "pennylane" | "qonto" | string;
  connected: boolean;
  authMethod?: "oauth" | "api_token";
  companyName?: string;
  companyId?: string;
  tokenHint?: string;
  connectedAt?: string;
}

export interface PlatformIntegrationsListResponse {
  integrations: PlatformIntegrationSummary[];
  total: number;
}

export interface StartImpersonationBody {
  userId: string;
  organizationId: string;
  /** Motif support (ticket, description) — min. 10 caractères. */
  reason: string;
}

export type PlatformLoginBody = LoginBody;

export type { AuthResponse, AuthUser, UserResponse };

/** Preset NAF pour prospection artisans / TPE terrain (BTP, install, paysage…). */
export const PLATFORM_PROSPECT_NAF_PRESETS = {
  artisans_terrain: {
    id: "artisans_terrain" as const,
    label: "Artisans / terrain (BTP, install, paysage)",
    codes: [
      "41.20A",
      "41.20B",
      "43.21A",
      "43.21B",
      "43.22A",
      "43.22B",
      "43.29A",
      "43.29B",
      "43.31Z",
      "43.32A",
      "43.32B",
      "43.33Z",
      "43.34Z",
      "43.39Z",
      "43.91A",
      "43.91B",
      "43.99A",
      "43.99B",
      "43.99C",
      "43.99D",
      "43.99E",
      "81.21Z",
      "81.22Z",
      "81.30Z",
      "96.01A",
    ],
  },
} as const;

export type PlatformProspectNafPresetId = keyof typeof PLATFORM_PROSPECT_NAF_PRESETS;

export function getPlatformProspectNafCodes(preset?: string | null): string[] {
  const id = (preset?.trim() || "artisans_terrain") as PlatformProspectNafPresetId;
  return [
    ...(PLATFORM_PROSPECT_NAF_PRESETS[id]?.codes ??
      PLATFORM_PROSPECT_NAF_PRESETS.artisans_terrain.codes),
  ];
}

export interface PlatformProspectSummary {
  siren: string;
  siret?: string;
  name: string;
  naf?: string;
  nafLabel?: string;
  createdAt?: string;
  city?: string;
  postalCode?: string;
  dirigeants?: string[];
  website?: string;
  alreadyContacted: boolean;
  /** Recherche d’e-mail déjà tentée sans succès (staff). */
  emailNotFound: boolean;
  lastContactedAt?: string;
  /** Note libre staff (recherche e-mail, contexte…). */
  comment?: string;
}

export interface PlatformProspectsSearchResponse {
  results: PlatformProspectSummary[];
  total: number;
  page: number;
  perPage: number;
  creditsRemaining?: number;
  /** true si la page vient du cache serveur (aucun crédit Pappers consommé). */
  fromCache?: boolean;
  /** Tri appliqué sur la page courante (Pappers n’offre pas de tri global). */
  sort?: PlatformProspectSearchSort;
}

/** Tri local de la page de résultats (l’API Pappers n’expose pas d’ordre global). */
export type PlatformProspectSearchSort = "default" | "created_at_desc";

export interface PlatformProspectCreditsResponse {
  creditsRemaining?: number;
  configured: boolean;
}

export interface PlatformProspectOutreachBody {
  siren: string;
  companyName: string;
  toEmail: string;
  contactName?: string;
  /** Code postal du siège (informatif ; le contenu mail vient du template). */
  postalCode?: string;
  /** Contenu e-mail backoffice à utiliser pour l’envoi. */
  templateId: string;
  /** Renvoi même si déjà contacté (défaut false). */
  force?: boolean;
}

export interface PlatformProspectOutreachResponse {
  sent: boolean;
  reason?: string;
}

/* ── Contenus e-mail backoffice ─────────────────────────────── */

export const PLATFORM_EMAIL_TEMPLATE_PURPOSES = ["prospect_outreach"] as const;
export type PlatformEmailTemplatePurpose = (typeof PLATFORM_EMAIL_TEMPLATE_PURPOSES)[number];

export function isPlatformEmailTemplatePurpose(
  value: string,
): value is PlatformEmailTemplatePurpose {
  return (PLATFORM_EMAIL_TEMPLATE_PURPOSES as readonly string[]).includes(value);
}

/**
 * Placeholders supportés dans subject/body/footer :
 * {{greeting}}, {{contactName}}, {{companyName}}, {{landingUrl}}
 */
export interface PlatformEmailTemplate {
  id: string;
  name: string;
  purpose: PlatformEmailTemplatePurpose;
  subject: string;
  body: string;
  footer: string;
  ctaLabel: string;
  ctaUrl: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlatformEmailTemplateBody {
  name: string;
  purpose: PlatformEmailTemplatePurpose;
  subject: string;
  body: string;
  footer: string;
  ctaLabel?: string;
  ctaUrl?: string;
  isDefault?: boolean;
}

export interface UpdatePlatformEmailTemplateBody {
  name?: string;
  subject?: string;
  body?: string;
  footer?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  isDefault?: boolean;
}

export interface PlatformEmailTemplatesListResponse {
  templates: PlatformEmailTemplate[];
  total: number;
}

export interface PlatformEmailTemplatePreviewBody {
  /** Aperçu depuis un contenu déjà enregistré. */
  templateId?: string;
  /** Aperçu depuis le formulaire (brouillon non enregistré). */
  subject?: string;
  body?: string;
  footer?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  contactName?: string;
  companyName?: string;
}

export interface PlatformEmailTemplatePreviewResponse {
  html: string;
  text: string;
  subject: string;
}

export interface EmailTemplatePlaceholderContext {
  contactName?: string;
  companyName?: string;
  landingUrl?: string;
}

/** Remplace {{greeting}}, {{contactName}}, {{companyName}}, {{landingUrl}}. */
export function interpolateEmailTemplatePlaceholders(
  template: string,
  ctx: EmailTemplatePlaceholderContext,
): string {
  const contact = ctx.contactName?.trim() || "";
  const greeting = contact ? `Bonjour ${contact},` : "Bonjour,";
  const companyName = ctx.companyName?.trim() || "";
  const landingUrl = (ctx.landingUrl?.trim() || "https://planwise.fr").replace(/\/$/, "");
  return template
    .replaceAll("{{greeting}}", greeting)
    .replaceAll("{{contactName}}", contact)
    .replaceAll("{{companyName}}", companyName)
    .replaceAll("{{landingUrl}}", landingUrl);
}

export interface PlatformProspectEmailNotFoundBody {
  siren: string;
  companyName: string;
}

export interface PlatformProspectNoteBody {
  siren: string;
  companyName: string;
  comment: string;
}

/** Ajout manuel d’un prospect suivi (sans Pappers). */
export interface PlatformProspectManualCreateBody {
  siren: string;
  companyName: string;
  /** E-mail de contact optionnel (pour invitation ultérieure). */
  email?: string;
  comment?: string;
}

export type ProspectOutreachStatus = "sent" | "failed" | "email_not_found" | "noted";

export const PROSPECT_OUTREACH_COMMENT_MAX_LENGTH = 2000;

export interface CreateProspectOutreachBody {
  siren: string;
  companyName: string;
  email: string;
  sentByUserId: string;
  sentByEmail: string;
  subject: string;
  status?: ProspectOutreachStatus;
  comment?: string;
}

export interface UpsertProspectCommentBody {
  siren: string;
  companyName: string;
  comment: string;
  sentByUserId: string;
  sentByEmail: string;
}

export interface ProspectOutreachResponse {
  id: string;
  siren: string;
  companyName: string;
  email: string;
  sentByUserId: string;
  sentByEmail: string;
  subject: string;
  status: ProspectOutreachStatus;
  sentAt: string;
  comment?: string;
}

export interface ProspectOutreachesBySirensResponse {
  outreaches: ProspectOutreachResponse[];
}

export interface ProspectOutreachesListResponse {
  outreaches: ProspectOutreachResponse[];
  total: number;
  limit: number;
  offset: number;
}

/** Filtres liste prospects suivis (gateway + users-service). */
export interface ProspectOutreachesListFilters {
  limit?: number;
  offset?: number;
  /** Filtre exact sur le statut. */
  status?: ProspectOutreachStatus;
  /** Recherche libre : nom, SIREN, e-mail, commentaire. */
  search?: string;
}
