import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  activeDocumentFilter,
  buildCaseDisplayTitle,
  clampPagination,
  type CaseResponse,
  type CasesListResponse,
  type CaseTemplateResponse,
  type CreateCaseBody,
  type CreateInterventionBody,
  type InterventionResponse,
  type UpdateCaseBody,
  type UpdateTodoBody,
} from "@planwise/shared";
import type { CaseTemplateDocument } from "../persistence/case-template.schema";
import type { CaseDocument } from "../persistence/case.schema";
import type { InterventionDocument } from "../persistence/intervention.schema";
import type { InterventionTypeDocument } from "../persistence/intervention-type.schema";
import type { CaseHistoryDocument } from "../persistence/case-history.schema";
import type { CommentDocument } from "../persistence/comment.schema";
import type { QuoteDocument } from "../persistence/quote.schema";
import { AbstractCasesService } from "./ports/cases.service.port";
import { AbstractInterventionsService } from "./ports/interventions.service.port";
import { AbstractCaseTemplatesService } from "./ports/case-templates.service.port";
import { toCaseResponse, toCaseSummary } from "./mappers/case.mapper";
import { isDuplicateKeyError } from "./utils";
import { generateCaseNumber } from "./utils/case-number.utils";

@Injectable()
export class CasesService extends AbstractCasesService {
  constructor(
    @InjectModel("CaseTemplate")
    private readonly templateModel: Model<CaseTemplateDocument>,
    @InjectModel("Case")
    private readonly caseModel: Model<CaseDocument>,
    @InjectModel("Intervention")
    private readonly interventionModel: Model<InterventionDocument>,
    @InjectModel("InterventionType")
    private readonly interventionTypeModel: Model<InterventionTypeDocument>,
    @InjectModel("CaseHistory")
    private readonly caseHistoryModel: Model<CaseHistoryDocument>,
    @InjectModel("Comment")
    private readonly commentModel: Model<CommentDocument>,
    @InjectModel("Quote")
    private readonly quoteModel: Model<QuoteDocument>,
    @Inject(AbstractInterventionsService)
    private readonly interventionsService: AbstractInterventionsService,
    @Inject(AbstractCaseTemplatesService)
    private readonly caseTemplatesService: AbstractCaseTemplatesService,
  ) {
    super();
  }

