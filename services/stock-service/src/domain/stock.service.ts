import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type {
  AddInterventionArticleUsageBody,
  ArticleResponse,
  CreateArticleBody,
  CreateArticleMovementBody,
  InterventionArticleUsageResponse,
  StockMovementResponse,
  StockMovementType,
  StockStatus,
  UpdateArticleBody
} from "@syncora/shared";
import type { ArticleDocument } from "../persistence/article.schema";
import type { StockMovementDocument } from "../persistence/stock-movement.schema";
import { AbstractStockService } from "./ports/stock.service.port";

@Injectable()
export class StockService extends AbstractStockService {
  constructor(
    @InjectModel("Article")
    private readonly articleModel: Model<ArticleDocument>,
    @InjectModel("StockMovement")
    private readonly stockMovementModel: Model<StockMovementDocument>
  ) {
    super();
  }

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

  async addInterventionArticleUsage(
    interventionId: string,
    body: AddInterventionArticleUsageBody
  ): Promise<StockMovementResponse> {
    const movementType = body.movementType ?? "out";
    const quantity = this.ensureStrictlyPositiveNumber(body.quantity, "quantity");
    const usageByArticle = await this.getInterventionUsageMap(body.organizationId, interventionId);
    const currentUsage = usageByArticle.get(body.articleId);

    if (movementType === "in") {
      if (!currentUsage || currentUsage.consumedQuantity <= 0) {
        throw new BadRequestException(
          "Cannot return an article that has not been consumed on this intervention"
        );
      }
      if (currentUsage.returnedQuantity + quantity > currentUsage.consumedQuantity) {
        throw new BadRequestException(
          "Returned quantity cannot exceed already consumed quantity for this intervention"
        );
      }
    }

    const { movement } = await this.applyStockMovement({
      organizationId: body.organizationId,
      articleId: body.articleId,
      movementType,
      quantity,
      note: body.note,
      reason: "intervention_usage",
      interventionId,
      caseId: body.caseId,
      actorUserId: body.actorUserId,
      actorUserName: body.actorUserName,
      at: new Date()
    });
    return movement;
  }

  async listArticleMovements(
    organizationId: string,
    filters?: { articleId?: string; interventionId?: string; caseId?: string; limit?: number }
  ): Promise<StockMovementResponse[]> {
    const query: Record<string, unknown> = { organizationId };
    if (filters?.articleId) query.articleId = filters.articleId;
    if (filters?.interventionId) query.interventionId = filters.interventionId;
    if (filters?.caseId) query.caseId = filters.caseId;
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 200);

    const docs = await this.stockMovementModel.find(query).sort({ createdAt: -1 }).limit(limit).exec();
    return docs.map((doc) => this.toStockMovementResponse(doc));
  }

  async getInterventionUsage(
    organizationId: string,
    interventionId: string
  ): Promise<InterventionArticleUsageResponse[]> {
    return [...(await this.getInterventionUsageMap(organizationId, interventionId)).values()];
  }

  private async getInterventionUsageMap(
    organizationId: string,
    interventionId: string
  ): Promise<Map<string, InterventionArticleUsageResponse>> {
    const docs = await this.stockMovementModel
      .find({ organizationId, interventionId })
      .sort({ createdAt: 1 })
      .exec();
    const usageMap = new Map<string, InterventionArticleUsageResponse>();
    for (const doc of docs) {
      const entry = usageMap.get(doc.articleId) ?? {
        articleId: doc.articleId,
        articleName: doc.articleName,
        articleReference: doc.articleReference,
        unit: "unité",
        consumedQuantity: 0,
        returnedQuantity: 0,
        netQuantity: 0,
        lastMovementAt: undefined
      };

      if (doc.movementType === "out") {
        entry.consumedQuantity += doc.quantity;
      } else if (doc.movementType === "in") {
        entry.returnedQuantity += doc.quantity;
      }
      entry.netQuantity = Math.max(entry.consumedQuantity - entry.returnedQuantity, 0);
      entry.lastMovementAt = doc.get("createdAt")?.toISOString();
      usageMap.set(doc.articleId, entry);
    }
    return usageMap;
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
      movement: this.toStockMovementResponse(movementDoc)
    };
  }

  private isDuplicateKeyError(err: unknown): boolean {
    return (err as { code?: number })?.code === 11000;
  }
}
