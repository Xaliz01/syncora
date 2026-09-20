import {
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AiQuotaStatusResponse,
  AiQuotaTier,
  AuthUser,
  ConfirmFieldReportResponse,
  GenerateFieldReportResponse,
  InterventionResponse,
  OrganizationSubscriptionResponse,
} from "@planwise/shared";
import { organizationHasAddon } from "@planwise/shared";
import { AbstractAiFieldReportService } from "./ports/ai-field-report.service.port";
import { AssistantLlmClient } from "../infrastructure/assistant/llm.client";
import { hasAssignablePermission } from "../infrastructure/permission-checks";
import { SERVICE_URLS } from "../infrastructure/service-urls.config";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function resolveQuotaTier(sub: OrganizationSubscriptionResponse): AiQuotaTier {
  if (sub.status === "trialing") return "trial";
  if (sub.activeAddons.includes("ai_copilot")) return "copilot";
  return "essential";
}

const FIELD_REPORT_SYSTEM_PROMPT = `Tu es un assistant pour techniciens de terrain (artisans, TPE).
L'utilisateur vient de terminer une intervention. À partir des données ci-dessous, rédige un compte-rendu professionnel en français.

Règles :
- Sois concis et factuel (3-8 phrases).
- Mentionne : date, type d'intervention, travaux réalisés (déduits du titre, description, notes).
- Si des notes terrain existent, reformule-les proprement.
- N'invente jamais de détails absents des données.
- Pas de formule de politesse ni de signature.
- Utilise un ton professionnel adapté à un rapport d'intervention.

Réponds uniquement avec le texte du compte-rendu, sans JSON ni balisage.`;

@Injectable()
export class AiFieldReportService extends AbstractAiFieldReportService {
  private readonly logger = new Logger(AiFieldReportService.name);