  async createCase(body: CreateCaseBody): Promise<CaseResponse> {
    let steps: CaseDocument["steps"] = [];

    if (body.templateId) {
      const template = await this.templateModel
        .findOne({
          _id: body.templateId,
          organizationId: body.organizationId,
          ...activeDocumentFilter,
        })
        .exec();
      if (!template) throw new NotFoundException("Case template not found");
      steps = template.steps.map((s) => ({
        id: new Types.ObjectId().toHexString(),
        name: s.name,
        description: s.description,
        order: s.order,
        todos: (s.todos ?? []).map((t) => ({
          id: new Types.ObjectId().toHexString(),
          label: t.label,
          description: t.description,
          status: "pending" as const,
        })),
      }));
    }

    const partyLabel = body.customerDisplayName?.trim() || body.title?.trim() || undefined;
    let lastError: unknown;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      try {
        const caseNumber = await generateCaseNumber(this.caseModel, body.organizationId);
        const doc = await this.caseModel.create({
          organizationId: body.organizationId,
          templateId: body.templateId,
          customerId: body.customerId?.trim() || undefined,
          orderGiverId: body.orderGiverId?.trim() || undefined,
          interventionSiteId: body.interventionSiteId?.trim() || undefined,
          caseNumber,
          title: buildCaseDisplayTitle(caseNumber, partyLabel),
          description: body.description,
          priority: body.priority ?? "medium",
          assignees: body.assignees ?? [],
          dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
          tags: body.tags ?? [],
          steps,
          status: "draft",
          isTestData: body.isTestData === true,
        });
        return toCaseResponse(doc);
      } catch (err) {
        if (!isDuplicateKeyError(err)) throw err;
        lastError = err;
        // Désynchronise les retries concurrents (injection démo en parallèle).
        await new Promise((r) => setTimeout(r, 5 + attempt * 3));
      }
    }
    throw lastError;
  }

  async listCases(
    organizationId: string,
    filters?: {
      status?: string;
      billingStatus?: string;
      assigneeId?: string;
      priority?: string;
      search?: string;
      customerId?: string;
      orderGiverId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<CasesListResponse> {
    const query: Record<string, unknown> = { organizationId, ...activeDocumentFilter };
    if (filters?.customerId) query.customerId = filters.customerId;
    if (filters?.orderGiverId) query.orderGiverId = filters.orderGiverId;
    if (filters?.status) query.status = filters.status;
    if (filters?.billingStatus) query.billingStatus = filters.billingStatus;
    if (filters?.priority) query.priority = filters.priority;

    const andClauses: Record<string, unknown>[] = [];
    if (filters?.assigneeId) {
      andClauses.push({
        $or: [
          { assignees: { $elemMatch: { userId: filters.assigneeId } } },
          { assigneeId: filters.assigneeId },
        ],
      });
    }
    const search = filters?.search?.trim();
    if (search) {
      andClauses.push({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { caseNumber: { $regex: search, $options: "i" } },
        ],
      });
    }
    if (andClauses.length === 1) {
      Object.assign(query, andClauses[0]);
    } else if (andClauses.length > 1) {
      query.$and = andClauses;
    }

    const { limit, offset } = clampPagination({
      limit: filters?.limit,
      offset: filters?.offset,
    });

    const [total, docs] = await Promise.all([
      this.caseModel.countDocuments(query).exec(),
      this.caseModel.find(query).sort({ updatedAt: -1 }).skip(offset).limit(limit).exec(),
    ]);

    return { cases: docs.map((d) => toCaseSummary(d)), total };
  }

  async listCaseIds(
    organizationId: string,
    filters: { customerId?: string; orderGiverId?: string },
  ): Promise<string[]> {
    const customerId = filters.customerId?.trim();
    const orderGiverId = filters.orderGiverId?.trim();
    if (!customerId && !orderGiverId) return [];

    const query: Record<string, unknown> = { organizationId, ...activeDocumentFilter };
    if (customerId) query.customerId = customerId;
    if (orderGiverId) query.orderGiverId = orderGiverId;

    const docs = await this.caseModel.find(query).select({ _id: 1 }).limit(1000).lean().exec();
    return docs.map((d) => String(d._id));
  }

  async getCase(id: string, organizationId: string): Promise<CaseResponse> {
    const doc = await this.caseModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Case not found");
    return toCaseResponse(doc);
  }

  async updateCase(id: string, body: UpdateCaseBody): Promise<CaseResponse> {
    const existing = await this.caseModel
      .findOne({ _id: id, organizationId: body.organizationId, ...activeDocumentFilter })
      .exec();
    if (!existing) throw new NotFoundException("Case not found");

    const setUpdate: Record<string, unknown> = {};
    if (body.description !== undefined) setUpdate.description = body.description;
    if (body.status !== undefined) setUpdate.status = body.status;
    if (body.billingStatus !== undefined) setUpdate.billingStatus = body.billingStatus;
    if (body.priority !== undefined) setUpdate.priority = body.priority;
    if (body.assignees !== undefined) setUpdate.assignees = body.assignees;
    if (body.dueDate !== undefined)
      setUpdate.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.tags !== undefined) setUpdate.tags = body.tags;
    if (body.customerId !== undefined) {
      setUpdate.customerId = body.customerId === null ? null : body.customerId.trim() || undefined;
    }
    if (body.orderGiverId !== undefined) {
      setUpdate.orderGiverId =
        body.orderGiverId === null ? null : body.orderGiverId.trim() || undefined;
    }
    if (body.interventionSiteId !== undefined) {
      setUpdate.interventionSiteId =
        body.interventionSiteId === null ? null : body.interventionSiteId.trim() || undefined;
    }

    if (body.customerId !== undefined || body.customerDisplayName !== undefined) {
      const partyLabel =
        body.customerDisplayName === undefined
          ? undefined
          : body.customerDisplayName === null
            ? undefined
            : body.customerDisplayName.trim() || undefined;
      // Recalcule uniquement quand le gateway envoie customerDisplayName (changement client).
      if (body.customerDisplayName !== undefined) {
        setUpdate.title = buildCaseDisplayTitle(existing.caseNumber, partyLabel);
      }
    }

    const mongoUpdate: Record<string, unknown> = { $set: setUpdate };
    if (body.assignees !== undefined) {
      mongoUpdate.$unset = { assigneeId: "", assigneeName: "" };
    }

    const doc = await this.caseModel
      .findOneAndUpdate(
        { _id: id, organizationId: body.organizationId, ...activeDocumentFilter },
        mongoUpdate,
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException("Case not found");
    return toCaseResponse(doc);
  }

  async deleteCase(id: string, organizationId: string): Promise<{ deleted: true }> {
    const now = new Date();
    const result = await this.caseModel
      .updateOne({ _id: id, organizationId, ...activeDocumentFilter }, { $set: { deletedAt: now } })
      .exec();
    if (!result.matchedCount) throw new NotFoundException("Case not found");
    await this.interventionModel
      .updateMany(
        { caseId: id, organizationId, ...activeDocumentFilter },
        { $set: { deletedAt: now } },
      )
      .exec();
    await this.commentModel
      .updateMany(
        { caseId: id, organizationId, ...activeDocumentFilter },
        { $set: { deletedAt: now } },
      )
      .exec();
    await this.quoteModel
      .updateMany(
        { caseId: id, organizationId, ...activeDocumentFilter },
        { $set: { deletedAt: now } },
      )
      .exec();
    return { deleted: true };
  }

  async updateTodo(caseId: string, body: UpdateTodoBody): Promise<CaseResponse> {
    const doc = await this.caseModel
      .findOne({ _id: caseId, organizationId: body.organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Case not found");

    let found = false;
    for (const step of doc.steps) {
      if (step.id !== body.stepId) continue;
      for (const todo of step.todos) {
        if (todo.id !== body.todoId) continue;
        todo.status = body.status;
        if (body.status === "done") {
          todo.completedAt = new Date();
        }
        found = true;
        break;
      }
      if (found) break;
    }
    if (!found) throw new NotFoundException("Todo not found");

    this.autoAdvanceStatus(doc);
    await doc.save();
    return toCaseResponse(doc);
  }

  async purgeTestData(organizationId: string): Promise<{ purged: true }> {
    const testCases = await this.caseModel
      .find({ organizationId, isTestData: true })
      .select("_id")
      .exec();
    const caseIds = testCases.map((c) => c._id.toString());
    const interventionFilter: Record<string, unknown> = {
      organizationId,
      $or: [{ isTestData: true }],
    };
    if (caseIds.length > 0) {
      (interventionFilter.$or as unknown[]).push({ caseId: { $in: caseIds } });
    }
    await this.interventionModel.deleteMany(interventionFilter).exec();
    if (caseIds.length > 0) {
      await this.caseHistoryModel.deleteMany({ organizationId, caseId: { $in: caseIds } }).exec();
      await this.commentModel.deleteMany({ organizationId, caseId: { $in: caseIds } }).exec();
    }
    await this.commentModel.deleteMany({ organizationId, isTestData: true }).exec();
    await this.caseModel.deleteMany({ organizationId, isTestData: true }).exec();
    await this.templateModel.deleteMany({ organizationId, isTestData: true }).exec();
    await this.interventionTypeModel.deleteMany({ organizationId, isTestData: true }).exec();
    return { purged: true };
  }

  /** Delegates to InterventionsService — required by MaintenanceContractsService. */
  async createIntervention(body: CreateInterventionBody): Promise<InterventionResponse> {
    return this.interventionsService.createIntervention(body);
  }

  /** Delegates to CaseTemplatesService — required by MaintenanceContractsService. */
  async getTemplate(id: string, organizationId: string): Promise<CaseTemplateResponse> {
    return this.caseTemplatesService.getTemplate(id, organizationId);
  }

  private autoAdvanceStatus(doc: CaseDocument): void {
    const allTodos = doc.steps.flatMap((s) => s.todos);
    if (allTodos.length === 0) return;

    const allDone = allTodos.every((t) => t.status === "done" || t.status === "skipped");
    const anyDone = allTodos.some((t) => t.status === "done");

    if (allDone && doc.status !== "completed") {
      doc.status = "completed";
    } else if (anyDone && doc.status === "draft") {
      doc.status = "in_progress";
    } else if (anyDone && doc.status === "open") {
      doc.status = "in_progress";
    }
  }
}
