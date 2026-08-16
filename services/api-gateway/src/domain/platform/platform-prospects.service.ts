import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  PlatformAuthUser,
  PlatformEmailTemplate,
  PlatformProspectCreditsResponse,
  PlatformProspectEmailNotFoundBody,
  PlatformProspectManualCreateBody,
  PlatformProspectNoteBody,
  PlatformProspectOutreachBody,
  PlatformProspectOutreachResponse,
  PlatformProspectSearchSort,
  PlatformProspectSummary,
  PlatformProspectsSearchResponse,
  ProspectOutreachesBySirensResponse,
  ProspectOutreachesListResponse,
  ProspectOutreachStatus,
  SendEmailNotificationResponse,
} from "@planwise/shared";
import {
  getPlatformProspectNafCodes,
  interpolateEmailTemplatePlaceholders,
} from "@planwise/shared";
import { buildPappersSearchCacheKey, PappersSearchCache } from "../pappers-search-cache";
import { AbstractPlatformEmailTemplatesService } from "../ports/platform/platform-email-templates.service.port";
import { AbstractPlatformProspectsService } from "../ports/platform/platform-prospects.service.port";
import {
  APP_PUBLIC_URL,
  PAPPERS_API_URL,
  compareProspectCreatedAtDesc,
} from "./platform.constants";
import type { PappersEntrepriseRow, PappersRechercheResponse } from "./pappers.types";
import { SERVICE_URLS } from "../../infrastructure/service-urls.config";

@Injectable()
export class PlatformProspectsService extends AbstractPlatformProspectsService {
  private readonly logger = new Logger(PlatformProspectsService.name);
  private readonly pappersSearchCache = new PappersSearchCache();

  constructor(
    private readonly httpService: HttpService,
    private readonly emailTemplates: AbstractPlatformEmailTemplatesService,
  ) {
    super();
  }

  async searchProspects(filters?: {
    page?: number;
    perPage?: number;
    departement?: string;
    codeNaf?: string;
    preset?: string;
    sort?: PlatformProspectSearchSort;
    dateCreationMin?: string;
    refresh?: boolean;
  }): Promise<PlatformProspectsSearchResponse> {
    const apiKey = this.requirePappersApiKey();
    const page = Math.max(filters?.page ?? 1, 1);
    const perPage = Math.min(Math.max(filters?.perPage ?? 20, 1), 50);
    const sort: PlatformProspectSearchSort =
      filters?.sort === "created_at_desc" ? "created_at_desc" : "default";
    const codeNaf =
      filters?.codeNaf?.trim() || getPlatformProspectNafCodes(filters?.preset).join(",");
    const dateCreationMin =
      this.parsePappersDateCreationMin(filters?.dateCreationMin) ??
      this.formatPappersDate(this.daysAgo(365));
    const departement = filters?.departement?.trim() || "";

    const cacheKey = buildPappersSearchCacheKey({
      preset: filters?.preset,
      codeNaf: filters?.codeNaf,
      departement,
      page,
      perPage,
      sort,
      dateCreationMin,
    });

    if (!filters?.refresh) {
      const cached = this.pappersSearchCache.get(cacheKey);
      if (cached) {
        const credits = await this.fetchPappersCredits(apiKey).catch(() => undefined);
        return {
          ...cached,
          fromCache: true,
          ...(credits != null ? { creditsRemaining: credits } : {}),
        };
      }
    }

    const params: Record<string, string | number> = {
      api_token: apiKey,
      code_naf: codeNaf,
      date_creation_min: dateCreationMin,
      entreprise_cessee: "false",
      page,
      par_page: perPage,
    };
    if (departement) params.departement = departement;

    let pappers: PappersRechercheResponse;
    try {
      const res = await firstValueFrom(
        this.httpService.get<PappersRechercheResponse>(`${PAPPERS_API_URL}/recherche`, {
          params,
          timeout: 20_000,
        }),
      );
      pappers = res.data;
    } catch (err: unknown) {
      const axiosErr = err as {
        message?: string;
        response?: {
          status?: number;
          data?: { detail?: string; title?: string; message?: string };
        };
      };
      const detail =
        axiosErr.response?.data?.detail ||
        axiosErr.response?.data?.message ||
        axiosErr.response?.data?.title ||
        axiosErr.message;
      this.logger.warn(`Pappers recherche failed (${axiosErr.response?.status ?? "?"}): ${detail}`);
      throw new ServiceUnavailableException(
        "Impossible de récupérer les prospects Pappers. Vérifiez la clé API et les crédits.",
      );
    }

    const rawResults = pappers.resultats ?? pappers.entreprises ?? [];
    const mapped = rawResults.map((row) => this.mapPappersEntreprise(row));
    const sirens = mapped.map((r) => r.siren).filter(Boolean);
    const outreachBySiren = await this.loadOutreachBySirens(sirens);

    let results: PlatformProspectSummary[] = mapped.map((r) => {
      const prior = outreachBySiren.get(r.siren);
      return {
        ...r,
        alreadyContacted: Boolean(prior && prior.status === "sent"),
        emailNotFound: Boolean(prior && prior.status === "email_not_found"),
        lastContactedAt: prior?.sentAt,
        ...(prior?.comment ? { comment: prior.comment } : {}),
      };
    });

    if (sort === "created_at_desc") {
      results = [...results].sort((a, b) => compareProspectCreatedAtDesc(a.createdAt, b.createdAt));
    }

    const credits = await this.fetchPappersCredits(apiKey).catch(() => undefined);

    const response: PlatformProspectsSearchResponse = {
      results,
      total: pappers.total ?? results.length,
      page: pappers.page ?? page,
      perPage,
      sort,
      fromCache: false,
      ...(credits != null ? { creditsRemaining: credits } : {}),
    };
    this.pappersSearchCache.set(cacheKey, response);
    return response;
  }

