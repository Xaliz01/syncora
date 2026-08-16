import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  activeDocumentFilter,
  clampPagination,
  MAINTENANCE_CONTRACT_STATUSES,
  organizationScopeFilter,
  parseMaintenanceRemindBeforeDays,
  parseMaintenanceSchedulingMode,
  type CreateMaintenanceContractBody,
  type DashboardMaintenanceVisitItem,
  type GenerateMaintenanceVisitResponse,
  type MaintenanceContractResponse,
  type MaintenanceContractsListResponse,
  type MaintenanceContractStatus,
  type MaintenanceRemindBeforeDays,
  type MaintenanceSchedulingMode,
  type UpdateMaintenanceContractBody,
} from "@planwise/shared";
import {
  assertOrganizationScopedListNest,
  assertOrganizationScopedResourceNest,
} from "@planwise/shared/nest";
import type { MaintenanceContractDocument } from "../persistence/maintenance-contract.schema";
import { AbstractCasesService } from "./ports/cases.service.port";
import {
  toMaintenanceContractResponse,
  toDashboardMaintenanceVisitItem,
} from "./mappers/maintenance-contract.mapper";

const JOB_TAG = "contrat-maintenance";
const VISITS_TO_SCHEDULE_LIMIT = 20;

function toDateOnly(value: string): string {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    throw new BadRequestException("Date invalide (attendu AAAA-MM-JJ)");
  }
  return trimmed.slice(0, 10);
}

/** Ajoute N mois à une date AAAA-MM-JJ (UTC), en gérant les fins de mois. */
export function addMonthsDateOnly(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return dt.toISOString().slice(0, 10);
}

