import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import type {
  AddInterventionArticleUsageBody,
  ArticleResponse,
  CreateCaseBody,
  CreateArticleBody,
  CreateArticleMovementBody,
  CreateCaseTemplateBody,
  CreateInterventionBody,
  CaseDashboardResponse,
  CaseResponse,
  CaseSummaryResponse,
  CaseTemplateResponse,
  InterventionResponse,
  StockMovementType,
  StockMovementResponse,
  StockStatus,
  UpdateCaseBody,
  UpdateArticleBody,
  UpdateCaseTemplateBody,
  UpdateInterventionBody,
  UpdateTodoBody
} from "@syncora/shared";
import type { ArticleDocument } from "../persistence/article.schema";
import type { CaseTemplateDocument } from "../persistence/case-template.schema";
import type { CaseDocument } from "../persistence/case.schema";
import type { InterventionDocument } from "../persistence/intervention.schema";
import type { StockMovementDocument } from "../persistence/stock-movement.schema";

@Injectable()
export class CasesService {
  constructor(
    @InjectModel("CaseTemplate")
    private readonly templateModel: Model<CaseTemplateDocument>,
    @InjectModel("Case")
    private readonly caseModel: Model<CaseDocument>,
    @InjectModel("Intervention")
    private readonly interventionModel: Model<InterventionDocument>,
    @InjectModel("Article")
    private readonly articleModel: Model<ArticleDocument>,
    @InjectModel("StockMovement")
    private readonly stockMovementModel: Model<StockMovementDocument>
  ) {}

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
          todos: s.todos ?? []
        }))
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
      .find({ organizationId })
      .sort({ createdAt: 1 })
      .exec();
    return docs.map((d) => this.toTemplateResponse(d));
  }

  async getTemplate(id: string, organizationId: string): Promise<CaseTemplateResponse> {
    const doc = await this.templateModel.findOne({ _id: id, organizationId }).exec();
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
        todos: s.todos ?? []
      }));
    }
    try {
      const doc = await this.templateModel
        .findOneAndUpdate(
          { _id: id, organizationId: body.organizationId },
          { $set: update },
          { new: true }
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
    const result = await this.templateModel.deleteOne({ _id: id, organizationId }).exec();
    if (!result.deletedCount) throw new NotFoundException("Template not found");
    return { deleted: true };
  }

  // ── Cases ──

  async createCase(body: CreateCaseBody): Promise<CaseResponse> {
    let steps: CaseDocument["steps"] = [];

    if (body.templateId) {
      const template = await this.templateModel
        .findOne({ _id: body.templateId, organizationId: body.organizationId })
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
          status: "pending" as const
        }))
      }));
    }

    const doc = await this.caseModel.create({
      organizationId: body.organizationId,
      templateId: body.templateId,
      title: body.title,
      description: body.description,
      priority: body.priority ?? "medium",
      assigneeId: body.assigneeId,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      tags: body.tags ?? [],
      steps,
      status: "draft"
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
    }
  ): Promise<CaseSummaryResponse[]> {
    const query: Record<string, unknown> = { organizationId };
    if (filters?.status) query.status = filters.status;
    if (filters?.assigneeId) query.assigneeId = filters.assigneeId;
    if (filters?.priority) query.priority = filters.priority;
    if (filters?.search) {
      query.title = { $regex: filters.search, $options: "i" };
    }

    const docs = await this.caseModel
      .find(query)
      .sort({ updatedAt: -1 })
      .exec();

    return docs.map((d) => this.toCaseSummary(d));
  }

  async getCase(id: string, organizationId: string): Promise<CaseResponse> {
    const doc = await this.caseModel.findOne({ _id: id, organizationId }).exec();
    if (!doc) throw new NotFoundException("Case not found");
    return this.toCaseResponse(doc);
  }

  async updateCase(id: string, body: UpdateCaseBody): Promise<CaseResponse> {
    const update: Record<string, unknown> = {};
    if (body.title !== undefined) update.title = body.title;
    if (body.description !== undefined) update.description = body.description;
    if (body.status !== undefined) update.status = body.status;
    if (body.priority !== undefined) update.priority = body.priority;
    if (body.assigneeId !== undefined) update.assigneeId = body.assigneeId;
    if (body.dueDate !== undefined) update.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.tags !== undefined) update.tags = body.tags;

    const doc = await this.caseModel
      .findOneAndUpdate(
        { _id: id, organizationId: body.organizationId },
        { $set: update },
        { new: true }
      )
      .exec();
    if (!doc) throw new NotFoundException("Case not found");
    return this.toCaseResponse(doc);
  }

  async deleteCase(id: string, organizationId: string): Promise<{ deleted: true }> {
    const result = await this.caseModel.deleteOne({ _id: id, organizationId }).exec();
    if (!result.deletedCount) throw new NotFoundException("Case not found");
    await this.interventionModel.deleteMany({ caseId: id, organizationId }).exec();
    return { deleted: true };
  }

  async updateTodo(caseId: string, body: UpdateTodoBody): Promise<CaseResponse> {
    const doc = await this.caseModel
      .findOne({ _id: caseId, organizationId: body.organizationId })
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
      .findOne({ _id: body.caseId, organizationId: body.organizationId })
      .exec();
    if (!caseDoc) throw new NotFoundException("Case not found");

    const doc = await this.interventionModel.create({
      organizationId: body.organizationId,
      caseId: body.caseId,
      title: body.title,
      description: body.description,
      assigneeId: body.assigneeId,
      scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : undefined,
      scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : undefined,
      status: "planned"
    });

    await this.caseModel.updateOne(
      { _id: body.caseId },
      { $inc: { interventionCount: 1 } }
    );

    return this.toInterventionResponse(doc, caseDoc.title);
  }

  async listInterventions(
    organizationId: string,
    filters?: {
      caseId?: string;
      assigneeId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    }
  ): Promise<InterventionResponse[]> {
    const query: Record<string, unknown> = { organizationId };
    if (filters?.caseId) query.caseId = filters.caseId;
    if (filters?.assigneeId) query.assigneeId = filters.assigneeId;
    if (filters?.status) query.status = filters.status;
    if (filters?.startDate || filters?.endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (filters?.startDate) dateFilter.$gte = new Date(filters.startDate);
      if (filters?.endDate) dateFilter.$lte = new Date(filters.endDate);
      query.scheduledStart = dateFilter;
    }

    const docs = await this.interventionModel
      .find(query)
      .sort({ scheduledStart: 1 })
      .exec();

    const caseIds = [...new Set(docs.map((d) => d.caseId))];
    const cases = await this.caseModel
      .find({ _id: { $in: caseIds } })
      .select("_id title")
      .exec();
    const caseMap = new Map(cases.map((c) => [c._id.toString(), c.title]));

    return docs.map((d) =>
      this.toInterventionResponse(d, caseMap.get(d.caseId))
    );
  }

  async getIntervention(id: string, organizationId: string): Promise<InterventionResponse> {
    const doc = await this.interventionModel.findOne({ _id: id, organizationId }).exec();
    if (!doc) throw new NotFoundException("Intervention not found");
    const caseDoc = await this.caseModel.findById(doc.caseId).select("title").exec();
    return this.toInterventionResponse(doc, caseDoc?.title);
  }

  async updateIntervention(id: string, body: UpdateInterventionBody): Promise<InterventionResponse> {
    const update: Record<string, unknown> = {};
    if (body.title !== undefined) update.title = body.title;
    if (body.description !== undefined) update.description = body.description;
    if (body.status !== undefined) update.status = body.status;
    if (body.assigneeId !== undefined) update.assigneeId = body.assigneeId;
    if (body.scheduledStart !== undefined) {
      update.scheduledStart = body.scheduledStart ? new Date(body.scheduledStart) : null;
    }
    if (body.scheduledEnd !== undefined) {
      update.scheduledEnd = body.scheduledEnd ? new Date(body.scheduledEnd) : null;
    }
    if (body.notes !== undefined) update.notes = body.notes;

    const doc = await this.interventionModel
      .findOneAndUpdate(
        { _id: id, organizationId: body.organizationId },
        { $set: update },
        { new: true }
      )
      .exec();
    if (!doc) throw new NotFoundException("Intervention not found");
    const caseDoc = await this.caseModel.findById(doc.caseId).select("title").exec();
    return this.toInterventionResponse(doc, caseDoc?.title);
  }

  async deleteIntervention(id: string, organizationId: string): Promise<{ deleted: true }> {
    const doc = await this.interventionModel.findOne({ _id: id, organizationId }).exec();
    if (!doc) throw new NotFoundException("Intervention not found");
    const hasStockMovements = (doc.usedArticles ?? []).some(
      (item) => item.consumedQuantity > 0 || item.returnedQuantity > 0
    );
    if (hasStockMovements) {
      throw new ConflictException(
        "Cannot delete an intervention with stock movements. Cancel it instead to keep inventory traceability."
      );
    }
    await doc.deleteOne();
    await this.caseModel.updateOne(
      { _id: doc.caseId },
      { $inc: { interventionCount: -1 } }
    );
    return { deleted: true };
  }

  async addInterventionArticleUsage(
    interventionId: string,
    body: AddInterventionArticleUsageBody
  ): Promise<InterventionResponse> {
    const intervention = await this.interventionModel
      .findOne({ _id: interventionId, organizationId: body.organizationId })
      .exec();
    if (!intervention) throw new NotFoundException("Intervention not found");

    const movementType = body.movementType ?? "out";
    const quantity = this.ensureStrictlyPositiveNumber(body.quantity, "quantity");
    const currentEntry = intervention.usedArticles.find((item) => item.articleId === body.articleId);

    if (movementType === "in") {
      if (!currentEntry) {
        throw new BadRequestException(
          "Cannot return an article that has not been consumed on this intervention"
        );
      }
      if (currentEntry.returnedQuantity + quantity > currentEntry.consumedQuantity) {
        throw new BadRequestException(
          "Returned quantity cannot exceed already consumed quantity for this intervention"
        );
      }
    }

    const now = new Date();
    const movementResult = await this.applyStockMovement({
      organizationId: body.organizationId,
      articleId: body.articleId,
      movementType,
      quantity,
      note: body.note,
      reason: "intervention_usage",
      interventionId: intervention._id.toString(),
      caseId: intervention.caseId,
      actorUserId: body.actorUserId,
      actorUserName: body.actorUserName,
      at: now
    });

    const existingUsedArticle = intervention.usedArticles.find(
      (item) => item.articleId === movementResult.article.id
    );
    if (!existingUsedArticle) {
      intervention.usedArticles.push({
        articleId: movementResult.article.id,
        articleName: movementResult.article.name,
        articleReference: movementResult.article.reference,
        unit: movementResult.article.unit,
        consumedQuantity: movementType === "out" ? quantity : 0,
        returnedQuantity: movementType === "in" ? quantity : 0,
        lastMovementAt: now
      });
    } else {
      if (movementType === "out") {
        existingUsedArticle.consumedQuantity += quantity;
      } else {
        existingUsedArticle.returnedQuantity += quantity;
      }
      existingUsedArticle.articleName = movementResult.article.name;
      existingUsedArticle.articleReference = movementResult.article.reference;
      existingUsedArticle.unit = movementResult.article.unit;
      existingUsedArticle.lastMovementAt = now;
    }

    await intervention.save();
    const caseDoc = await this.caseModel.findById(intervention.caseId).select("title").exec();
    return this.toInterventionResponse(intervention, caseDoc?.title);
  }

  // ── Articles / stock ──

  async createArticle(body: CreateArticleBody): Promise<ArticleResponse> {
    const name = body.name?.trim();
    if (!name) throw new BadRequestException("Article name is required");
    const reference = this.normalizeArticleReference(body.reference);
    if (!reference) throw new BadRequestException("Article reference is required");

    const initialStock = this.ensureNonNegativeNumber(body.initialStock ?? 0, "initialStock");
    const reorderPoint = this.ensureNonNegativeNumber(body.reorderPoint ?? 0, "reorderPoint");
    const targetStock = this.ensureNonNegativeNumber(
      body.targetStock ?? Math.max(initialStock, reorderPoint),
      "targetStock"
    );
    if (targetStock < reorderPoint) {
      throw new BadRequestException("targetStock must be greater than or equal to reorderPoint");
    }

    try {
      const now = new Date();
      const doc = await this.articleModel.create({
        organizationId: body.organizationId,
        name,
        reference,
        description: body.description?.trim() || undefined,
        unit: body.unit?.trim() || "unité",
        stockQuantity: initialStock,
        reorderPoint,
        targetStock,
        isActive: body.isActive ?? true,
        lastMovementAt: initialStock > 0 ? now : undefined
      });

      if (initialStock > 0) {
        await this.stockMovementModel.create({
          organizationId: body.organizationId,
          articleId: doc._id.toString(),
          articleName: doc.name,
          articleReference: doc.reference,
          movementType: "in",
          quantity: initialStock,
          previousStock: 0,
          newStock: initialStock,
          reason: "initial_stock"
        });
      }

      return this.toArticleResponse(doc);
    } catch (err: unknown) {
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException("An article with this reference already exists");
      }
      throw err;
    }
  }

  async listArticles(
    organizationId: string,
    filters?: { search?: string; lowStockOnly?: boolean; activeOnly?: boolean }
  ): Promise<ArticleResponse[]> {
    const query: Record<string, unknown> = { organizationId };
    const activeOnly = filters?.activeOnly ?? true;
    if (activeOnly) query.isActive = true;
    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { reference: { $regex: filters.search, $options: "i" } }
      ];
    }
    if (filters?.lowStockOnly) {
      query.$expr = { $lte: ["$stockQuantity", "$reorderPoint"] };
    }

    const docs = await this.articleModel.find(query).sort({ name: 1 }).exec();
    return docs.map((doc) => this.toArticleResponse(doc));
  }

  async getArticle(id: string, organizationId: string): Promise<ArticleResponse> {
    const doc = await this.articleModel.findOne({ _id: id, organizationId }).exec();
    if (!doc) throw new NotFoundException("Article not found");
    return this.toArticleResponse(doc);
  }

  async updateArticle(id: string, body: UpdateArticleBody): Promise<ArticleResponse> {
    const doc = await this.articleModel.findOne({ _id: id, organizationId: body.organizationId }).exec();
    if (!doc) throw new NotFoundException("Article not found");

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) throw new BadRequestException("Article name cannot be empty");
      doc.name = name;
    }
    if (body.reference !== undefined) {
      const reference = this.normalizeArticleReference(body.reference);
      if (!reference) throw new BadRequestException("Article reference cannot be empty");
      doc.reference = reference;
    }
    if (body.description !== undefined) {
      doc.description = body.description?.trim() || undefined;
    }
    if (body.unit !== undefined) {
      const unit = body.unit.trim();
      if (!unit) throw new BadRequestException("Unit cannot be empty");
      doc.unit = unit;
    }
    if (body.reorderPoint !== undefined) {
      doc.reorderPoint = this.ensureNonNegativeNumber(body.reorderPoint, "reorderPoint");
    }
    if (body.targetStock !== undefined) {
      doc.targetStock = this.ensureNonNegativeNumber(body.targetStock, "targetStock");
    }
    if (body.isActive !== undefined) {
      doc.isActive = body.isActive;
    }
    if (doc.targetStock < doc.reorderPoint) {
      throw new BadRequestException("targetStock must be greater than or equal to reorderPoint");
    }

    try {
      await doc.save();
      return this.toArticleResponse(doc);
    } catch (err: unknown) {
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException("An article with this reference already exists");
      }
      throw err;
    }
  }

  async deleteArticle(id: string, organizationId: string): Promise<{ deleted: true }> {
    const doc = await this.articleModel
      .findOneAndUpdate({ _id: id, organizationId }, { $set: { isActive: false } }, { new: true })
      .exec();
    if (!doc) throw new NotFoundException("Article not found");
    return { deleted: true };
  }

  async createArticleMovement(body: CreateArticleMovementBody): Promise<StockMovementResponse> {
    const movementType = body.movementType;
    if (!["in", "out", "adjustment"].includes(movementType)) {
      throw new BadRequestException("Unsupported movement type");
    }
    const quantity =
      movementType === "adjustment"
        ? this.ensureNonNegativeNumber(body.quantity, "quantity")
        : this.ensureStrictlyPositiveNumber(body.quantity, "quantity");
    const { movement } = await this.applyStockMovement({
      organizationId: body.organizationId,
      articleId: body.articleId,
      movementType,
      quantity,
      note: body.note,
      reason: body.reason || "manual",
      interventionId: body.interventionId,
      caseId: body.caseId,
      actorUserId: body.actorUserId,
      actorUserName: body.actorUserName,
      at: new Date()
    });
    return movement;
  }

  async listArticleMovements(
    organizationId: string,
    filters?: { articleId?: string; interventionId?: string; limit?: number }
  ): Promise<StockMovementResponse[]> {
    const query: Record<string, unknown> = { organizationId };
    if (filters?.articleId) query.articleId = filters.articleId;
    if (filters?.interventionId) query.interventionId = filters.interventionId;
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 200);

    const docs = await this.stockMovementModel.find(query).sort({ createdAt: -1 }).limit(limit).exec();
    return docs.map((doc) => this.toStockMovementResponse(doc));
  }

  // ── Dashboard ──

  async getDashboard(organizationId: string, userId: string): Promise<CaseDashboardResponse> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const [assignedCases, upcomingInterventions, completedThisWeek] = await Promise.all([
      this.caseModel
        .find({
          organizationId,
          assigneeId: userId,
          status: { $nin: ["completed", "cancelled"] }
        })
        .sort({ priority: -1, dueDate: 1 })
        .exec(),
      this.interventionModel
        .find({
          organizationId,
          $or: [{ assigneeId: userId }, { assigneeId: { $exists: false } }],
          scheduledStart: { $gte: now },
          status: { $ne: "cancelled" }
        })
        .sort({ scheduledStart: 1 })
        .limit(20)
        .exec(),
      this.caseModel.countDocuments({
        organizationId,
        assigneeId: userId,
        status: "completed",
        updatedAt: { $gte: startOfWeek }
      })
    ]);

    const overdueCases = assignedCases.filter(
      (c) => c.dueDate && c.dueDate < now && c.status !== "completed" && c.status !== "cancelled"
    );

    const caseIds = [...new Set(upcomingInterventions.map((i) => i.caseId))];
    const cases = await this.caseModel
      .find({ _id: { $in: caseIds } })
      .select("_id title")
      .exec();
    const caseMap = new Map(cases.map((c) => [c._id.toString(), c.title]));

    return {
      assignedCases: assignedCases.map((c) => this.toCaseSummary(c)),
      upcomingInterventions: upcomingInterventions.map((i) =>
        this.toInterventionResponse(i, caseMap.get(i.caseId))
      ),
      overdueCases: overdueCases.map((c) => this.toCaseSummary(c)),
      stats: {
        totalAssigned: assignedCases.length,
        inProgress: assignedCases.filter((c) => c.status === "in_progress").length,
        completedThisWeek,
        overdue: overdueCases.length
      }
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
          description: t.description
        }))
      })),
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString()
    };
  }

  private toCaseResponse(doc: CaseDocument): CaseResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      templateId: doc.templateId,
      title: doc.title,
      description: doc.description,
      status: doc.status,
      priority: doc.priority,
      assigneeId: doc.assigneeId,
      assigneeName: doc.assigneeName,
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
          completedBy: t.completedBy
        }))
      })),
      progress: this.computeProgress(doc),
      interventionCount: doc.interventionCount ?? 0,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString()
    };
  }

  private toCaseSummary(doc: CaseDocument): CaseSummaryResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      title: doc.title,
      status: doc.status,
      priority: doc.priority,
      assigneeId: doc.assigneeId,
      assigneeName: doc.assigneeName,
      dueDate: doc.dueDate?.toISOString(),
      tags: doc.tags ?? [],
      progress: this.computeProgress(doc),
      interventionCount: doc.interventionCount ?? 0,
      nextTodo: this.getNextTodo(doc),
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString()
    };
  }

  private toInterventionResponse(
    doc: InterventionDocument,
    caseTitle?: string
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
      scheduledStart: doc.scheduledStart?.toISOString(),
      scheduledEnd: doc.scheduledEnd?.toISOString(),
      notes: doc.notes,
      usedArticles: (doc.usedArticles ?? []).map((item) => ({
        articleId: item.articleId,
        articleName: item.articleName,
        articleReference: item.articleReference,
        unit: item.unit,
        consumedQuantity: item.consumedQuantity,
        returnedQuantity: item.returnedQuantity,
        netQuantity: Math.max(item.consumedQuantity - item.returnedQuantity, 0),
        lastMovementAt: item.lastMovementAt?.toISOString()
      })),
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString()
    };
  }

  private toArticleResponse(doc: ArticleDocument): ArticleResponse {
    const stockStatus = this.computeStockStatus(doc.stockQuantity, doc.reorderPoint);
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      name: doc.name,
      reference: doc.reference,
      description: doc.description,
      unit: doc.unit,
      stockQuantity: doc.stockQuantity,
      reorderPoint: doc.reorderPoint,
      targetStock: doc.targetStock,
      isActive: doc.isActive,
      lastMovementAt: doc.lastMovementAt?.toISOString(),
      lowStock: stockStatus !== "ok",
      stockStatus,
      suggestedReorderQuantity: Math.max(doc.targetStock - doc.stockQuantity, 0),
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString()
    };
  }

  private toStockMovementResponse(doc: StockMovementDocument): StockMovementResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      articleId: doc.articleId,
      articleName: doc.articleName,
      articleReference: doc.articleReference,
      movementType: doc.movementType,
      quantity: doc.quantity,
      previousStock: doc.previousStock,
      newStock: doc.newStock,
      note: doc.note,
      reason: doc.reason,
      interventionId: doc.interventionId,
      caseId: doc.caseId,
      actorUserId: doc.actorUserId,
      actorUserName: doc.actorUserName,
      createdAt: doc.get("createdAt")?.toISOString()
    };
  }

  private computeStockStatus(stockQuantity: number, reorderPoint: number): StockStatus {
    if (stockQuantity <= 0) return "out";
    if (stockQuantity <= reorderPoint) return "low";
    return "ok";
  }

  private normalizeArticleReference(value: string): string {
    return value.trim().toUpperCase();
  }

  private ensureNonNegativeNumber(value: number, field: string): number {
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(`${field} must be a non-negative number`);
    }
    return value;
  }

  private ensureStrictlyPositiveNumber(value: number, field: string): number {
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException(`${field} must be greater than 0`);
    }
    return value;
  }

  private async applyStockMovement(params: {
    organizationId: string;
    articleId: string;
    movementType: StockMovementType;
    quantity: number;
    note?: string;
    reason?: string;
    interventionId?: string;
    caseId?: string;
    actorUserId?: string;
    actorUserName?: string;
    at: Date;
  }): Promise<{
    movement: StockMovementResponse;
    article: { id: string; name: string; reference?: string; unit: string };
  }> {
    const baseFilter = {
      _id: params.articleId,
      organizationId: params.organizationId,
      isActive: true
    };

    let previousDoc: ArticleDocument | null = null;
    let newStock = 0;
    let movementQuantity = params.quantity;

    if (params.movementType === "out") {
      previousDoc = await this.articleModel
        .findOneAndUpdate(
          {
            ...baseFilter,
            stockQuantity: { $gte: params.quantity }
          },
          {
            $inc: { stockQuantity: -params.quantity },
            $set: { lastMovementAt: params.at }
          },
          { new: false }
        )
        .exec();
      if (!previousDoc) {
        throw new ConflictException("Insufficient stock or unknown/inactive article");
      }
      newStock = previousDoc.stockQuantity - params.quantity;
    } else if (params.movementType === "in") {
      previousDoc = await this.articleModel
        .findOneAndUpdate(
          baseFilter,
          {
            $inc: { stockQuantity: params.quantity },
            $set: { lastMovementAt: params.at }
          },
          { new: false }
        )
        .exec();
      if (!previousDoc) {
        throw new NotFoundException("Article not found");
      }
      newStock = previousDoc.stockQuantity + params.quantity;
    } else {
      previousDoc = await this.articleModel
        .findOneAndUpdate(
          baseFilter,
          {
            $set: { stockQuantity: params.quantity, lastMovementAt: params.at }
          },
          { new: false }
        )
        .exec();
      if (!previousDoc) {
        throw new NotFoundException("Article not found");
      }
      newStock = params.quantity;
      movementQuantity = Math.abs(params.quantity - previousDoc.stockQuantity);
    }

    const movementDoc = await this.stockMovementModel.create({
      organizationId: params.organizationId,
      articleId: previousDoc._id.toString(),
      articleName: previousDoc.name,
      articleReference: previousDoc.reference,
      movementType: params.movementType,
      quantity: movementQuantity,
      previousStock: previousDoc.stockQuantity,
      newStock,
      note: params.note,
      reason: params.reason,
      interventionId: params.interventionId,
      caseId: params.caseId,
      actorUserId: params.actorUserId,
      actorUserName: params.actorUserName
    });

    return {
      movement: this.toStockMovementResponse(movementDoc),
      article: {
        id: previousDoc._id.toString(),
        name: previousDoc.name,
        reference: previousDoc.reference,
        unit: previousDoc.unit
      }
    };
  }

  private isDuplicateKeyError(err: unknown): boolean {
    return (err as { code?: number })?.code === 11000;
  }
}