  async lookupProspectBySiret(raw: string): Promise<PlatformProspectsSearchResponse> {
    const apiKey = this.requirePappersApiKey();
    const id = raw?.trim().replace(/\s/g, "") ?? "";
    const isSiret = /^\d{14}$/.test(id);
    const isSiren = /^\d{9}$/.test(id);
    if (!isSiret && !isSiren) {
      throw new BadRequestException("SIRET (14 chiffres) ou SIREN (9 chiffres) requis");
    }

    let row: PappersEntrepriseRow;
    try {
      const res = await firstValueFrom(
        this.httpService.get<PappersEntrepriseRow>(`${PAPPERS_API_URL}/entreprise`, {
          params: {
            api_token: apiKey,
            ...(isSiret ? { siret: id } : { siren: id }),
          },
          timeout: 20_000,
        }),
      );
      row = res.data;
    } catch (err: unknown) {
      const axiosErr = err as {
        message?: string;
        response?: {
          status?: number;
          data?: { detail?: string; title?: string; message?: string };
        };
      };
      const status = axiosErr.response?.status;
      if (status === 404) {
        throw new NotFoundException(
          isSiret ? "Aucune entreprise pour ce SIRET" : "Aucune entreprise pour ce SIREN",
        );
      }
      const detail =
        axiosErr.response?.data?.detail ||
        axiosErr.response?.data?.message ||
        axiosErr.response?.data?.title ||
        axiosErr.message;
      this.logger.warn(`Pappers entreprise failed (${status ?? "?"}): ${detail}`);
      throw new ServiceUnavailableException(
        "Impossible de récupérer la fiche Pappers. Vérifiez la clé API et les crédits.",
      );
    }

    if (!row?.siren && !row?.siret) {
      throw new NotFoundException(
        isSiret ? "Aucune entreprise pour ce SIRET" : "Aucune entreprise pour ce SIREN",
      );
    }

    const mapped = this.mapPappersEntreprise(row);
    if (isSiret && !mapped.siret) {
      mapped.siret = id;
    }
    const outreachBySiren = await this.loadOutreachBySirens([mapped.siren].filter(Boolean));
    const prior = outreachBySiren.get(mapped.siren);
    const result: PlatformProspectSummary = {
      ...mapped,
      alreadyContacted: Boolean(prior && prior.status === "sent"),
      emailNotFound: Boolean(prior && prior.status === "email_not_found"),
      lastContactedAt: prior?.sentAt,
      ...(prior?.comment ? { comment: prior.comment } : {}),
    };

    const credits = await this.fetchPappersCredits(apiKey).catch(() => undefined);
    return {
      results: [result],
      total: 1,
      page: 1,
      perPage: 1,
      fromCache: false,
      ...(credits != null ? { creditsRemaining: credits } : {}),
    };
  }

