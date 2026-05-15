import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  activeDocumentFilter,
  type CaseAssignee,
  type CaseResponse,
  type CaseSummaryResponse,
  type CreateCaseBody,
  type CreateCaseTemplateBody,
  type CreateInterventionBody,
  type CaseDashboardResponse,
  type CaseTemplateResponse,
  type InterventionResponse,
  type UpdateCaseBody,
  type UpdateCaseTemplateBody,
  type UpdateInterventionBody,
  type UpdateTodoBody,
} from "@syncora/shared";
import type { CaseTemplateDocument } from "../persistence/case-template.schema";
import type { CaseDocument } from "../persistence/case.schema";
import type { InterventionDocument } from "../persistence/intervention.schema";
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
          todos: s.todos ?? [],
        })),
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
        todos: s.todos ?? [],
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
      title: body.title,
      description: body.description,
      priority: body.priority ?? "medium",
      assignees: body.assignees ?? [],
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      tags: body.tags ?? [],
      steps,
      status: "draft",
    });

    return this.toCaseResponse(doc);
  }

  async listCases(
    organizationId: string,
    filters?: {
      status?: string;
      assigneeId?: string;
      priority?: string;
      search?: string;
    },
  ): Promise<CaseSummaryResponse[]> {
    const query: Record<string, unknown> = { organizationId, ...activeDocumentFilter };
    if (filters?.status) query.status = filters.status;
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
    if (body.priority !== undefined) setUpdate.priority = body.priority;
    if (body.assignees !== undefined) setUpdate.assignees = body.assignees;
    if (body.dueDate !== undefined)
      setUpdate.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.tags !== undefined) setUpdate.tags = body.tags;
    if (body.customerId !== undefined) {
      setUpdate.customerId = body.customerId === null ? null : body.customerId.trim() || undefined;
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
      startDate?: string;
      endDate?: string;
      status?: string;
      unscheduled?: boolean;
    },
  ): Promise<InterventionResponse[]> {
    const query: Record<string, unknown> = { organizationId, ...activeDocumentFilter };
    if (filters?.caseId) query.caseId = filters.caseId;
    if (filters?.assigneeId) query.assigneeId = filters.assigneeId;
    if (filters?.assignedTeamId) query.assignedTeamId = filters.assignedTeamId;
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
    await this.caseModel.updateOne(
      { _id: doc.caseId, ...activeDocumentFilter },
      { $inc: { interventionCount: -1 } },
    );
    return { deleted: true };
  }

  // ── Dashboard ──

  async getDashboard(organizationId: string, userId: string): Promise<CaseDashboardResponse> {
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

    return {
      assignedCases: assignedCases.map((c) => this.toCaseSummary(c)),
      upcomingInterventions: upcomingInterventions.map((i) =>
        this.toInterventionResponse(i, caseMap.get(i.caseId)),
      ),
      overdueCases: overdueCases.map((c) => this.toCaseSummary(c)),
      stats: {
        totalAssigned: assignedCases.length,
        inProgress: assignedCases.filter((c) => c.status === "in_progress").length,
        completedThisWeek,
        overdue: overdueCases.length,
      },
    };
  }

  // ── Helpers ──

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
        })),
      })),
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString(),
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
      title: doc.title,
      description: doc.description,
      status: doc.status,
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
    };
  }

  private toCaseSummary(doc: CaseDocument): CaseSummaryResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      customerId: doc.customerId,
      title: doc.title,
      status: doc.status,
      priority: doc.priority,
      assignees: this.resolveAssignees(doc),
      dueDate: doc.dueDate?.toISOString(),
      tags: doc.tags ?? [],
      progress: this.computeProgress(doc),
      interventionCount: doc.interventionCount ?? 0,
      nextTodo: this.getNextTodo(doc),
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString(),
    };
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
      assigneeId: doc.assigneeId,
      assigneeName: doc.assigneeName,
      assignedTeamId: doc.assignedTeamId,
      assignedTeamName: doc.assignedTeamName,
      scheduledStart: doc.scheduledStart?.toISOString(),
      scheduledEnd: doc.scheduledEnd?.toISOString(),
      notes: doc.notes,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString(),
    };
  }

  private isDuplicateKeyError(err: unknown): boolean {
    return (err as { code?: number })?.code === 11000;
  }
}
