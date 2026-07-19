import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  activeDocumentFilter,
  type CaseAssignee,
  type CaseHistoryEntryResponse,
  type CaseResponse,
  type CaseSummaryResponse,
  type CompleteInterventionBody,
  type CompleteInterventionResponse,
  type CreateCaseBody,
  type CreateCaseHistoryBody,
  type CreateCaseTemplateBody,
  type CreateInterventionBody,
  type CaseDashboardResponse,
  type CaseTemplateResponse,
  type DashboardStatFilter,
  type DashboardTodoItem,
  type DashboardTodoCaseItem,
  type InterventionResponse,
  type SignInterventionBody,
  type SignInterventionResponse,
  type StartInterventionBody,
  type StartInterventionResponse,
  type UpdateCaseBody,
  type UpdateCaseTemplateBody,
  type UpdateInterventionBody,
  type UpdateTodoBody,
  type CreateQuoteBody,
  type UpdateQuoteBody,
  type QuoteResponse,
  type QuoteSummaryResponse,
  type CreateCommentBody,
  type UpdateCommentBody,
  type CommentResponse,
  type CommentEntityType,
  MAX_COMMENT_BODY_LENGTH,
} from "@planwise/shared";
import type { CaseTemplateDocument } from "../persistence/case-template.schema";
import type { CaseDocument } from "../persistence/case.schema";
import type { CaseHistoryDocument } from "../persistence/case-history.schema";
import type { InterventionDocument } from "../persistence/intervention.schema";
import type { QuoteDocument, QuoteLineSubDoc } from "../persistence/quote.schema";
import type { CommentDocument } from "../persistence/comment.schema";
import { AbstractCasesService } from "./ports/cases.service.port";

@Injectable()
export class CasesService extends AbstractCasesService {
  constructor(
    @InjectModel("CaseTemplate")
    private readonly templateModel: Model<CaseTemplateDocument>,
    @InjectModel("Case")
    private readonly caseModel: Model<CaseDocument>,
    @InjectModel("Intervention")
    private readonly interventionModel: Model<InterventionDocument>,
    @InjectModel("CaseHistory")
    private readonly caseHistoryModel: Model<CaseHistoryDocument>,
    @InjectModel("Quote")
    private readonly quoteModel: Model<QuoteDocument>,
    @InjectModel("Comment")
    private readonly commentModel: Model<CommentDocument>,
  ) {
    super();
  }

  // ── Templates ──