  async getProspectCredits(): Promise<PlatformProspectCreditsResponse> {
    const apiKey = process.env.PAPPERS_API_KEY?.trim();
    if (!apiKey) return { configured: false };
    try {
      const creditsRemaining = await this.fetchPappersCredits(apiKey);
      return { configured: true, creditsRemaining };
    } catch {
      return { configured: true };
    }
  }

  async listTrackedProspects(options?: {
    limit?: number;
    offset?: number;
    status?: ProspectOutreachStatus;
    search?: string;
  }): Promise<ProspectOutreachesListResponse> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<ProspectOutreachesListResponse>(
          `${SERVICE_URLS.users}/users/platform/prospect-outreaches`,
          {
            params: {
              ...(options?.limit != null ? { limit: options.limit } : {}),
              ...(options?.offset != null ? { offset: options.offset } : {}),
              ...(options?.status ? { status: options.status } : {}),
              ...(options?.search?.trim() ? { search: options.search.trim() } : {}),
            },
            timeout: 10_000,
          },
        ),
      );
      return res.data;
    } catch (err: unknown) {
      this.logger.warn(`Failed to list tracked prospects: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Impossible de charger les prospects suivis");
    }
  }

  async sendProspectOutreach(
    staff: PlatformAuthUser,
    body: PlatformProspectOutreachBody,
  ): Promise<PlatformProspectOutreachResponse> {
    const siren = body.siren?.trim().replace(/\s/g, "") ?? "";
    if (!/^\d{9}$/.test(siren)) {
      throw new BadRequestException("SIREN invalide");
    }
    const toEmail = body.toEmail?.trim().toLowerCase() ?? "";
    if (!toEmail.includes("@")) {
      throw new BadRequestException("E-mail destinataire requis");
    }
    const templateId = body.templateId?.trim() ?? "";
    if (!templateId) {
      throw new BadRequestException("Contenu e-mail requis");
    }
    const companyName = body.companyName?.trim() || `SIREN ${siren}`;

    if (!body.force) {
      const existing = await this.loadOutreachBySirens([siren]);
      const prior = existing.get(siren);
      if (prior?.status === "sent") {
        throw new ConflictException("Cette entreprise a déjà été contactée");
      }
    }

    let template: PlatformEmailTemplate;
    try {
      template = await this.emailTemplates.getEmailTemplate(templateId);
    } catch (err: unknown) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      this.logger.warn(`Failed to load email template ${templateId}: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Impossible de charger le contenu e-mail");
    }

    const landingUrl = APP_PUBLIC_URL.replace(/\/$/, "") || "https://planwise.fr";
    const placeholders = {
      contactName: body.contactName?.trim(),
      companyName,
      landingUrl,
    };
    const subject = interpolateEmailTemplatePlaceholders(template.subject, placeholders);
    const emailBody = interpolateEmailTemplatePlaceholders(template.body, placeholders);
    const footer = interpolateEmailTemplatePlaceholders(template.footer, placeholders);

    let sent = false;
    let reason: string | undefined;
    try {
      const res = await firstValueFrom(
        this.httpService.post<SendEmailNotificationResponse>(
          `${SERVICE_URLS.notifications}/email/transactional`,
          {
            to: toEmail,
            subject,
            body: emailBody,
            url: template.ctaUrl || "/",
            ctaLabel: template.ctaLabel || "Découvrir Planwise",
            footer,
          },
        ),
      );
      sent = Boolean(res.data.sent);
      reason = res.data.reason;
      if (!sent) {
        this.logger.warn(`Prospect outreach not sent to ${toEmail}: ${reason ?? "unknown"}`);
      }
    } catch (err: unknown) {
      this.logger.warn(`Prospect outreach SMTP error: ${(err as Error).message}`);
      reason = "Erreur d’envoi e-mail";
      sent = false;
    }

    try {
      await firstValueFrom(
        this.httpService.post(`${SERVICE_URLS.users}/users/platform/prospect-outreaches`, {
          siren,
          companyName,
          email: toEmail,
          sentByUserId: staff.id,
          sentByEmail: staff.email,
          subject,
          status: sent ? "sent" : "failed",
        }),
      );
    } catch (err: unknown) {
      this.logger.warn(`Failed to log prospect outreach: ${(err as Error).message}`);
    }

    return { sent, ...(reason ? { reason } : {}) };
  }

  async markProspectEmailNotFound(
    staff: PlatformAuthUser,
    body: PlatformProspectEmailNotFoundBody,
  ): Promise<{ ok: true }> {
    const siren = body.siren?.trim().replace(/\s/g, "") ?? "";
    if (!/^\d{9}$/.test(siren)) {
      throw new BadRequestException("SIREN invalide");
    }
    const companyName = body.companyName?.trim() || `SIREN ${siren}`;

    const existing = await this.loadOutreachBySirens([siren]);
    const prior = existing.get(siren);
    if (prior?.status === "sent") {
      throw new ConflictException("Cette entreprise a déjà été contactée");
    }

    try {
      await firstValueFrom(
        this.httpService.post(`${SERVICE_URLS.users}/users/platform/prospect-outreaches`, {
          siren,
          companyName,
          email: "",
          sentByUserId: staff.id,
          sentByEmail: staff.email,
          subject: "Email non trouvé",
          status: "email_not_found",
        }),
      );
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        throw new ConflictException("Cette entreprise a déjà été contactée");
      }
      this.logger.warn(`Failed to mark prospect email not found: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Impossible d’enregistrer le statut");
    }
    return { ok: true };
  }

  async saveProspectNote(
    staff: PlatformAuthUser,
    body: PlatformProspectNoteBody,
  ): Promise<{ ok: true; comment?: string }> {
    const siren = body.siren?.trim().replace(/\s/g, "") ?? "";
    if (!/^\d{9}$/.test(siren)) {
      throw new BadRequestException("SIREN invalide");
    }
    const companyName = body.companyName?.trim() || `SIREN ${siren}`;
    const comment = typeof body.comment === "string" ? body.comment : "";

    try {
      const res = await firstValueFrom(
        this.httpService.post<{ comment?: string }>(
          `${SERVICE_URLS.users}/users/platform/prospect-outreaches/comment`,
          {
            siren,
            companyName,
            comment,
            sentByUserId: staff.id,
            sentByEmail: staff.email,
          },
        ),
      );
      return { ok: true, ...(res.data.comment ? { comment: res.data.comment } : {}) };
    } catch (err: unknown) {
      this.logger.warn(`Failed to save prospect note: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Impossible d’enregistrer le commentaire");
    }
  }

  async createManualProspect(
    staff: PlatformAuthUser,
    body: PlatformProspectManualCreateBody,
  ): Promise<{ ok: true }> {
    const digits = (body.siren?.trim() ?? "").replace(/\D/g, "");
    const siren = digits.length === 14 ? digits.slice(0, 9) : digits;
    if (!/^\d{9}$/.test(siren)) {
      throw new BadRequestException("SIREN invalide (9 chiffres, ou SIRET 14 chiffres)");
    }
    const companyName = body.companyName?.trim() ?? "";
    if (!companyName) {
      throw new BadRequestException("Nom de l’entreprise requis");
    }
    const email = body.email?.trim().toLowerCase() ?? "";
    if (email && !email.includes("@")) {
      throw new BadRequestException("E-mail invalide");
    }
    const comment = typeof body.comment === "string" ? body.comment : undefined;

    const existing = await this.loadOutreachBySirens([siren]);
    if (existing.has(siren)) {
      throw new ConflictException("Ce prospect est déjà suivi");
    }

    try {
      await firstValueFrom(
        this.httpService.post(`${SERVICE_URLS.users}/users/platform/prospect-outreaches`, {
          siren,
          companyName,
          email,
          sentByUserId: staff.id,
          sentByEmail: staff.email,
          subject: "Ajout manuel",
          status: "noted",
          ...(comment !== undefined ? { comment } : {}),
        }),
      );
    } catch (err: unknown) {
      this.logger.warn(`Failed to create manual prospect: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Impossible d’ajouter le prospect");
    }
    return { ok: true };
  }

  requirePappersApiKey(): string {
    const key = process.env.PAPPERS_API_KEY?.trim();
    if (!key) {
      throw new ServiceUnavailableException(
        "PAPPERS_API_KEY non configurée. Ajoutez la clé API Pappers côté api-gateway.",
      );
    }
    return key;
  }

  daysAgo(days: number): Date {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d;
  }

  /** Format Pappers JJ-MM-AAAA. */
  formatPappersDate(date: Date): string {
    const dd = String(date.getUTCDate()).padStart(2, "0");
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = date.getUTCFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  /**
   * Accepte `YYYY-MM-DD` (input HTML date) ou `JJ-MM-AAAA` (Pappers).
   * Retourne le format Pappers ou undefined si invalide.
   */
  parsePappersDateCreationMin(raw?: string): string | undefined {
    const value = raw?.trim();
    if (!value) return undefined;
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (iso) {
      const [, yyyy, mm, dd] = iso;
      const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
      if (
        date.getUTCFullYear() !== Number(yyyy) ||
        date.getUTCMonth() !== Number(mm) - 1 ||
        date.getUTCDate() !== Number(dd)
      ) {
        throw new BadRequestException("dateCreationMin invalide");
      }
      return `${dd}-${mm}-${yyyy}`;
    }
    const fr = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
    if (fr) {
      const [, dd, mm, yyyy] = fr;
      const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
      if (
        date.getUTCFullYear() !== Number(yyyy) ||
        date.getUTCMonth() !== Number(mm) - 1 ||
        date.getUTCDate() !== Number(dd)
      ) {
        throw new BadRequestException("dateCreationMin invalide");
      }
      return `${dd}-${mm}-${yyyy}`;
    }
    throw new BadRequestException("dateCreationMin invalide (attendu YYYY-MM-DD)");
  }

  mapPappersEntreprise(row: PappersEntrepriseRow): PlatformProspectSummary {
    const siren = String(row.siren ?? "").replace(/\s/g, "");
    const siege = row.siege;
    const dirigeants = (row.dirigeants ?? [])
      .map((d) => {
        const name = [d.prenom, d.prenoms, d.nom].filter(Boolean).join(" ").trim();
        return name || undefined;
      })
      .filter((n): n is string => Boolean(n));
    return {
      siren,
      siret: row.siret ? String(row.siret) : siege?.siret ? String(siege.siret) : undefined,
      name: row.nom_entreprise || row.denomination || row.nom || `SIREN ${siren}`,
      naf: row.code_naf || row.naf || undefined,
      nafLabel: row.libelle_code_naf || row.libelle_naf || undefined,
      createdAt: row.date_creation || undefined,
      city: siege?.ville || row.ville || undefined,
      postalCode: siege?.code_postal || row.code_postal || undefined,
      dirigeants: dirigeants.length ? dirigeants : undefined,
      website: row.domaine || row.site_internet || row.website || undefined,
      alreadyContacted: false,
      emailNotFound: false,
    };
  }

  async loadOutreachBySirens(
    sirens: string[],
  ): Promise<Map<string, { status: string; sentAt: string; comment?: string }>> {
    const map = new Map<string, { status: string; sentAt: string; comment?: string }>();
    if (sirens.length === 0) return map;
    try {
      const res = await firstValueFrom(
        this.httpService.get<ProspectOutreachesBySirensResponse>(
          `${SERVICE_URLS.users}/users/platform/prospect-outreaches`,
          { params: { sirens: sirens.join(",") } },
        ),
      );
      for (const o of res.data.outreaches ?? []) {
        map.set(o.siren, {
          status: o.status,
          sentAt: o.sentAt,
          ...(o.comment ? { comment: o.comment } : {}),
        });
      }
    } catch {
      /* best-effort */
    }
    return map;
  }

  async fetchPappersCredits(apiKey: string): Promise<number | undefined> {
    const res = await firstValueFrom(
      this.httpService.get<{
        jetons?: number;
        credits?: number;
        solde?: number;
        jetons_pay_as_you_go_restants?: number;
        jetons_abonnement?: number;
        jetons_abonnement_utilises?: number;
      }>(`${PAPPERS_API_URL}/suivi-jetons`, {
        params: { api_token: apiKey },
        timeout: 10_000,
      }),
    );
    return this.parsePappersCredits(res.data);
  }

  parsePappersCredits(data: {
    jetons?: number;
    credits?: number;
    solde?: number;
    jetons_pay_as_you_go_restants?: number;
    jetons_abonnement?: number;
    jetons_abonnement_utilises?: number;
  }): number | undefined {
    if (typeof data.jetons === "number") return data.jetons;
    if (typeof data.credits === "number") return data.credits;
    if (typeof data.solde === "number") return data.solde;
    const payg = data.jetons_pay_as_you_go_restants;
    const abo = data.jetons_abonnement;
    const used = data.jetons_abonnement_utilises ?? 0;
    if (typeof payg === "number" || typeof abo === "number") {
      const aboRestant = typeof abo === "number" ? Math.max(0, abo - used) : 0;
      return (typeof payg === "number" ? payg : 0) + aboRestant;
    }
    return undefined;
  }
}
