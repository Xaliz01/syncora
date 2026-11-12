import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  COPILOT_SYSTEM_PROMPT,
  COPILOT_VOICE_USAGE,
  aiQuotaPeriod,
  applyCopilotPermissionGates,
  assessCopilotAction,
  copilotActionRequiredPermissions,
  copilotCustomerLabel,
  copilotQuotaExceededMessage,
  parseCopilotModelOutput,
  planCopilotConfirmation,
  resolveAiQuotaTier,
  type AuthUser,
  type CopilotAllowedIds,
  type CopilotCreateSessionBody,
  type CopilotDecideBody,
  type CopilotPageContext,
  type CopilotProposedAction,
  type CopilotSessionListResponse,
  type CopilotSessionResponse,
  type AiQuotaStatusResponse,
  type InterventionResponse,
  type PermissionCode,
} from "@planwise/shared";
import {
  assertOrganizationScopedListNest,
  assertOrganizationScopedResourceNest,
} from "@planwise/shared/nest";
import type { CopilotSessionDocument } from "../persistence/organizations/copilot-session.schema";
import { AssistantLlmClient } from "../infrastructure/assistant/llm.client";
import { AbstractPermissionsService } from "./permissions/ports/permissions.service.port";
import { resolveCallerPermissions } from "./permissions/caller-access";
import { AbstractSubscriptionsGatewayService } from "./ports/subscriptions.service.port";
import { AbstractCustomersGatewayService } from "./ports/customers.service.port";
import { AbstractCasesGatewayService } from "./ports/cases.service.port";
import { AbstractCasesService } from "./cases/ports/cases.service.port";
import { AbstractInterventionsService } from "./cases/ports/interventions.service.port";
import { AbstractAiQuotaService } from "./ports/ai-quota.service.port";
import { AbstractAiCopilotService } from "./ports/ai-copilot.service.port";
import { toCopilotSessionResponse } from "./mappers/copilot-session.mapper";

const MAX_AUDIO_BYTES = 1_500_000;

