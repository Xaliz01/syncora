import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import type {
  CreateDossierBody,
  CreateDossierTemplateBody,
  CreateInterventionBody,
  DashboardResponse,
  DossierResponse,
  DossierSummaryResponse,
  DossierTemplateResponse,
  InterventionResponse,
  UpdateDossierBody,
  UpdateDossierTemplateBody,
  UpdateInterventionBody,
  UpdateTodoBody
} from "@syncora/shared";
import type { DossierTemplateDocument } from "../persistence/dossier-template.schema";
import type { DossierDocument } from "../persistence/dossier.schema";
import type { InterventionDocument } from "../persistence/intervention.schema";

@Injectable()
export class DossiersService {
  constructor(
    @InjectModel("DossierTemplate")
    private readonly templateModel: Model<DossierTemplateDocument>,
    @InjectModel("Dossier")
    private readonly dossierModel: Model<DossierDocument>,
    @InjectModel("Intervention")
    private readonly interventionModel: Model<InterventionDocument>
  ) {}

  // ── Templates ──

  async createTemplate(body: CreateDossierTemplateBody): Promise<DossierTemplateResponse> {
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
        throw new ConflictException("Un modèle avec ce nom existe déjà");
      }
      throw err;
    }
  }

  async listTemplates(organizationId: string): Promise<DossierTemplateResponse[]> {
    const docs = await this.templateModel
      .find({ organizationId })
      .sort({ createdAt: 1 })
      .exec();
    return docs.map((d) => this.toTemplateResponse(d));
  }

  async getTemplate(id: string, organizationId: string): Promise<DossierTemplateResponse> {
    const doc = await this.templateModel.findOne({ _id: id, organizationId }).exec();
    if (!doc) throw new NotFoundException("Modèle non trouvé");
    return this.toTemplateResponse(doc);
  }

  async updateTemplate(id: string, body: UpdateDossierTemplateBody): Promise<DossierTemplateResponse> {
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
      if (!doc) throw new NotFoundException("Modèle non trouvé");
      return this.toTemplateResponse(doc);
    } catch (err: unknown) {
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException("Un modèle avec ce nom existe déjà");
      }
      throw err;
    }
  }

  async deleteTemplate(id: string, organizationId: string): Promise<{ deleted: true }> {
    const result = await this.templateModel.deleteOne({ _id: id, organizationId }).exec();
    if (!result.deletedCount) throw new NotFoundException("Modèle non trouvé");
    return { deleted: true };
  }

  // ── Dossiers ──

  async createDossier(body: CreateDossierBody): Promise<DossierResponse> {
    let steps: DossierDocument["steps"] = [];

    if (body.templateId) {
      const template = await this.templateModel
        .findOne({ _id: body.templateId, organizationId: body.organizationId })
        .exec();
      if (!template) throw new NotFoundException("Modèle de dossier non trouvé");
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

    const doc = await this.dossierModel.create({
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

    return this.toDossierResponse(doc);
  }

  async listDossiers(
    organizationId: string,
    filters?: {
      status?: string;
      assigneeId?: string;
      priority?: string;
      search?: string;
    }
  ): Promise<DossierSummaryResponse[]> {
    const query: Record<string, unknown> = { organizationId };
    if (filters?.status) query.status = filters.status;
    if (filters?.assigneeId) query.assigneeId = filters.assigneeId;
    if (filters?.priority) query.priority = filters.priority;
    if (filters?.search) {
      query.title = { $regex: filters.search, $options: "i" };
    }

    const docs = await this.dossierModel
      .find(query)
      .sort({ updatedAt: -1 })
      .exec();

    return docs.map((d) => this.toDossierSummary(d));
  }

  async getDossier(id: string, organizationId: string): Promise<DossierResponse> {
    const doc = await this.dossierModel.findOne({ _id: id, organizationId }).exec();
    if (!doc) throw new NotFoundException("Dossier non trouvé");
    return this.toDossierResponse(doc);
  }

  async updateDossier(id: string, body: UpdateDossierBody): Promise<DossierResponse> {
    const update: Record<string, unknown> = {};
    if (body.title !== undefined) update.title = body.title;
    if (body.description !== undefined) update.description = body.description;
    if (body.status !== undefined) update.status = body.status;
    if (body.priority !== undefined) update.priority = body.priority;
    if (body.assigneeId !== undefined) update.assigneeId = body.assigneeId;
    if (body.dueDate !== undefined) update.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.tags !== undefined) update.tags = body.tags;

    const doc = await this.dossierModel
      .findOneAndUpdate(
        { _id: id, organizationId: body.organizationId },
        { $set: update },
        { new: true }
      )
      .exec();
    if (!doc) throw new NotFoundException("Dossier non trouvé");
    return this.toDossierResponse(doc);
  }

  async deleteDossier(id: string, organizationId: string): Promise<{ deleted: true }> {
    const result = await this.dossierModel.deleteOne({ _id: id, organizationId }).exec();
    if (!result.deletedCount) throw new NotFoundException("Dossier non trouvé");
    await this.interventionModel.deleteMany({ dossierId: id, organizationId }).exec();
    return { deleted: true };
  }

  async updateTodo(dossierId: string, body: UpdateTodoBody): Promise<DossierResponse> {
    const doc = await this.dossierModel
      .findOne({ _id: dossierId, organizationId: body.organizationId })
      .exec();
    if (!doc) throw new NotFoundException("Dossier non trouvé");

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
    if (!found) throw new NotFoundException("Tâche non trouvée");

    this.autoAdvanceStatus(doc);
    await doc.save();
    return this.toDossierResponse(doc);
  }

  // ── Interventions ──

  async createIntervention(body: CreateInterventionBody): Promise<InterventionResponse> {
    const dossier = await this.dossierModel
      .findOne({ _id: body.dossierId, organizationId: body.organizationId })
      .exec();
    if (!dossier) throw new NotFoundException("Dossier non trouvé");

    const doc = await this.interventionModel.create({
      organizationId: body.organizationId,
      dossierId: body.dossierId,
      title: body.title,
      description: body.description,
      assigneeId: body.assigneeId,
      scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : undefined,
      scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : undefined,
      status: "planned"
    });

    await this.dossierModel.updateOne(
      { _id: body.dossierId },
      { $inc: { interventionCount: 1 } }
    );

    return this.toInterventionResponse(doc, dossier.title);
  }

  async listInterventions(
    organizationId: string,
    filters?: {
      dossierId?: string;
      assigneeId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    }
  ): Promise<InterventionResponse[]> {
    const query: Record<string, unknown> = { organizationId };
    if (filters?.dossierId) query.dossierId = filters.dossierId;
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

    const dossierIds = [...new Set(docs.map((d) => d.dossierId))];
    const dossiers = await this.dossierModel
      .find({ _id: { $in: dossierIds } })
      .select("_id title")
      .exec();
    const dossierMap = new Map(dossiers.map((d) => [d._id.toString(), d.title]));

    return docs.map((d) =>
      this.toInterventionResponse(d, dossierMap.get(d.dossierId))
    );
  }

  async getIntervention(id: string, organizationId: string): Promise<InterventionResponse> {
    const doc = await this.interventionModel.findOne({ _id: id, organizationId }).exec();
    if (!doc) throw new NotFoundException("Intervention non trouvée");
    const dossier = await this.dossierModel.findById(doc.dossierId).select("title").exec();
    return this.toInterventionResponse(doc, dossier?.title);
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
    if (!doc) throw new NotFoundException("Intervention non trouvée");
    const dossier = await this.dossierModel.findById(doc.dossierId).select("title").exec();
    return this.toInterventionResponse(doc, dossier?.title);
  }

  async deleteIntervention(id: string, organizationId: string): Promise<{ deleted: true }> {
    const doc = await this.interventionModel.findOne({ _id: id, organizationId }).exec();
    if (!doc) throw new NotFoundException("Intervention non trouvée");
    await doc.deleteOne();
    await this.dossierModel.updateOne(
      { _id: doc.dossierId },
      { $inc: { interventionCount: -1 } }
    );
    return { deleted: true };
  }

  // ── Dashboard ──

  async getDashboard(organizationId: string, userId: string): Promise<DashboardResponse> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const [assignedDossiers, upcomingInterventions, completedThisWeek] = await Promise.all([
      this.dossierModel
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
      this.dossierModel.countDocuments({
        organizationId,
        assigneeId: userId,
        status: "completed",
        updatedAt: { $gte: startOfWeek }
      })
    ]);

    const overdueDossiers = assignedDossiers.filter(
      (d) => d.dueDate && d.dueDate < now && d.status !== "completed" && d.status !== "cancelled"
    );

    const dossierIds = [...new Set(upcomingInterventions.map((i) => i.dossierId))];
    const dossiers = await this.dossierModel
      .find({ _id: { $in: dossierIds } })
      .select("_id title")
      .exec();
    const dossierMap = new Map(dossiers.map((d) => [d._id.toString(), d.title]));

    return {
      assignedDossiers: assignedDossiers.map((d) => this.toDossierSummary(d)),
      upcomingInterventions: upcomingInterventions.map((i) =>
        this.toInterventionResponse(i, dossierMap.get(i.dossierId))
      ),
      overdueDossiers: overdueDossiers.map((d) => this.toDossierSummary(d)),
      stats: {
        totalAssigned: assignedDossiers.length,
        inProgress: assignedDossiers.filter((d) => d.status === "in_progress").length,
        completedThisWeek,
        overdue: overdueDossiers.length
      }
    };
  }

  // ── Helpers ──

  private autoAdvanceStatus(doc: DossierDocument): void {
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

  private computeProgress(doc: DossierDocument): number {
    const allTodos = doc.steps.flatMap((s) => s.todos);
    if (allTodos.length === 0) return 0;
    const done = allTodos.filter((t) => t.status === "done" || t.status === "skipped").length;
    return Math.round((done / allTodos.length) * 100);
  }

  private getNextTodo(doc: DossierDocument): string | undefined {
    for (const step of [...doc.steps].sort((a, b) => a.order - b.order)) {
      for (const todo of step.todos) {
        if (todo.status === "pending") return todo.label;
      }
    }
    return undefined;
  }

  private toTemplateResponse(doc: DossierTemplateDocument): DossierTemplateResponse {
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

  private toDossierResponse(doc: DossierDocument): DossierResponse {
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

  private toDossierSummary(doc: DossierDocument): DossierSummaryResponse {
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
    dossierTitle?: string
  ): InterventionResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      dossierId: doc.dossierId,
      dossierTitle,
      title: doc.title,
      description: doc.description,
      status: doc.status,
      assigneeId: doc.assigneeId,
      assigneeName: doc.assigneeName,
      scheduledStart: doc.scheduledStart?.toISOString(),
      scheduledEnd: doc.scheduledEnd?.toISOString(),
      notes: doc.notes,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString()
    };
  }

  private isDuplicateKeyError(err: unknown): boolean {
    return (err as { code?: number })?.code === 11000;
  }
}