  async createTemplate(body: CreateCaseTemplateBody): Promise<CaseTemplateResponse> {
    try {
      const doc = await this.templateModel.create({
        organizationId: body.organizationId,
        name: body.name,
        description: body.description,
        steps: (body.steps ?? []).map((s, i) => ({
          name: s.name,
          description: s.description,
          order: s.order ?? i,
          todos: (s.todos ?? []).map((t) => ({
            label: t.label,
            description: t.description,
            dashboardRule: t.dashboardRule,
          })),
        })),
        isTestData: body.isTestData === true,
      });
      return this.toTemplateResponse(doc);
    } catch (err: unknown) {
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException("A template with this name already exists");
      }
      throw err;
    }
  }

  async listTemplates(organizationId: string): Promise<CaseTemplateResponse[]> {
    const docs = await this.templateModel
      .find({ organizationId, ...activeDocumentFilter })
      .sort({ createdAt: 1 })
      .exec();
    return docs.map((d) => this.toTemplateResponse(d));
  }

  async getTemplate(id: string, organizationId: string): Promise<CaseTemplateResponse> {
    const doc = await this.templateModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Template not found");
    return this.toTemplateResponse(doc);
  }

  async updateTemplate(id: string, body: UpdateCaseTemplateBody): Promise<CaseTemplateResponse> {
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.description !== undefined) update.description = body.description;
    if (body.steps !== undefined) {
      update.steps = body.steps.map((s, i) => ({
        name: s.name,
        description: s.description,
        order: s.order ?? i,
        todos: (s.todos ?? []).map((t) => ({
          label: t.label,
          description: t.description,
          dashboardRule: t.dashboardRule,
        })),
      }));
    }
    try {
      const doc = await this.templateModel
        .findOneAndUpdate(
          { _id: id, organizationId: body.organizationId, ...activeDocumentFilter },
          { $set: update },
          { new: true },
        )
        .exec();
      if (!doc) throw new NotFoundException("Template not found");
      return this.toTemplateResponse(doc);
    } catch (err: unknown) {
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException("A template with this name already exists");
      }
      throw err;
    }
  }

  async deleteTemplate(id: string, organizationId: string): Promise<{ deleted: true }> {
    const result = await this.templateModel
      .updateOne(
        { _id: id, organizationId, ...activeDocumentFilter },
        { $set: { deletedAt: new Date() } },
      )
      .exec();
    if (!result.matchedCount) throw new NotFoundException("Template not found");
    return { deleted: true };
  }

  // ── Cases ──

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

    const doc = await this.caseModel.create({
      organizationId: body.organizationId,
      templateId: body.templateId,
      customerId: body.customerId?.trim() || undefined,
      interventionSiteId: body.interventionSiteId?.trim() || undefined,
      title: body.title,
      description: body.description,
      priority: body.priority ?? "medium",
      assignees: body.assignees ?? [],
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      tags: body.tags ?? [],
      steps,
      status: "draft",
      isTestData: body.isTestData === true,
    });

    return this.toCaseResponse(doc);
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
    },
  ): Promise<CaseSummaryResponse[]> {
    const query: Record<string, unknown> = { organizationId, ...activeDocumentFilter };
    if (filters?.customerId) query.customerId = filters.customerId;
    if (filters?.status) query.status = filters.status;
    if (filters?.billingStatus) query.billingStatus = filters.billingStatus;
    if (filters?.assigneeId) {
      query.$or = [
        { assignees: { $elemMatch: { userId: filters.assigneeId } } },
        { assigneeId: filters.assigneeId },
      ];
    }
    if (filters?.priority) query.priority = filters.priority;
    if (filters?.search) {
      query.title = { $regex: filters.search, $options: "i" };
    }

    const docs = await this.caseModel.find(query).sort({ updatedAt: -1 }).exec();

    return docs.map((d) => this.toCaseSummary(d));
  }

  async getCase(id: string, organizationId: string): Promise<CaseResponse> {
    const doc = await this.caseModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Case not found");
    return this.toCaseResponse(doc);
  }

  async updateCase(id: string, body: UpdateCaseBody): Promise<CaseResponse> {
    const setUpdate: Record<string, unknown> = {};
    if (body.title !== undefined) setUpdate.title = body.title;
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
    if (body.interventionSiteId !== undefined) {
      setUpdate.interventionSiteId =
        body.interventionSiteId === null ? null : body.interventionSiteId.trim() || undefined;
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
    return this.toCaseResponse(doc);
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
    return this.toCaseResponse(doc);
  }

  // ── Interventions ──

  async createIntervention(body: CreateInterventionBody): Promise<InterventionResponse> {
    const caseDoc = await this.caseModel
      .findOne({
        _id: body.caseId,
        organizationId: body.organizationId,
        ...activeDocumentFilter,
      })
      .exec();
    if (!caseDoc) throw new NotFoundException("Case not found");

    const doc = await this.interventionModel.create({
      organizationId: body.organizationId,
      caseId: body.caseId,
      title: body.title,
      description: body.description,
      assigneeId: body.assigneeId,
      assignedTeamId: body.assignedTeamId,
      scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : undefined,
      scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : undefined,
      status: "planned",
      isTestData: body.isTestData === true,
    });

    await this.caseModel.updateOne(
      { _id: body.caseId, ...activeDocumentFilter },
      { $inc: { interventionCount: 1 } },
    );

    return this.toInterventionResponse(doc, caseDoc.title);
  }

  async listInterventions(
    organizationId: string,
    filters?: {
      caseId?: string;
      assigneeId?: string;
      assignedTeamId?: string;
      assignedTeamIds?: string[];
      startDate?: string;
      endDate?: string;
      status?: string;
      unscheduled?: boolean;
    },
  ): Promise<InterventionResponse[]> {
    const query: Record<string, unknown> = { organizationId, ...activeDocumentFilter };
    if (filters?.caseId) query.caseId = filters.caseId;

    const teamIds = [
      ...(filters?.assignedTeamId ? [filters.assignedTeamId] : []),
      ...(filters?.assignedTeamIds ?? []),
    ].filter((id, index, all) => id && all.indexOf(id) === index);

    if (filters?.assigneeId && teamIds.length > 0) {
      query.$or = [{ assigneeId: filters.assigneeId }, { assignedTeamId: { $in: teamIds } }];
    } else if (filters?.assigneeId) {
      query.assigneeId = filters.assigneeId;
    } else if (teamIds.length === 1) {
      query.assignedTeamId = teamIds[0];
    } else if (teamIds.length > 1) {
      query.assignedTeamId = { $in: teamIds };
    }
    if (filters?.status) query.status = filters.status;
    if (filters?.unscheduled) {
      query.$or = [{ scheduledStart: null }, { scheduledStart: { $exists: false } }];
    } else if (filters?.startDate || filters?.endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (filters?.startDate) dateFilter.$gte = new Date(filters.startDate);
      if (filters?.endDate) dateFilter.$lte = new Date(filters.endDate);
      query.scheduledStart = dateFilter;
    }

    const docs = await this.interventionModel.find(query).sort({ scheduledStart: 1 }).exec();

    const caseIds = [...new Set(docs.map((d) => d.caseId))];
    const cases = await this.caseModel
      .find({ _id: { $in: caseIds }, ...activeDocumentFilter })
      .select("_id title")
      .exec();
    const caseMap = new Map(cases.map((c) => [c._id.toString(), c.title]));

    return docs.map((d) => this.toInterventionResponse(d, caseMap.get(d.caseId)));
  }

  async getIntervention(id: string, organizationId: string): Promise<InterventionResponse> {
    const doc = await this.interventionModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Intervention not found");
    const caseDoc = await this.caseModel
      .findOne({ _id: doc.caseId, ...activeDocumentFilter })
      .select("title")
      .exec();
    return this.toInterventionResponse(doc, caseDoc?.title);
  }

  async updateIntervention(
    id: string,
    body: UpdateInterventionBody,
  ): Promise<InterventionResponse> {
    const update: Record<string, unknown> = {};
    if (body.title !== undefined) update.title = body.title;
    if (body.description !== undefined) update.description = body.description;
    if (body.status !== undefined) update.status = body.status;
    if (body.billingStatus !== undefined) update.billingStatus = body.billingStatus;
    if (body.assigneeId !== undefined) update.assigneeId = body.assigneeId;
    if (body.assignedTeamId !== undefined) update.assignedTeamId = body.assignedTeamId;
    if (body.scheduledStart !== undefined) {
      update.scheduledStart = body.scheduledStart ? new Date(body.scheduledStart) : null;
    }
    if (body.scheduledEnd !== undefined) {
      update.scheduledEnd = body.scheduledEnd ? new Date(body.scheduledEnd) : null;
    }
    if (body.notes !== undefined) update.notes = body.notes;

    const doc = await this.interventionModel
      .findOneAndUpdate(
        { _id: id, organizationId: body.organizationId, ...activeDocumentFilter },
        { $set: update },
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException("Intervention not found");
    const caseDoc = await this.caseModel
      .findOne({ _id: doc.caseId, ...activeDocumentFilter })
      .select("title")
      .exec();
    return this.toInterventionResponse(doc, caseDoc?.title);
  }

  async deleteIntervention(id: string, organizationId: string): Promise<{ deleted: true }> {
    const doc = await this.interventionModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Intervention not found");
    const now = new Date();
    await this.interventionModel.updateOne({ _id: id }, { $set: { deletedAt: now } });
    await this.commentModel
      .updateMany(
        {
          organizationId,
          entityType: "intervention",
          entityId: id,
          ...activeDocumentFilter,
        },
        { $set: { deletedAt: now } },
      )
      .exec();
    await this.caseModel.updateOne(
      { _id: doc.caseId, ...activeDocumentFilter },
      { $inc: { interventionCount: -1 } },
    );
    return { deleted: true };
  }

  async startIntervention(
    id: string,
    body: StartInterventionBody,
  ): Promise<StartInterventionResponse> {
    const doc = await this.interventionModel
      .findOne({ _id: id, organizationId: body.organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Intervention not found");
    if (doc.status !== "planned") {
      throw new ConflictException(
        `Cannot start intervention in status "${doc.status}" — only "planned" interventions can be started`,
      );
    }
    const now = new Date();
    const update: Record<string, unknown> = { status: "in_progress", startedAt: now };
    if (body.location) update.startLocation = body.location;
    await this.interventionModel.updateOne({ _id: id }, { $set: update });
    return {
      id: doc._id.toString(),
      status: "in_progress",
      startedAt: now.toISOString(),
      startLocation: body.location,
    };
  }

  async completeIntervention(
    id: string,
    body: CompleteInterventionBody,
  ): Promise<CompleteInterventionResponse> {
    const doc = await this.interventionModel
      .findOne({ _id: id, organizationId: body.organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Intervention not found");
    if (doc.status !== "in_progress") {
      throw new ConflictException(
        `Cannot complete intervention in status "${doc.status}" — only "in_progress" interventions can be completed`,
      );
    }
    const now = new Date();
    const update: Record<string, unknown> = { status: "completed", completedAt: now };
    if (body.notes !== undefined) update.notes = body.notes;
    if (body.location) update.endLocation = body.location;
    await this.interventionModel.updateOne({ _id: id }, { $set: update });
    return {
      id: doc._id.toString(),
      status: "completed",
      completedAt: now.toISOString(),
      endLocation: body.location,
    };
  }

  async signIntervention(
    id: string,
    body: SignInterventionBody,
  ): Promise<SignInterventionResponse> {
    const doc = await this.interventionModel
      .findOne({ _id: id, organizationId: body.organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Intervention not found");
    if (doc.status !== "completed") {
      throw new ConflictException(
        `Cannot sign intervention in status "${doc.status}" — only completed interventions can be signed`,
      );
    }
    if (doc.signedAt) {
      throw new ConflictException("Intervention already signed");
    }
    const now = new Date();
    await this.interventionModel.updateOne(
      { _id: id },
      {
        $set: {
          signatoryName: body.signatoryName,
          signatureData: body.signatureData,
          signedAt: now,
        },
      },
    );
    return {
      id: doc._id.toString(),
      signatoryName: body.signatoryName,
      signedAt: now.toISOString(),
    };
  }

  async getInterventionWithSignature(
    id: string,
    organizationId: string,
  ): Promise<{ signatureData?: string; signatoryName?: string }> {
    const doc = await this.interventionModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .select("signatureData signatoryName")
      .exec();
    if (!doc) throw new NotFoundException("Intervention not found");
    return { signatureData: doc.signatureData, signatoryName: doc.signatoryName };
  }

  // ── Dashboard ──

  async getDashboardTodoCases(
    organizationId: string,
    userId: string,
    userProfileId: string | undefined,
    templateId: string,
    todoLabel: string,
  ): Promise<DashboardTodoCaseItem[]> {
    const template = await this.templateModel
      .findOne({ _id: templateId, organizationId, ...activeDocumentFilter })
      .exec();
    if (!template) return [];

    let found = false;
    for (const step of template.steps) {
      for (const todo of step.todos) {
        if (todo.label === todoLabel && todo.dashboardRule?.showOnDashboard) {
          if (this.isTodoVisibleToUser(todo.dashboardRule, userId, userProfileId)) {
            found = true;
          }
        }
      }
    }
    if (!found) return [];

    const cases = await this.caseModel
      .find({
        organizationId,
        templateId,
        ...activeDocumentFilter,
        status: { $nin: ["completed", "cancelled"] },
        "steps.todos": {
          $elemMatch: { label: todoLabel, status: "pending" },
        },
      })
      .sort({ createdAt: 1 })
      .exec();

    return cases.map((c) => this.toDashboardCaseListItem(c));
  }

  async getDashboardStatCases(
    organizationId: string,
    userId: string,
    _userProfileId: string | undefined,
    filter: DashboardStatFilter,
  ): Promise<DashboardTodoCaseItem[]> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const assignedBase = {
      organizationId,
      ...activeDocumentFilter,
      $or: [{ assignees: { $elemMatch: { userId } } }, { assigneeId: userId }],
    };

    let query: Record<string, unknown>;
    let sort: Record<string, 1 | -1> = { priority: -1, dueDate: 1 };

    switch (filter) {
      case "assigned":
        query = { ...assignedBase, status: { $nin: ["completed", "cancelled"] } };
        break;
      case "in_progress":
        query = { ...assignedBase, status: "in_progress" };
        break;
      case "completed_week":
        query = {
          ...assignedBase,
          status: "completed",
          updatedAt: { $gte: startOfWeek },
        };
        sort = { updatedAt: -1 };
        break;
      case "overdue":
        query = {
          ...assignedBase,
          status: { $nin: ["completed", "cancelled"] },
          dueDate: { $lt: now },
        };
        break;
      case "to_invoice":
        query = {
          organizationId,
          ...activeDocumentFilter,
          billingStatus: "to_invoice",
        };
        sort = { updatedAt: -1 };
        break;
      default:
        return [];
    }

    const cases = await this.caseModel.find(query).sort(sort).exec();
    return cases.map((c) => this.toDashboardCaseListItem(c));
  }

  async getDashboard(
    organizationId: string,
    userId: string,
    userProfileId?: string,
  ): Promise<CaseDashboardResponse> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const assignedToUser = {
      organizationId,
      ...activeDocumentFilter,
      status: { $nin: ["completed", "cancelled"] },
      $or: [{ assignees: { $elemMatch: { userId } } }, { assigneeId: userId }],
    };

    const [assignedCases, upcomingInterventions, completedThisWeek] = await Promise.all([
      this.caseModel.find(assignedToUser).sort({ priority: -1, dueDate: 1 }).exec(),
      this.interventionModel
        .find({
          organizationId,
          ...activeDocumentFilter,
          $or: [{ assigneeId: userId }, { assigneeId: { $exists: false } }],
          scheduledStart: { $gte: now },
          status: { $ne: "cancelled" },
        })
        .sort({ scheduledStart: 1 })
        .limit(20)
        .exec(),
      this.caseModel.countDocuments({
        organizationId,
        ...activeDocumentFilter,
        status: "completed",
        updatedAt: { $gte: startOfWeek },
        $or: [{ assignees: { $elemMatch: { userId } } }, { assigneeId: userId }],
      }),
    ]);

    const overdueCases = assignedCases.filter(
      (c) => c.dueDate && c.dueDate < now && c.status !== "completed" && c.status !== "cancelled",
    );

    const caseIds = [...new Set(upcomingInterventions.map((i) => i.caseId))];
    const cases = await this.caseModel
      .find({ _id: { $in: caseIds }, ...activeDocumentFilter })
      .select("_id title")
      .exec();
    const caseMap = new Map(cases.map((c) => [c._id.toString(), c.title]));

    const todoWidgets = await this.computeTodoWidgets(organizationId, userId, userProfileId);

    return {
      assignedCases: assignedCases.map((c) => this.toCaseSummary(c)),
      upcomingInterventions: upcomingInterventions.map((i) =>
        this.toInterventionResponse(i, caseMap.get(i.caseId)),
      ),
      overdueCases: overdueCases.map((c) => this.toCaseSummary(c)),
      todoWidgets,
      stats: {
        totalAssigned: assignedCases.length,
        inProgress: assignedCases.filter((c) => c.status === "in_progress").length,
        completedThisWeek,
        overdue: overdueCases.length,
      },
    };
  }

  // ── Upcoming interventions (cross-org, for reminder scheduler) ──

  async listUpcomingInterventions(from: string, to: string): Promise<InterventionResponse[]> {
    const docs = await this.interventionModel
      .find({
        ...activeDocumentFilter,
        status: "planned",
        assigneeId: { $ne: null, $exists: true },
        scheduledStart: { $gte: new Date(from), $lte: new Date(to) },
      })
      .sort({ scheduledStart: 1 })
      .limit(500)
      .exec();

    const caseIds = [...new Set(docs.map((d) => d.caseId))];
    const cases = await this.caseModel
      .find({ _id: { $in: caseIds }, ...activeDocumentFilter })
      .select("_id title")
      .exec();
    const caseMap = new Map(cases.map((c) => [c._id.toString(), c.title]));

    return docs.map((d) => this.toInterventionResponse(d, caseMap.get(d.caseId)));
  }

  // ── History ──

  async addCaseHistory(body: CreateCaseHistoryBody): Promise<CaseHistoryEntryResponse> {
    const doc = await this.caseHistoryModel.create({
      organizationId: body.organizationId,
      caseId: body.caseId,
      actorId: body.actorId,
      actorName: body.actorName,
      action: body.action,
      details: body.details,
      changes: body.changes ?? [],
    });
    return this.toHistoryResponse(doc);
  }

  async listCaseHistory(
    caseId: string,
    organizationId: string,
  ): Promise<CaseHistoryEntryResponse[]> {
    const docs = await this.caseHistoryModel
      .find({ caseId, organizationId })
      .sort({ createdAt: -1 })
      .limit(200)
      .exec();
    return docs.map((d) => this.toHistoryResponse(d));
  }

  // ── Quotes ──

  async createQuote(body: CreateQuoteBody): Promise<QuoteResponse> {
    const caseDoc = await this.caseModel
      .findOne({ _id: body.caseId, organizationId: body.organizationId, ...activeDocumentFilter })
      .exec();
    if (!caseDoc) throw new NotFoundException("Case not found");

    const quoteNumber = await this.generateQuoteNumber(body.organizationId);

    const doc = await this.quoteModel.create({
      organizationId: body.organizationId,
      caseId: body.caseId,
      quoteNumber,
      subject: body.subject,
      notes: body.notes,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
      lines: (body.lines ?? []).map((l) => ({
        articleId: l.articleId,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        tvaRate: l.tvaRate,
        unit: l.unit,
      })),
      status: "draft",
      isTestData: body.isTestData === true,
    });

    return this.toQuoteResponse(doc, caseDoc.title);
  }

  async listQuotes(
    organizationId: string,
    filters?: { caseId?: string; status?: string },
  ): Promise<QuoteSummaryResponse[]> {
    const query: Record<string, unknown> = { organizationId, ...activeDocumentFilter };
    if (filters?.caseId) query.caseId = filters.caseId;
    if (filters?.status) query.status = filters.status;

    const docs = await this.quoteModel.find(query).sort({ createdAt: -1 }).exec();

    const caseIds = [...new Set(docs.map((d) => d.caseId))];
    const cases = await this.caseModel
      .find({ _id: { $in: caseIds }, ...activeDocumentFilter })
      .select("_id title")
      .exec();
    const caseMap = new Map(cases.map((c) => [c._id.toString(), c.title]));

    return docs.map((d) => this.toQuoteSummary(d, caseMap.get(d.caseId)));
  }

  async getQuote(id: string, organizationId: string): Promise<QuoteResponse> {
    const doc = await this.quoteModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Quote not found");
    const caseDoc = await this.caseModel
      .findOne({ _id: doc.caseId, ...activeDocumentFilter })
      .select("title")
      .exec();
    return this.toQuoteResponse(doc, caseDoc?.title);
  }

  async updateQuote(id: string, body: UpdateQuoteBody): Promise<QuoteResponse> {
    const update: Record<string, unknown> = {};
    if (body.subject !== undefined) update.subject = body.subject;
    if (body.notes !== undefined) update.notes = body.notes;
    if (body.status !== undefined) update.status = body.status;
    if (body.validUntil !== undefined) {
      update.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    }
    if (body.lines !== undefined) {
      update.lines = body.lines.map((l) => ({
        articleId: l.articleId,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        tvaRate: l.tvaRate,
        unit: l.unit,
      }));
    }

    const doc = await this.quoteModel
      .findOneAndUpdate(
        { _id: id, organizationId: body.organizationId, ...activeDocumentFilter },
        { $set: update },
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException("Quote not found");
    const caseDoc = await this.caseModel
      .findOne({ _id: doc.caseId, ...activeDocumentFilter })
      .select("title")
      .exec();
    return this.toQuoteResponse(doc, caseDoc?.title);
  }

  async deleteQuote(id: string, organizationId: string): Promise<{ deleted: true }> {
    const result = await this.quoteModel
      .updateOne(
        { _id: id, organizationId, ...activeDocumentFilter },
        { $set: { deletedAt: new Date() } },
      )
      .exec();
    if (!result.matchedCount) throw new NotFoundException("Quote not found");
    return { deleted: true };
  }

  private async generateQuoteNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.quoteModel.countDocuments({
      organizationId,
      quoteNumber: { $regex: `^DEV-${year}-` },
    });
    const seq = String(count + 1).padStart(4, "0");
    return `DEV-${year}-${seq}`;
  }

  private computeLineTotals(line: QuoteLineSubDoc): { totalHt: number; totalTtc: number } {
    const totalHt = Math.round(line.quantity * line.unitPrice * 100) / 100;
    const totalTtc = Math.round(totalHt * (1 + line.tvaRate / 100) * 100) / 100;
    return { totalHt, totalTtc };
  }

  private toQuoteResponse(doc: QuoteDocument, caseTitle?: string): QuoteResponse {
    const lines = (doc.lines ?? []).map((l) => {
      const { totalHt, totalTtc } = this.computeLineTotals(l);
      return {
        id: l.id,
        articleId: l.articleId,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        tvaRate: l.tvaRate,
        unit: l.unit,
        totalHt,
        totalTtc,
      };
    });

    const totalHt = Math.round(lines.reduce((s, l) => s + l.totalHt, 0) * 100) / 100;
    const totalTtc = Math.round(lines.reduce((s, l) => s + l.totalTtc, 0) * 100) / 100;
    const totalTva = Math.round((totalTtc - totalHt) * 100) / 100;

    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      caseId: doc.caseId,
      caseTitle,
      quoteNumber: doc.quoteNumber,
      subject: doc.subject,
      notes: doc.notes,
      status: doc.status,
      validUntil: doc.validUntil?.toISOString(),
      lines,
      totalHt,
      totalTva,
      totalTtc,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString(),
      isTestData: doc.isTestData === true,
    };
  }

  private toQuoteSummary(doc: QuoteDocument, caseTitle?: string): QuoteSummaryResponse {
    const lines = (doc.lines ?? []).map((l) => this.computeLineTotals(l));
    const totalHt = Math.round(lines.reduce((s, l) => s + l.totalHt, 0) * 100) / 100;
    const totalTtc = Math.round(lines.reduce((s, l) => s + l.totalTtc, 0) * 100) / 100;

    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      caseId: doc.caseId,
      caseTitle,
      quoteNumber: doc.quoteNumber,
      subject: doc.subject,
      status: doc.status,
      totalHt,
      totalTtc,
      validUntil: doc.validUntil?.toISOString(),
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString(),
      isTestData: doc.isTestData === true,
    };
  }

  // ── Helpers ──

  private toDashboardCaseListItem(doc: CaseDocument): DashboardTodoCaseItem {
    return {
      caseId: doc._id.toString(),
      caseTitle: doc.title,
      customerId: doc.customerId,
      customerName: undefined,
      status: doc.status,
      priority: doc.priority,
      createdAt: doc.get("createdAt")?.toISOString(),
      dueDate: doc.dueDate?.toISOString(),
    };
  }

  private isTodoVisibleToUser(
    rule: {
      showOnDashboard: boolean;
      visibility?: string;
      profileIds?: string[];
      userIds?: string[];
    },
    userId: string,
    userProfileId?: string,
  ): boolean {
    if (!rule.showOnDashboard) return false;

    switch (rule.visibility) {
      case "all":
        return true;
      case "by_profile":
        return !!(userProfileId && rule.profileIds?.includes(userProfileId));
      case "by_user":
        return !!(rule.userIds && rule.userIds.includes(userId));
      default:
        return true;
    }
  }

  private async computeTodoWidgets(
    organizationId: string,
    userId: string,
    userProfileId?: string,
  ): Promise<DashboardTodoItem[]> {
    const templates = await this.templateModel
      .find({ organizationId, ...activeDocumentFilter })
      .exec();

    const todoConfigs: {
      templateId: string;
      templateName: string;
      stepName: string;
      todoLabel: string;
    }[] = [];

    for (const template of templates) {
      for (const step of template.steps) {
        for (const todo of step.todos) {
          if (
            todo.dashboardRule?.showOnDashboard &&
            this.isTodoVisibleToUser(todo.dashboardRule, userId, userProfileId)
          ) {
            todoConfigs.push({
              templateId: template._id.toString(),
              templateName: template.name,
              stepName: step.name,
              todoLabel: todo.label,
            });
          }
        }
      }
    }

    if (todoConfigs.length === 0) return [];

    const templateIds = [...new Set(todoConfigs.map((c) => c.templateId))];
    const activeCases = await this.caseModel
      .find({
        organizationId,
        templateId: { $in: templateIds },
        ...activeDocumentFilter,
        status: { $nin: ["completed", "cancelled"] },
      })
      .exec();

    const results: DashboardTodoItem[] = [];
    for (const config of todoConfigs) {
      const matching = activeCases.filter(
        (c) =>
          c.templateId === config.templateId &&
          c.steps.some((s) =>
            s.todos.some((t) => t.label === config.todoLabel && t.status === "pending"),
          ),
      );
      if (matching.length > 0) {
        results.push({
          todoLabel: config.todoLabel,
          stepName: config.stepName,
          templateId: config.templateId,
          templateName: config.templateName,
          count: matching.length,
        });
      }
    }

    return results;
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

  private computeProgress(doc: CaseDocument): number {
    const allTodos = doc.steps.flatMap((s) => s.todos);
    if (allTodos.length === 0) return 0;
    const done = allTodos.filter((t) => t.status === "done" || t.status === "skipped").length;
    return Math.round((done / allTodos.length) * 100);
  }

  private getNextTodo(doc: CaseDocument): string | undefined {
    for (const step of [...doc.steps].sort((a, b) => a.order - b.order)) {
      for (const todo of step.todos) {
        if (todo.status === "pending") return todo.label;
      }
    }
    return undefined;
  }

  private toTemplateResponse(doc: CaseTemplateDocument): CaseTemplateResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      name: doc.name,
      description: doc.description,
      steps: (doc.steps ?? []).map((s) => ({
        name: s.name,
        description: s.description,
        order: s.order,
        todos: (s.todos ?? []).map((t) => ({
          label: t.label,
          description: t.description,
          dashboardRule: t.dashboardRule
            ? {
                showOnDashboard: t.dashboardRule.showOnDashboard,
                visibility: t.dashboardRule.visibility,
                profileIds: t.dashboardRule.profileIds,
                userIds: t.dashboardRule.userIds,
              }
            : undefined,
        })),
      })),
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString(),
      isTestData: doc.isTestData === true,
    };
  }

  private resolveAssignees(doc: CaseDocument): CaseAssignee[] {
    const list = doc.assignees ?? [];
    if (list.length > 0) {
      return list.map((a) => ({ userId: a.userId, name: a.name }));
    }
    if (doc.assigneeId) {
      return [
        {
          userId: doc.assigneeId,
          name: doc.assigneeName?.trim() || doc.assigneeId,
        },
      ];
    }
    return [];
  }

  private toCaseResponse(doc: CaseDocument): CaseResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      templateId: doc.templateId,
      customerId: doc.customerId,
      interventionSiteId: doc.interventionSiteId,
      title: doc.title,
      description: doc.description,
      status: doc.status,
      billingStatus: doc.billingStatus ?? "none",
      priority: doc.priority,
      assignees: this.resolveAssignees(doc),
      dueDate: doc.dueDate?.toISOString(),
      tags: doc.tags ?? [],
      steps: (doc.steps ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        order: s.order,
        todos: (s.todos ?? []).map((t) => ({
          id: t.id,
          label: t.label,
          description: t.description,
          status: t.status,
          completedAt: t.completedAt?.toISOString(),
          completedBy: t.completedBy,
        })),
      })),
      progress: this.computeProgress(doc),
      interventionCount: doc.interventionCount ?? 0,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString(),
      isTestData: doc.isTestData === true,
    };
  }

  private toCaseSummary(doc: CaseDocument): CaseSummaryResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      customerId: doc.customerId,
      interventionSiteId: doc.interventionSiteId,
      title: doc.title,
      status: doc.status,
      billingStatus: doc.billingStatus ?? "none",
      priority: doc.priority,
      assignees: this.resolveAssignees(doc),
      dueDate: doc.dueDate?.toISOString(),
      tags: doc.tags ?? [],
      progress: this.computeProgress(doc),
      interventionCount: doc.interventionCount ?? 0,
      nextTodo: this.getNextTodo(doc),
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString(),
      isTestData: doc.isTestData === true,
    };
  }

  // ── Comments ──

  async createComment(body: CreateCommentBody): Promise<CommentResponse> {
    const trimmed = body.body?.trim() ?? "";
    if (!trimmed) throw new BadRequestException("Comment body is required");
    if (trimmed.length > MAX_COMMENT_BODY_LENGTH) {
      throw new BadRequestException(
        `Comment body must be at most ${MAX_COMMENT_BODY_LENGTH} characters`,
      );
    }
    if (body.entityType !== "case" && body.entityType !== "intervention") {
      throw new BadRequestException("entityType must be case or intervention");
    }

    const caseId = await this.resolveCommentCaseId(
      body.organizationId,
      body.entityType,
      body.entityId,
    );

    const doc = await this.commentModel.create({
      organizationId: body.organizationId,
      entityType: body.entityType,
      entityId: body.entityId,
      caseId,
      body: trimmed,
      authorId: body.authorId,
      authorName: body.authorName,
    });
    return this.toCommentResponse(doc);
  }

  async listComments(
    organizationId: string,
    entityType: CommentEntityType,
    entityId: string,
  ): Promise<CommentResponse[]> {
    if (entityType !== "case" && entityType !== "intervention") {
      throw new BadRequestException("entityType must be case or intervention");
    }
    const docs = await this.commentModel
      .find({
        organizationId,
        entityType,
        entityId,
        ...activeDocumentFilter,
      })
      .sort({ createdAt: 1 })
      .limit(500)
      .exec();
    return docs.map((d) => this.toCommentResponse(d));
  }

  async getComment(id: string, organizationId: string): Promise<CommentResponse> {
    const doc = await this.commentModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Comment not found");
    return this.toCommentResponse(doc);
  }

  async updateComment(id: string, body: UpdateCommentBody): Promise<CommentResponse> {
    const trimmed = body.body?.trim() ?? "";
    if (!trimmed) throw new BadRequestException("Comment body is required");
    if (trimmed.length > MAX_COMMENT_BODY_LENGTH) {
      throw new BadRequestException(
        `Comment body must be at most ${MAX_COMMENT_BODY_LENGTH} characters`,
      );
    }
    const doc = await this.commentModel
      .findOneAndUpdate(
        { _id: id, organizationId: body.organizationId, ...activeDocumentFilter },
        { $set: { body: trimmed } },
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException("Comment not found");
    return this.toCommentResponse(doc);
  }

  async deleteComment(id: string, organizationId: string): Promise<{ deleted: true }> {
    const result = await this.commentModel
      .updateOne(
        { _id: id, organizationId, ...activeDocumentFilter },
        { $set: { deletedAt: new Date() } },
      )
      .exec();
    if (!result.matchedCount) throw new NotFoundException("Comment not found");
    return { deleted: true };
  }

  private async resolveCommentCaseId(
    organizationId: string,
    entityType: CommentEntityType,
    entityId: string,
  ): Promise<string> {
    if (entityType === "case") {
      const caseDoc = await this.caseModel
        .findOne({ _id: entityId, organizationId, ...activeDocumentFilter })
        .select("_id")
        .exec();
      if (!caseDoc) throw new NotFoundException("Case not found");
      return caseDoc._id.toString();
    }
    const intervention = await this.interventionModel
      .findOne({ _id: entityId, organizationId, ...activeDocumentFilter })
      .select("caseId")
      .exec();
    if (!intervention) throw new NotFoundException("Intervention not found");
    return intervention.caseId;
  }

  private toCommentResponse(doc: CommentDocument): CommentResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      entityType: doc.entityType,
      entityId: doc.entityId,
      caseId: doc.caseId,
      body: doc.body,
      authorId: doc.authorId,
      authorName: doc.authorName,
      createdAt: doc.get("createdAt")?.toISOString() ?? new Date().toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString(),
    };
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
    return { purged: true };
  }

  private toInterventionResponse(
    doc: InterventionDocument,
    caseTitle?: string,
  ): InterventionResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      caseId: doc.caseId,
      caseTitle,
      title: doc.title,
      description: doc.description,
      status: doc.status,
      billingStatus: doc.billingStatus ?? "none",
      assigneeId: doc.assigneeId,
      assigneeName: doc.assigneeName,
      assignedTeamId: doc.assignedTeamId,
      assignedTeamName: doc.assignedTeamName,
      scheduledStart: doc.scheduledStart?.toISOString(),
      scheduledEnd: doc.scheduledEnd?.toISOString(),
      startedAt: doc.startedAt?.toISOString(),
      completedAt: doc.completedAt?.toISOString(),
      startLocation: doc.startLocation,
      endLocation: doc.endLocation,
      notes: doc.notes,
      signatoryName: doc.signatoryName,
      signedAt: doc.signedAt?.toISOString(),
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString(),
      isTestData: doc.isTestData === true,
    };
  }

  private toHistoryResponse(doc: CaseHistoryDocument): CaseHistoryEntryResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      caseId: doc.caseId,
      actorId: doc.actorId,
      actorName: doc.actorName,
      action: doc.action,
      details: doc.details,
      changes: (doc.changes ?? []).map((c) => ({
        field: c.field,
        oldValue: c.oldValue,
        newValue: c.newValue,
      })),
      createdAt: doc.get("createdAt")?.toISOString(),
    };
  }

  private isDuplicateKeyError(err: unknown): boolean {
    return (err as { code?: number })?.code === 11000;
  }
}