  constructor(
    private readonly llm: AssistantLlmClient,
    private readonly scopedHttp: OrganizationScopedHttpClient,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  async generate(user: AuthUser, interventionId: string): Promise<GenerateFieldReportResponse> {
    this.assertPermission(user);
    const sub = await this.getSubscription(user);
    this.assertAddonAccess(sub);

    const tier = resolveQuotaTier(sub);
    const period = tier === "trial" ? "trial" : currentPeriod();

    const quota = await this.incrementQuota(user.organizationId, tier, period);
    if (!quota.allowed) {
      const msg =
        tier === "trial"
          ? `Vous avez utilisé vos ${quota.limit} comptes-rendus d'essai. L'option Copilote permet de continuer après l'essai.`
          : `Quota de comptes-rendus atteint pour ce mois (${quota.limit}). Il sera renouvelé le mois prochain.`;
      throw new ForbiddenException(msg);
    }

    const intervention = await this.getIntervention(user, interventionId);
    const draft = await this.generateDraft(intervention);

    return { draft, quotaRemaining: quota.remaining };
  }

  async confirm(
    user: AuthUser,
    interventionId: string,
    report: string,
  ): Promise<ConfirmFieldReportResponse> {
    this.assertPermission(user);

    const result = await this.scopedHttp.request<InterventionResponse>({
      baseUrl: SERVICE_URLS.cases,
      organizationId: user.organizationId,
      method: "post",
      path: `/interventions/${interventionId}/field-report`,
      body: { organizationId: user.organizationId, report },
      errorLabel: "Cases service error",
    });

    return {
      interventionId: result.id,
      fieldReport: result.fieldReport!,
      confirmedAt: result.fieldReportConfirmedAt!,
    };
  }

  async getQuotaStatus(user: AuthUser): Promise<AiQuotaStatusResponse> {
    const sub = await this.getSubscription(user);
    const tier = resolveQuotaTier(sub);
    const period = tier === "trial" ? "trial" : currentPeriod();

    const status = await this.fetchQuotaStatus(user.organizationId, tier, period);
    return {
      usage: "field_report",
      tier,
      ...status,
    };
  }

  private assertPermission(user: AuthUser): void {
    if (user.role !== "admin" && !hasAssignablePermission(user, "ai.field_report")) {
      throw new ForbiddenException("Permission manquante : compte-rendu IA");
    }
  }

  private assertAddonAccess(sub: OrganizationSubscriptionResponse): void {
    if (!sub.hasAccess) {
      throw new ForbiddenException("Abonnement requis");
    }
    if (!organizationHasAddon(sub, "ai_copilot")) {
      throw new ForbiddenException(
        "L'option Copilote IA est nécessaire pour générer des comptes-rendus.",
      );
    }
  }

  private async getSubscription(user: AuthUser): Promise<OrganizationSubscriptionResponse> {
    const { data } = await firstValueFrom(
      this.httpService.get<OrganizationSubscriptionResponse>(
        `${SERVICE_URLS.subscriptions}/subscriptions/current`,
        { params: { organizationId: user.organizationId } },
      ),
    );
    return data;
  }

  private async getIntervention(
    user: AuthUser,
    interventionId: string,
  ): Promise<InterventionResponse> {
    return this.scopedHttp.request<InterventionResponse>({
      baseUrl: SERVICE_URLS.cases,
      organizationId: user.organizationId,
      method: "get",
      path: `/interventions/${interventionId}`,
      query: { organizationId: user.organizationId },
      errorLabel: "Cases service error",
    });
  }

  private async generateDraft(intervention: InterventionResponse): Promise<string> {
    if (!this.llm.isConfigured()) {
      throw new ServiceUnavailableException(
        "Le service de génération IA n'est pas configuré. Réessayez plus tard.",
      );
    }

    const parts: string[] = [`Titre intervention : ${intervention.title}`];
    if (intervention.caseTitle) parts.push(`Dossier : ${intervention.caseTitle}`);
    if (intervention.typeName) parts.push(`Type : ${intervention.typeName}`);
    if (intervention.description) parts.push(`Description : ${intervention.description}`);
    if (intervention.notes) parts.push(`Notes terrain : ${intervention.notes}`);
    if (intervention.scheduledStart) {
      parts.push(
        `Date prévue : ${new Date(intervention.scheduledStart).toLocaleDateString("fr-FR")}`,
      );
    }
    if (intervention.startedAt) {
      parts.push(`Démarré : ${new Date(intervention.startedAt).toLocaleString("fr-FR")}`);
    }
    if (intervention.completedAt) {
      parts.push(`Terminé : ${new Date(intervention.completedAt).toLocaleString("fr-FR")}`);
    }
    if (intervention.assigneeName) parts.push(`Technicien : ${intervention.assigneeName}`);

    const userMessage = parts.join("\n");

    const { content } = await this.llm.complete(FIELD_REPORT_SYSTEM_PROMPT, userMessage, {
      rawUserMessage: true,
    });

    return content.trim();
  }

  private async incrementQuota(
    organizationId: string,
    tier: AiQuotaTier,
    period: string,
  ): Promise<{ allowed: boolean; used: number; limit: number; remaining: number }> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<{
          allowed: boolean;
          used: number;
          limit: number;
          remaining: number;
        }>(`${SERVICE_URLS.subscriptions}/ai-quota/increment`, {
          organizationId,
          usage: "field_report",
          tier,
          period,
        }),
      );
      return data;
    } catch (err) {
      this.logger.warn(
        `AI quota increment failed: ${err instanceof Error ? err.message : "error"}`,
      );
      throw new ServiceUnavailableException("Impossible de vérifier le quota IA");
    }
  }

  private async fetchQuotaStatus(
    organizationId: string,
    tier: AiQuotaTier,
    period: string,
  ): Promise<{ used: number; limit: number; remaining: number }> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<{ used: number; limit: number; remaining: number }>(
          `${SERVICE_URLS.subscriptions}/ai-quota/status`,
          {
            params: { organizationId, usage: "field_report", tier, period },
          },
        ),
      );
      return data;
    } catch (err) {
      this.logger.warn(`AI quota status failed: ${err instanceof Error ? err.message : "error"}`);
      throw new ServiceUnavailableException("Impossible de vérifier le quota IA");
    }
  }
}