/** Ajoute N jours à une date AAAA-MM-JJ (UTC). */
export function addDaysDateOnly(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

function assertExclusiveAssignment(assigneeId?: string | null, teamId?: string | null) {
  if (assigneeId && teamId) {
    throw new BadRequestException("Choisir un technicien ou une équipe par défaut, pas les deux.");
  }
}

function resolveSchedulingMode(doc: MaintenanceContractDocument): MaintenanceSchedulingMode {
  return parseMaintenanceSchedulingMode(doc.schedulingMode);
}

function resolveRemindBeforeDays(doc: MaintenanceContractDocument): MaintenanceRemindBeforeDays {
  return parseMaintenanceRemindBeforeDays(doc.remindBeforeDays);
}

@Injectable()
export class MaintenanceContractsService {
  constructor(
    @InjectModel("MaintenanceContract")
    private readonly contractModel: Model<MaintenanceContractDocument>,
    @Inject(forwardRef(() => AbstractCasesService))
    private readonly casesService: AbstractCasesService,
  ) {}

  async create(body: CreateMaintenanceContractBody): Promise<MaintenanceContractResponse> {
    const title = body.title?.trim();
    if (!title) throw new BadRequestException("Le titre est obligatoire");
    if (!body.customerId?.trim()) throw new BadRequestException("Le client est obligatoire");
    const recurrenceMonths = Number(body.recurrenceMonths);
    if (!Number.isFinite(recurrenceMonths) || recurrenceMonths < 1) {
      throw new BadRequestException("La récurrence doit être d’au moins 1 mois");
    }
    assertExclusiveAssignment(body.defaultAssigneeId, body.defaultTeamId);

    const startDate = toDateOnly(body.startDate);
    const nextDueDate = toDateOnly(body.nextDueDate?.trim() ? body.nextDueDate : startDate);
    const endDate = body.endDate?.trim() ? toDateOnly(body.endDate) : undefined;
    if (endDate && endDate < startDate) {
      throw new BadRequestException("La date de fin doit être postérieure au début");
    }

    const templateId = await this.resolveTemplateId(body.organizationId, body.templateId);
    const status = this.parseStatus(body.status ?? "draft");
    const schedulingMode = parseMaintenanceSchedulingMode(body.schedulingMode);
    const remindBeforeDays = parseMaintenanceRemindBeforeDays(body.remindBeforeDays);

    const doc = await this.contractModel.create({
      organizationId: body.organizationId,
      customerId: body.customerId.trim(),
      siteId: body.siteId?.trim() || undefined,
      templateId,
      title,
      description: body.description?.trim() || undefined,
      status,
      startDate,
      endDate,
      recurrenceMonths: Math.floor(recurrenceMonths),
      nextDueDate,
      schedulingMode,
      remindBeforeDays,
      schedulingPending: false,
      defaultAssigneeId: body.defaultAssigneeId?.trim() || undefined,
      defaultTeamId: body.defaultTeamId?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
    });

    return assertOrganizationScopedResourceNest(
      body.organizationId,
      toMaintenanceContractResponse(doc),
    );
  }

  async list(
    organizationId: string,
    filters?: {
      customerId?: string;
      status?: string;
      dueBefore?: string;
      toSchedule?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<MaintenanceContractsListResponse> {
    const { limit, offset } = clampPagination({
      limit: filters?.limit,
      offset: filters?.offset,
    });
    const query: Record<string, unknown> = {
      ...organizationScopeFilter(organizationId),
      ...activeDocumentFilter,
    };
    if (filters?.customerId?.trim()) query.customerId = filters.customerId.trim();
    if (filters?.status?.trim()) {
      query.status = this.parseStatus(filters.status);
    }
    if (filters?.dueBefore?.trim()) {
      query.nextDueDate = { $lte: toDateOnly(filters.dueBefore) };
    }
    if (filters?.toSchedule) {
      Object.assign(query, this.toScheduleMongoFilter(todayDateOnly()));
    }

    const [total, docs] = await Promise.all([
      this.contractModel.countDocuments(query).exec(),
      this.contractModel
        .find(query)
        .sort({ nextDueDate: 1, updatedAt: -1 })
        .skip(filters?.toSchedule ? 0 : offset)
        .limit(filters?.toSchedule ? Math.max(limit + offset, 100) : limit)
        .exec(),
    ]);

    let contracts = docs.map((d) => toMaintenanceContractResponse(d));
    if (filters?.toSchedule) {
      const today = todayDateOnly();
      const filtered = docs.filter((d) => this.isInScheduleWindow(d, today));
      const page = filtered.slice(offset, offset + limit);
      contracts = page.map((d) => toMaintenanceContractResponse(d));
      assertOrganizationScopedListNest(organizationId, contracts);
      return { contracts, total: filtered.length };
    }

    assertOrganizationScopedListNest(organizationId, contracts);
    return { contracts, total };
  }

  async get(organizationId: string, contractId: string): Promise<MaintenanceContractResponse> {
    const doc = await this.findInOrg(organizationId, contractId);
    return assertOrganizationScopedResourceNest(organizationId, toMaintenanceContractResponse(doc));
  }

  async update(
    contractId: string,
    body: UpdateMaintenanceContractBody,
  ): Promise<MaintenanceContractResponse> {
    const doc = await this.findInOrg(body.organizationId, contractId);

    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title) throw new BadRequestException("Le titre est obligatoire");
      doc.title = title;
    }
    if (body.customerId !== undefined) {
      if (!body.customerId.trim()) throw new BadRequestException("Le client est obligatoire");
      doc.customerId = body.customerId.trim();
    }
    if (body.siteId !== undefined) {
      doc.siteId = body.siteId?.trim() || undefined;
    }
    if (body.templateId !== undefined) {
      doc.templateId = await this.resolveTemplateId(body.organizationId, body.templateId);
    }
    if (body.description !== undefined) {
      doc.description = body.description?.trim() || undefined;
    }
    if (body.status !== undefined) {
      doc.status = this.parseStatus(body.status);
    }
    if (body.startDate !== undefined) {
      doc.startDate = toDateOnly(body.startDate);
    }
    if (body.endDate !== undefined) {
      doc.endDate = body.endDate?.trim() ? toDateOnly(body.endDate) : undefined;
    }
    if (body.recurrenceMonths !== undefined) {
      const recurrenceMonths = Number(body.recurrenceMonths);
      if (!Number.isFinite(recurrenceMonths) || recurrenceMonths < 1) {
        throw new BadRequestException("La récurrence doit être d’au moins 1 mois");
      }
      doc.recurrenceMonths = Math.floor(recurrenceMonths);
    }
    if (body.nextDueDate !== undefined) {
      doc.nextDueDate = toDateOnly(body.nextDueDate);
      doc.reminderSentForDueDate = undefined;
    }
    if (body.schedulingMode !== undefined) {
      doc.schedulingMode = parseMaintenanceSchedulingMode(body.schedulingMode);
    }
    if (body.remindBeforeDays !== undefined) {
      doc.remindBeforeDays = parseMaintenanceRemindBeforeDays(body.remindBeforeDays);
    }
    if (body.defaultAssigneeId !== undefined || body.defaultTeamId !== undefined) {
      const assignee =
        body.defaultAssigneeId !== undefined
          ? body.defaultAssigneeId?.trim() || undefined
          : doc.defaultAssigneeId;
      const team =
        body.defaultTeamId !== undefined
          ? body.defaultTeamId?.trim() || undefined
          : doc.defaultTeamId;
      assertExclusiveAssignment(assignee, team);
      if (body.defaultAssigneeId !== undefined) {
        doc.defaultAssigneeId = body.defaultAssigneeId?.trim() || undefined;
        if (doc.defaultAssigneeId) doc.defaultTeamId = undefined;
      }
      if (body.defaultTeamId !== undefined) {
        doc.defaultTeamId = body.defaultTeamId?.trim() || undefined;
        if (doc.defaultTeamId) doc.defaultAssigneeId = undefined;
      }
    }
    if (body.notes !== undefined) {
      doc.notes = body.notes?.trim() || undefined;
    }

    if (doc.endDate && doc.endDate < doc.startDate) {
      throw new BadRequestException("La date de fin doit être postérieure au début");
    }

    await doc.save();
    return assertOrganizationScopedResourceNest(
      body.organizationId,
      toMaintenanceContractResponse(doc),
    );
  }

  async remove(organizationId: string, contractId: string): Promise<{ deleted: true }> {
    const doc = await this.findInOrg(organizationId, contractId);
    doc.deletedAt = new Date();
    await doc.save();
    return { deleted: true };
  }

  /**
   * Crée un dossier + intervention planifiée pour l’échéance courante,
   * puis avance `nextDueDate` de `recurrenceMonths`.
   */
  async generateVisit(
    organizationId: string,
    contractId: string,
    options?: { force?: boolean; scheduledStart?: string; scheduledEnd?: string },
  ): Promise<GenerateMaintenanceVisitResponse> {
    const doc = await this.findInOrg(organizationId, contractId);
    if (doc.status !== "active" && !options?.force) {
      throw new BadRequestException("Seuls les contrats actifs peuvent générer une visite");
    }

    const due = toDateOnly(doc.nextDueDate);
    if (doc.endDate && due > doc.endDate) {
      doc.status = "ended";
      await doc.save();
      throw new BadRequestException("Le contrat est arrivé à échéance (date de fin dépassée)");
    }

    let scheduledStart = `${due}T08:00:00.000Z`;
    let scheduledEnd = `${due}T10:00:00.000Z`;
    if (options?.scheduledStart?.trim() && options?.scheduledEnd?.trim()) {
      const start = new Date(options.scheduledStart);
      const end = new Date(options.scheduledEnd);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new BadRequestException("Horaires de visite invalides");
      }
      if (end <= start) {
        throw new BadRequestException("La fin de visite doit être après le début");
      }
      scheduledStart = start.toISOString();
      scheduledEnd = end.toISOString();
    } else if (options?.scheduledStart || options?.scheduledEnd) {
      throw new BadRequestException("Indiquer le début et la fin de la visite");
    }

    const caseRes = await this.casesService.createCase({
      organizationId,
      title: `Maintenance — ${doc.title}`,
      description:
        doc.description?.trim() ||
        `Visite générée automatiquement depuis le contrat de maintenance « ${doc.title} ».`,
      customerId: doc.customerId,
      interventionSiteId: doc.siteId,
      templateId: doc.templateId,
      dueDate: scheduledStart,
      priority: "medium",
      tags: [JOB_TAG],
    });

    const interventionRes = await this.casesService.createIntervention({
      organizationId,
      caseId: caseRes.id,
      title: doc.title,
      description: doc.description,
      assigneeId: doc.defaultAssigneeId,
      assignedTeamId: doc.defaultTeamId,
      scheduledStart,
      scheduledEnd,
    });

    const nextDue = addMonthsDateOnly(due, doc.recurrenceMonths);
    if (doc.endDate && nextDue > doc.endDate) {
      doc.status = "ended";
    }
    const generatedAt = new Date().toISOString();
    const historyEntry = {
      caseId: caseRes.id,
      interventionId: interventionRes.id,
      dueDate: due,
      generatedAt,
    };
    doc.visitHistory = [historyEntry, ...(doc.visitHistory ?? [])];
    doc.nextDueDate = nextDue;
    doc.lastGeneratedAt = generatedAt;
    doc.lastGeneratedCaseId = caseRes.id;
    doc.lastGeneratedInterventionId = interventionRes.id;
    doc.schedulingPending = false;
    doc.reminderSentForDueDate = undefined;
    await doc.save();

    return {
      contract: assertOrganizationScopedResourceNest(
        organizationId,
        toMaintenanceContractResponse(doc),
      ),
      caseId: caseRes.id,
      interventionId: interventionRes.id,
    };
  }

  /**
   * Traite les contrats actifs :
   * - auto_plan à échéance → génère la visite
   * - schedule_with_client dans la fenêtre de rappel → marque schedulingPending
   */
  async processDueContracts(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    skipped: number;
  }> {
    const today = todayDateOnly();
    const maxRemind = Math.max(...([7, 14, 30] as const));
    const horizon = addDaysDateOnly(today, maxRemind);

    const candidates = await this.contractModel
      .find({
        status: "active",
        nextDueDate: { $lte: horizon },
        ...activeDocumentFilter,
      })
      .exec();

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const doc of candidates) {
      try {
        if (doc.endDate && doc.nextDueDate > doc.endDate) {
          doc.status = "ended";
          await doc.save();
          skipped += 1;
          continue;
        }

        const mode = resolveSchedulingMode(doc);
        if (mode === "auto_plan") {
          if (doc.nextDueDate > today) {
            skipped += 1;
            continue;
          }
          await this.generateVisit(doc.organizationId, doc._id.toString());
          succeeded += 1;
          continue;
        }

        const remindDays = resolveRemindBeforeDays(doc);
        const windowStart = addDaysDateOnly(doc.nextDueDate, -remindDays);
        if (today < windowStart) {
          skipped += 1;
          continue;
        }
        if (doc.schedulingPending) {
          skipped += 1;
          continue;
        }
        doc.schedulingPending = true;
        await doc.save();
        succeeded += 1;
      } catch {
        failed += 1;
      }
    }

    return {
      processed: candidates.length,
      succeeded,
      failed,
      skipped,
    };
  }

  /** Visites à programmer pour le dashboard (org). */
  async listVisitsToSchedule(organizationId: string): Promise<DashboardMaintenanceVisitItem[]> {
    const today = todayDateOnly();
    const docs = await this.contractModel
      .find({
        ...organizationScopeFilter(organizationId),
        ...activeDocumentFilter,
        ...this.toScheduleMongoFilter(today),
      })
      .sort({ nextDueDate: 1 })
      .limit(100)
      .exec();

    const items = docs
      .filter((doc) => this.isInScheduleWindow(doc, today))
      .slice(0, VISITS_TO_SCHEDULE_LIMIT)
      .map((doc) => toDashboardMaintenanceVisitItem(doc, today));
    assertOrganizationScopedListNest(
      organizationId,
      items.map((i) => ({ organizationId, id: i.contractId })),
    );
    return items;
  }

  /**
   * Candidats multi-org pour le scheduler de notifications
   * (pending, rappel pas encore envoyé pour cette échéance).
   */
  async listReminderCandidates(): Promise<MaintenanceContractResponse[]> {
    const today = todayDateOnly();
    const maxRemind = Math.max(...([7, 14, 30] as const));
    const horizon = addDaysDateOnly(today, maxRemind);

    const docs = await this.contractModel
      .find({
        status: "active",
        nextDueDate: { $lte: horizon },
        ...activeDocumentFilter,
        $or: [
          { schedulingMode: "schedule_with_client" },
          { schedulingMode: { $exists: false } },
          { schedulingMode: null },
        ],
      })
      .sort({ nextDueDate: 1 })
      .limit(200)
      .exec();

    const results: MaintenanceContractResponse[] = [];
    for (const doc of docs) {
      const remindDays = resolveRemindBeforeDays(doc);
      const windowStart = addDaysDateOnly(doc.nextDueDate, -remindDays);
      if (today < windowStart) continue;
      if (doc.reminderSentForDueDate === doc.nextDueDate) continue;
      if (!doc.schedulingPending) {
        doc.schedulingPending = true;
        await doc.save();
      }
      results.push(toMaintenanceContractResponse(doc));
    }
    return results;
  }

  async markReminded(
    organizationId: string,
    contractId: string,
  ): Promise<MaintenanceContractResponse> {
    const doc = await this.findInOrg(organizationId, contractId);
    doc.reminderSentForDueDate = doc.nextDueDate;
    doc.schedulingPending = true;
    await doc.save();
    return assertOrganizationScopedResourceNest(organizationId, toMaintenanceContractResponse(doc));
  }

  private toScheduleMongoFilter(today: string): Record<string, unknown> {
    const maxRemind = Math.max(...([7, 14, 30] as const));
    const horizon = addDaysDateOnly(today, maxRemind);
    return {
      status: "active",
      $or: [
        { schedulingMode: "schedule_with_client" },
        { schedulingMode: { $exists: false } },
        { schedulingMode: null },
      ],
      $and: [
        {
          $or: [{ schedulingPending: true }, { nextDueDate: { $lte: horizon } }],
        },
      ],
    };
  }

  private isInScheduleWindow(doc: MaintenanceContractDocument, today: string): boolean {
    if (doc.schedulingPending === true) return true;
    const remindDays = resolveRemindBeforeDays(doc);
    const windowStart = addDaysDateOnly(doc.nextDueDate, -remindDays);
    return today >= windowStart;
  }

  private async resolveTemplateId(
    organizationId: string,
    templateId: string | null | undefined,
  ): Promise<string | undefined> {
    if (templateId === null || templateId === undefined) return undefined;
    const trimmed = templateId.trim();
    if (!trimmed) return undefined;
    await this.casesService.getTemplate(trimmed, organizationId);
    return trimmed;
  }

  private async findInOrg(
    organizationId: string,
    contractId: string,
  ): Promise<MaintenanceContractDocument> {
    const doc = await this.contractModel
      .findOne({
        _id: contractId,
        ...organizationScopeFilter(organizationId),
        ...activeDocumentFilter,
      })
      .exec();
    if (!doc) throw new NotFoundException("Contrat de maintenance introuvable");
    return doc;
  }

  private parseStatus(raw: string): MaintenanceContractStatus {
    if (!(MAINTENANCE_CONTRACT_STATUSES as readonly string[]).includes(raw)) {
      throw new BadRequestException(`Statut invalide: ${raw}`);
    }
    return raw as MaintenanceContractStatus;
  }
}