function norm(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function localDayBounds(now = new Date()): { start: string; end: string } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

@Injectable()
export class AiCopilotService extends AbstractAiCopilotService {
  private readonly logger = new Logger(AiCopilotService.name);

  constructor(
    @InjectModel("CopilotSession", "organizations")
    private readonly sessions: Model<CopilotSessionDocument>,
    private readonly quota: AbstractAiQuotaService,
    private readonly llm: AssistantLlmClient,
    private readonly subscriptions: AbstractSubscriptionsGatewayService,
    private readonly customers: AbstractCustomersGatewayService,
    private readonly casesGateway: AbstractCasesGatewayService,
    private readonly cases: AbstractCasesService,
    private readonly interventions: AbstractInterventionsService,
    private readonly permissions: AbstractPermissionsService,
  ) {
    super();
  }

  async createSession(
    user: AuthUser,
    body: CopilotCreateSessionBody,
  ): Promise<CopilotSessionResponse> {
    const granted = await this.access(user);
    const tier = await this.requireTier(user);
    const period = aiQuotaPeriod(tier);
    const audio = this.readAudio(body);

    if (!this.llm.isConfigured()) {
      const doc = await this.persist(user, {
        transcript: body.transcript,
        audio,
        intent: "Copilote indisponible",
        status: "llm_unavailable",
        message:
          "Le copilote est momentanément indisponible. Votre instruction est conservée : réessayez plus tard. Rien n'a été enregistré dans le CRM.",
        actions: [],
      });
      return this.scoped(user, doc);
    }

    const bundle = await this.loadContext(user, body.context, granted);
    const reserved = await this.quota.incrementIfAllowed(
      user.organizationId,
      COPILOT_VOICE_USAGE,
      tier,
      period,
    );
    if (!reserved.allowed) {
      throw new HttpException(
        copilotQuotaExceededMessage(tier, reserved.limit),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    let content: string;
    try {
      const completion = await this.llm.complete(
        COPILOT_SYSTEM_PROMPT,
        this.userPrompt(body.transcript, bundle),
        { rawUserMessage: true },
      );
      content = completion.content;
    } catch (err) {
      await this.quota.release(user.organizationId, COPILOT_VOICE_USAGE, period);
      this.logger.warn(`Copilot LLM failed: ${err instanceof Error ? err.message : "error"}`);
      const doc = await this.persist(user, {
        transcript: body.transcript,
        audio,
        intent: "Copilote indisponible",
        status: "llm_unavailable",
        message:
          "Le copilote n'a pas pu interpréter l'instruction. Elle est conservée dans l'historique : réessayez plus tard. Rien n'a été enregistré dans le CRM.",
        actions: [],
      });
      return this.scoped(user, doc, reserved.remaining + 1);
    }

    const parsed = parseCopilotModelOutput(content, bundle.allowed);
    let actions = applyCopilotPermissionGates(parsed.actions, (code) => granted.has(code));
    actions = await this.resolveCustomerUpdates(user, actions, bundle.allowed, granted);
    const doc = await this.persist(user, {
      transcript: body.transcript,
      audio,
      intent: parsed.intent,
      status: "pending",
      message: undefined,
      actions,
      approxTokens: Math.ceil((body.transcript.length + content.length) / 4),
    });
    return this.scoped(user, doc, reserved.remaining);
  }

  async decide(
    user: AuthUser,
    sessionId: string,
    body: CopilotDecideBody,
  ): Promise<CopilotSessionResponse> {
    const granted = await this.access(user);
    const doc = await this.requireSession(user, sessionId);
    if (doc.status !== "pending") {
      throw new ConflictException("Cette instruction a déjà été traitée.");
    }

    if (body.decision === "reject") {
      doc.status = "rejected";
      doc.decision = "rejected";
      doc.message = "Instruction ignorée. Rien n'a été enregistré dans le CRM.";
      for (const action of doc.actions) {
        if (action.status === "proposed" || action.status === "needs_input") {
          action.status = "rejected";
        }
      }
      doc.markModified("actions");
      await doc.save();
      return this.scoped(user, doc);
    }

    const plan = planCopilotConfirmation(doc.actions, body.actions ?? []);
    if (!plan.ok) throw new BadRequestException(plan.error);

    for (const action of plan.actions) {
      const missing = copilotActionRequiredPermissions(action).some((code) => !granted.has(code));
      if (missing) {
        throw new ForbiddenException("Vous n'avez pas le droit d'enregistrer cette action.");
      }
    }

    const selectedIds = new Set(plan.actions.map((action) => action.id));
    const createdCustomers = new Map<string, string>();
    try {
      for (const action of plan.actions) {
        action.result = await this.applyAction(user, action, createdCustomers, granted);
        action.status = "confirmed";
        action.blockReason = undefined;
      }
    } catch (err) {
      this.mergeApplied(doc, plan.actions);
      doc.markModified("actions");
      await doc.save();
      throw err;
    }

    doc.actions = doc.actions.map((action) => {
      const applied = plan.actions.find((item) => item.id === action.id);
      if (applied) return applied;
      if (
        !selectedIds.has(action.id) &&
        (action.status === "proposed" || action.status === "needs_input")
      ) {
        return { ...action, status: "rejected" as const };
      }
      return action;
    });
    doc.status = "confirmed";
    doc.decision = plan.edited ? "edited" : "confirmed";
    doc.message = plan.edited
      ? "Actions modifiées puis enregistrées. Aucun envoi au client."
      : "Actions enregistrées. Aucun envoi au client.";
    doc.markModified("actions");
    await doc.save();
    return this.scoped(user, doc);
  }

  async listSessions(
    user: AuthUser,
    limit: number,
    offset: number,
  ): Promise<CopilotSessionListResponse> {
    await this.access(user);
    const filter = { organizationId: user.organizationId };
    const [docs, total] = await Promise.all([
      this.sessions
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .select("-audioData")
        .exec(),
      this.sessions.countDocuments(filter).exec(),
    ]);
    const sessions = assertOrganizationScopedListNest(
      user.organizationId,
      docs.map((doc) => toCopilotSessionResponse(doc)),
    );
    return { sessions, total };
  }

  async getSession(user: AuthUser, sessionId: string): Promise<CopilotSessionResponse> {
    await this.access(user);
    const doc = await this.requireSession(user, sessionId);
    return this.scoped(user, doc);
  }

  async getAudio(user: AuthUser, sessionId: string): Promise<{ mimeType: string; data: Buffer }> {
    await this.access(user);
    if (!/^[a-f0-9]{24}$/i.test(sessionId)) {
      throw new NotFoundException("Instruction introuvable");
    }
    const doc = await this.sessions
      .findOne({ _id: sessionId, organizationId: user.organizationId })
      .select("organizationId audioAvailable audioMimeType audioData")
      .exec();
    if (!doc?.audioAvailable || !doc.audioData?.length) {
      throw new NotFoundException("Aucun enregistrement audio pour cette instruction.");
    }
    assertOrganizationScopedResourceNest(user.organizationId, {
      organizationId: doc.organizationId,
    });
    return { mimeType: doc.audioMimeType || "audio/webm", data: doc.audioData };
  }

  async getQuota(user: AuthUser): Promise<AiQuotaStatusResponse> {
    await this.access(user);
    const tier = await this.requireTier(user);
    const period = aiQuotaPeriod(tier);
    const status = await this.quota.getStatus(
      user.organizationId,
      COPILOT_VOICE_USAGE,
      tier,
      period,
    );
    return {
      usage: COPILOT_VOICE_USAGE,
      tier,
      used: status.used,
      limit: status.limit,
      remaining: status.remaining,
    };
  }

  private async access(user: AuthUser): Promise<ReadonlySet<PermissionCode>> {
    const granted = await resolveCallerPermissions(this.permissions, user);
    if (!granted.has("ai.copilot")) {
      throw new ForbiddenException("Vous n'avez pas accès au copilote.");
    }
    return granted;
  }

  private async requireTier(user: AuthUser) {
    let subscription: Awaited<
      ReturnType<AbstractSubscriptionsGatewayService["getCurrentSubscription"]>
    >;
    try {
      subscription = await this.subscriptions.getCurrentSubscription(user);
    } catch {
      throw new ForbiddenException("Un abonnement actif est nécessaire pour utiliser le copilote.");
    }
    const tier = resolveAiQuotaTier(subscription);
    if (!tier) {
      throw new ForbiddenException("Un abonnement actif est nécessaire pour utiliser le copilote.");
    }
    return tier;
  }

  private readAudio(
    body: CopilotCreateSessionBody,
  ): { mimeType: string; data: Buffer } | undefined {
    if (!body.audioBase64) return undefined;
    const data = Buffer.from(body.audioBase64, "base64");
    if (data.length === 0 || data.length > MAX_AUDIO_BYTES) return undefined;
    return { mimeType: body.audioMimeType || "audio/webm", data };
  }

  private async persist(
    user: AuthUser,
    input: {
      transcript: string;
      audio?: { mimeType: string; data: Buffer };
      intent: string;
      status: CopilotSessionDocument["status"];
      message?: string;
      actions: CopilotProposedAction[];
      approxTokens?: number;
    },
  ): Promise<CopilotSessionDocument> {
    return this.sessions.create({
      organizationId: user.organizationId,
      userId: user.id,
      userName: user.name?.trim() || user.email,
      transcript: input.transcript,
      audioAvailable: Boolean(input.audio),
      audioMimeType: input.audio?.mimeType,
      audioData: input.audio?.data,
      intent: input.intent,
      status: input.status,
      decision: null,
      message: input.message,
      actions: input.actions,
      approxTokens: input.approxTokens,
    });
  }

  private async requireSession(user: AuthUser, sessionId: string): Promise<CopilotSessionDocument> {
    if (!/^[a-f0-9]{24}$/i.test(sessionId)) {
      throw new NotFoundException("Instruction introuvable");
    }
    const doc = await this.sessions
      .findOne({ _id: sessionId, organizationId: user.organizationId })
      .exec();
    if (!doc) throw new NotFoundException("Instruction introuvable");
    return doc;
  }

  private scoped(
    user: AuthUser,
    doc: CopilotSessionDocument,
    quotaRemaining?: number,
  ): CopilotSessionResponse {
    return assertOrganizationScopedResourceNest(
      user.organizationId,
      toCopilotSessionResponse(doc, quotaRemaining),
    );
  }

  private async loadContext(
    user: AuthUser,
    context: CopilotPageContext | undefined,
    granted: ReadonlySet<PermissionCode>,
  ) {
    const interventions: InterventionResponse[] = [];
    const caseIds = new Set<string>();
    const customerIds = new Set<string>();
    let caseTitle: string | undefined;
    let customerName: string | undefined;
    const canReadInterventions = granted.has("interventions.read");
    const canReadCases = granted.has("cases.read");
    const canReadCustomers = granted.has("customers.read");

    if (canReadInterventions && context?.interventionId) {
      try {
        interventions.push(
          await this.interventions.getIntervention(context.interventionId, user.organizationId),
        );
      } catch {
        /* id hors organisation ou inconnu */
      }
    }

    const pathname = context?.pathname ?? "";
    if (canReadInterventions && pathname === "/my-day") {
      const bounds = localDayBounds();
      try {
        const listed = await this.interventions.listInterventions(user.organizationId, {
          assigneeId: user.id,
          startDate: bounds.start,
          endDate: bounds.end,
          limit: 8,
        });
        for (const item of listed.interventions) interventions.push(item);
      } catch (err) {
        this.logger.warn(
          `Copilot context list failed: ${err instanceof Error ? err.message : "error"}`,
        );
      }
    }

    if (canReadCases && context?.caseId) {
      try {
        const caseData = await this.cases.getCase(context.caseId, user.organizationId);
        caseIds.add(caseData.id);
        caseTitle = caseData.title;
        if (caseData.customerId) customerIds.add(caseData.customerId);
      } catch {
        /* dossier hors périmètre */
      }
      if (canReadInterventions) {
        try {
          const listed = await this.interventions.listInterventions(user.organizationId, {
            caseId: context.caseId,
            limit: 8,
          });
          for (const item of listed.interventions) interventions.push(item);
        } catch {
          /* ignore */
        }
      }
    }

    if (canReadCustomers && context?.customerId) {
      try {
        const customer = await this.customers.getCustomer(user, context.customerId);
        customerIds.add(customer.id);
        customerName = customer.displayName;
      } catch {
        /* client hors périmètre */
      }
    }

    const unique = new Map<string, InterventionResponse>();
    for (const item of interventions) unique.set(item.id, item);
    const list = [...unique.values()].slice(0, 8);
    for (const item of list) caseIds.add(item.caseId);

    return {
      allowed: {
        interventionIds: list.map((item) => item.id),
        caseIds: [...caseIds],
        customerIds: [...customerIds],
      } satisfies CopilotAllowedIds,
      interventions: list,
      caseTitle,
      customerName,
    };
  }

  private userPrompt(
    transcript: string,
    bundle: {
      interventions: InterventionResponse[];
      caseTitle?: string;
      customerName?: string;
      allowed: CopilotAllowedIds;
    },
  ): string {
    const lines = ["Fiches autorisées (ne pas inventer d'autre id) :"];
    if (bundle.caseTitle) lines.push(`Dossier ouvert : ${bundle.caseTitle}`);
    if (bundle.customerName) lines.push(`Client ouvert : ${bundle.customerName}`);
    if (bundle.allowed.caseIds.length) lines.push(`caseIds : ${bundle.allowed.caseIds.join(", ")}`);
    if (bundle.allowed.customerIds.length) {
      lines.push(`customerIds : ${bundle.allowed.customerIds.join(", ")}`);
    }
    if (bundle.interventions.length === 0) {
      lines.push("Aucune intervention autorisée.");
    }
    for (const item of bundle.interventions) {
      const notes = item.notes?.trim().slice(0, 400);
      lines.push(
        [
          `- interventionId ${item.id}`,
          `caseId ${item.caseId}`,
          `titre ${item.title}`,
          item.status ? `statut ${item.status}` : "",
          item.scheduledStart ? `prévu ${item.scheduledStart}` : "",
          item.completedAt ? `terminé ${item.completedAt}` : "",
          notes ? `notes ${notes}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
      );
    }
    lines.push("", "Instruction de l'utilisateur :", transcript);
    return lines.join("\n");
  }

  private async resolveCustomerUpdates(
    user: AuthUser,
    actions: CopilotProposedAction[],
    allowed: CopilotAllowedIds,
    granted: ReadonlySet<PermissionCode>,
  ): Promise<CopilotProposedAction[]> {
    if (!granted.has("customers.read")) return actions;
    const resolved: CopilotProposedAction[] = [];
    for (const action of actions) {
      if (
        action.type !== "customer_upsert" ||
        action.customer?.mode !== "update" ||
        action.customer.customerId
      ) {
        resolved.push(action);
        continue;
      }
      const label = copilotCustomerLabel(action.customer);
      try {
        const list = await this.customers.listCustomers(user, { search: label, limit: 5 });
        const exact = list.customers.filter(
          (customer) => norm(customer.displayName) === norm(label),
        );
        if (exact.length === 1 && exact[0]) {
          resolved.push(
            assessCopilotAction(
              { ...action, customer: { ...action.customer, customerId: exact[0].id } },
              allowed,
            ),
          );
          continue;
        }
        if (exact.length > 1) {
          resolved.push({
            ...action,
            status: "needs_input",
            blockReason:
              "Plusieurs clients portent ce nom. Ouvrez la fiche voulue puis répétez l'instruction.",
          });
          continue;
        }
      } catch {
        /* laisser l'action telle quelle */
      }
      resolved.push(action);
    }
    return resolved;
  }

  private mergeApplied(doc: CopilotSessionDocument, applied: CopilotProposedAction[]): void {
    doc.actions = doc.actions.map(
      (action) => applied.find((item) => item.id === action.id) ?? action,
    );
  }

  private async applyAction(
    user: AuthUser,
    action: CopilotProposedAction,
    createdCustomers: Map<string, string>,
    granted: ReadonlySet<PermissionCode>,
  ): Promise<CopilotProposedAction["result"]> {
    const canReadCases = granted.has("cases.read");
    const canReadCustomers = granted.has("customers.read");

    if (action.type === "customer_upsert" && action.customer) {
      const customer = action.customer;
      const address =
        customer.addressLine1 && customer.postalCode && customer.city
          ? {
              line1: customer.addressLine1,
              postalCode: customer.postalCode,
              city: customer.city,
              country: "FR",
            }
          : undefined;
      if (customer.mode === "update" && customer.customerId) {
        const updated = await this.customers.updateCustomer(user, customer.customerId, {
          kind: customer.kind,
          ...(customer.firstName ? { firstName: customer.firstName } : {}),
          ...(customer.lastName ? { lastName: customer.lastName } : {}),
          ...(customer.companyName ? { companyName: customer.companyName } : {}),
          ...(customer.email ? { email: customer.email } : {}),
          ...(customer.phone ? { phone: customer.phone } : {}),
          ...(address ? { address } : {}),
          ...(customer.notes ? { notes: customer.notes } : {}),
        });
        return {
          entityType: "customer",
          entityId: updated.id,
          label: updated.displayName,
          ...(canReadCustomers ? { href: `/customers/${updated.id}` } : {}),
        };
      }
      const created = await this.customers.createCustomer(user, {
        kind: customer.kind,
        firstName: customer.firstName,
        lastName: customer.lastName,
        companyName: customer.companyName,
        email: customer.email,
        phone: customer.phone,
        address,
        notes: customer.notes,
      });
      createdCustomers.set(norm(created.displayName), created.id);
      createdCustomers.set(norm(copilotCustomerLabel(customer)), created.id);
      return {
        entityType: "customer",
        entityId: created.id,
        label: created.displayName,
        ...(canReadCustomers ? { href: `/customers/${created.id}` } : {}),
      };
    }

    if (action.type === "quote_draft" && action.quote) {
      const quote = action.quote;
      let caseId = quote.caseId;
      let customerId = quote.customerId;
      if (!customerId && quote.customerName) {
        customerId = createdCustomers.get(norm(quote.customerName));
      }
      if (!caseId) {
        if (!customerId) {
          throw new BadRequestException("Indiquez le client du devis.");
        }
        const createdCase = await this.casesGateway.createCase(user, {
          customerId,
          description: [quote.subject, quote.notes].filter(Boolean).join("\n"),
        });
        caseId = createdCase.id;
      }
      const created = await this.casesGateway.createQuote(user, {
        caseId,
        subject: quote.subject,
        notes: [
          quote.notes,
          "Brouillon préparé avec le copilote. Vérifiez les montants avant tout envoi.",
        ]
          .filter(Boolean)
          .join("\n"),
        lines: quote.lines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice ?? 0,
          tvaRate: line.tvaRate,
        })),
      });
      return {
        entityType: "quote",
        entityId: created.id,
        caseId,
        label: created.quoteNumber,
        ...(canReadCases ? { href: `/cases/${caseId}` } : {}),
      };
    }

    if (action.type === "case_note" && action.note?.entityId) {
      const created = await this.casesGateway.createComment(user, {
        entityType: action.note.entityType,
        entityId: action.note.entityId,
        body: action.note.body,
      });
      return {
        entityType: "comment",
        entityId: created.id,
        caseId: created.caseId,
        label: "Note",
        ...(canReadCases ? { href: `/cases/${created.caseId}` } : {}),
      };
    }

    if (
      action.type === "schedule_follow_up" &&
      action.followUp?.caseId &&
      action.followUp.scheduledStart
    ) {
      const created = await this.casesGateway.createIntervention(user, {
        caseId: action.followUp.caseId,
        title: action.followUp.title,
        description: action.followUp.notes,
        scheduledStart: action.followUp.scheduledStart,
        scheduledEnd: action.followUp.scheduledEnd,
      });
      return {
        entityType: "intervention",
        entityId: created.id,
        caseId: created.caseId,
        label: created.title,
        ...(canReadCases ? { href: `/cases/${created.caseId}` } : {}),
      };
    }

    if (action.type === "field_report" && action.fieldReport?.interventionId) {
      const updated = await this.interventions.confirmFieldReport(
        action.fieldReport.interventionId,
        user.organizationId,
        action.fieldReport.reportText,
      );
      return {
        entityType: "intervention",
        entityId: updated.id,
        caseId: updated.caseId,
        label: updated.title,
        ...(canReadCases ? { href: `/cases/${updated.caseId}` } : {}),
      };
    }

    throw new BadRequestException("Cette action ne peut pas être enregistrée.");
  }
}
