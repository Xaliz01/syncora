import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  activeDocumentFilter,
  clampPagination,
  type AddInterventionArticleUsageBody,
  type ArticleResponse,
  type ArticlesListResponse,
  type CreateArticleBody,
  type CreateArticleMovementBody,
  type CreateStockLocationBody,
  type CreateStockTransferBody,
  type InterventionArticleUsageResponse,
  type LocationStockEntry,
  type StockLocationResponse,
  type StockMovementResponse,
  type StockMovementType,
  type StockStatus,
  type UpdateArticleBody,
  type UpdateStockLocationBody,
} from "@planwise/shared";
import type { ArticleDocument } from "../persistence/article.schema";
import type { StockMovementDocument } from "../persistence/stock-movement.schema";
import type { StockLocationDocument } from "../persistence/stock-location.schema";
import { AbstractStockService } from "./ports/stock.service.port";

@Injectable()
export class StockService extends AbstractStockService {
  constructor(
    @InjectModel("Article")
    private readonly articleModel: Model<ArticleDocument>,
    @InjectModel("StockMovement")
    private readonly stockMovementModel: Model<StockMovementDocument>,
    @InjectModel("StockLocation")
    private readonly stockLocationModel: Model<StockLocationDocument>,
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
      "targetStock",
    );
    if (targetStock < reorderPoint) {
      throw new BadRequestException("targetStock must be greater than or equal to reorderPoint");
    }

    const defaultPrice =
      body.defaultPrice !== undefined && body.defaultPrice !== null
        ? this.ensureNonNegativeNumber(body.defaultPrice, "defaultPrice")
        : undefined;

    const locationId = body.locationId
      ? await this.resolveLocationId(body.organizationId, body.locationId)
      : await this.getDefaultLocationId(body.organizationId);

    const locationStocks: { locationId: string; quantity: number }[] = [];
    if (initialStock > 0 && locationId) {
      locationStocks.push({ locationId, quantity: initialStock });
    }

    try {
      const now = new Date();
      const doc = await this.articleModel.create({
        organizationId: body.organizationId,
        name,
        reference,
        description: body.description?.trim() || undefined,
        unit: body.unit?.trim() || "unité",
        defaultPrice,
        stockQuantity: initialStock,
        reorderPoint,
        targetStock,
        isActive: body.isActive ?? true,
        lastMovementAt: initialStock > 0 ? now : undefined,
        locationStocks,
        isTestData: body.isTestData === true,
      });

      if (initialStock > 0) {
        const locationName = locationId
          ? await this.getLocationName(body.organizationId, locationId)
          : undefined;
        await this.stockMovementModel.create({
          organizationId: body.organizationId,
          articleId: doc._id.toString(),
          articleName: doc.name,
          articleReference: doc.reference,
          movementType: "in",
          quantity: initialStock,
          previousStock: 0,
          newStock: initialStock,
          reason: "initial_stock",
          locationId: locationId || undefined,
          locationName,
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
    filters?: {
      search?: string;
      lowStockOnly?: boolean;
      activeOnly?: boolean;
      locationId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<ArticlesListResponse> {
    const query: Record<string, unknown> = { organizationId, ...activeDocumentFilter };
    const activeOnly = filters?.activeOnly ?? true;
    if (activeOnly) query.isActive = true;
    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { reference: { $regex: filters.search, $options: "i" } },
      ];
    }
    if (filters?.lowStockOnly) {
      query.$expr = { $lte: ["$stockQuantity", "$reorderPoint"] };
    }
    if (filters?.locationId) {
      query["locationStocks.locationId"] = filters.locationId;
    }

    const { limit, offset } = clampPagination({
      limit: filters?.limit,
      offset: filters?.offset,
    });

    const [total, docs] = await Promise.all([
      this.articleModel.countDocuments(query).exec(),
      this.articleModel.find(query).sort({ name: 1 }).skip(offset).limit(limit).exec(),
    ]);

    return { articles: docs.map((doc) => this.toArticleResponse(doc)), total };
  }

  async getArticle(id: string, organizationId: string): Promise<ArticleResponse> {
    const doc = await this.articleModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Article not found");
    return this.toArticleResponse(doc);
  }

  async updateArticle(id: string, body: UpdateArticleBody): Promise<ArticleResponse> {
    const doc = await this.articleModel
      .findOne({ _id: id, organizationId: body.organizationId, ...activeDocumentFilter })
      .exec();
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
    if (body.defaultPrice !== undefined) {
      doc.defaultPrice =
        body.defaultPrice === null
          ? undefined
          : this.ensureNonNegativeNumber(body.defaultPrice, "defaultPrice");
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
      .findOneAndUpdate(
        { _id: id, organizationId, ...activeDocumentFilter },
        { $set: { isActive: false, deletedAt: new Date() } },
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException("Article not found");
    return { deleted: true };
  }

  async purgeTestData(organizationId: string): Promise<{ purged: true }> {
    const testArticles = await this.articleModel
      .find({ organizationId, isTestData: true })
      .select("_id")
      .exec();
    const articleIds = testArticles.map((a) => a._id.toString());
    if (articleIds.length > 0) {
      await this.stockMovementModel.deleteMany({ organizationId, articleId: { $in: articleIds } });
    }
    await this.articleModel.deleteMany({ organizationId, isTestData: true }).exec();
    await this.stockLocationModel.deleteMany({ organizationId, isTestData: true }).exec();
    return { purged: true };
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

    const locationId = body.locationId
      ? await this.resolveLocationId(body.organizationId, body.locationId)
      : await this.getDefaultLocationId(body.organizationId);

    const { movement } = await this.applyStockMovement({
      organizationId: body.organizationId,
      articleId: body.articleId,
      movementType,
      quantity,
      note: body.note,
      reason: body.reason || "manual",
      locationId: locationId || undefined,
      interventionId: body.interventionId,
      caseId: body.caseId,
      actorUserId: body.actorUserId,
      actorUserName: body.actorUserName,
      at: new Date(),
    });
    return movement;
  }

  async addInterventionArticleUsage(
    interventionId: string,
    body: AddInterventionArticleUsageBody,
  ): Promise<StockMovementResponse> {
    const movementType = body.movementType ?? "out";
    const quantity = this.ensureStrictlyPositiveNumber(body.quantity, "quantity");
    const usageByArticle = await this.getInterventionUsageMap(body.organizationId, interventionId);
    const currentUsage = usageByArticle.get(body.articleId);

    if (movementType === "in") {
      if (!currentUsage || currentUsage.consumedQuantity <= 0) {
        throw new BadRequestException(
          "Cannot return an article that has not been consumed on this intervention",
        );
      }
      if (currentUsage.returnedQuantity + quantity > currentUsage.consumedQuantity) {
        throw new BadRequestException(
          "Returned quantity cannot exceed already consumed quantity for this intervention",
        );
      }
    }

    const locationId = body.locationId
      ? await this.resolveLocationId(body.organizationId, body.locationId)
      : await this.getDefaultLocationId(body.organizationId);

    const { movement } = await this.applyStockMovement({
      organizationId: body.organizationId,
      articleId: body.articleId,
      movementType,
      quantity,
      note: body.note,
      reason: "intervention_usage",
      locationId: locationId || undefined,
      interventionId,
      caseId: body.caseId,
      actorUserId: body.actorUserId,
      actorUserName: body.actorUserName,
      at: new Date(),
    });
    return movement;
  }

  async listArticleMovements(
    organizationId: string,
    filters?: {
      articleId?: string;
      interventionId?: string;
      caseId?: string;
      locationId?: string;
      limit?: number;
    },
  ): Promise<StockMovementResponse[]> {
    const query: Record<string, unknown> = { organizationId };
    if (filters?.articleId) query.articleId = filters.articleId;
    if (filters?.interventionId) query.interventionId = filters.interventionId;
    if (filters?.caseId) query.caseId = filters.caseId;
    if (filters?.locationId) {
      query.$or = [
        { locationId: filters.locationId },
        { destinationLocationId: filters.locationId },
      ];
    }
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 200);

    const docs = await this.stockMovementModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
    return docs.map((doc) => this.toStockMovementResponse(doc));
  }

  async getInterventionUsage(
    organizationId: string,
    interventionId: string,
  ): Promise<InterventionArticleUsageResponse[]> {
    return [...(await this.getInterventionUsageMap(organizationId, interventionId)).values()];
  }

  private async getInterventionUsageMap(
    organizationId: string,
    interventionId: string,
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
        lastMovementAt: undefined,
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
    const locationStocks: LocationStockEntry[] | undefined =
      doc.locationStocks && doc.locationStocks.length > 0
        ? doc.locationStocks.map((ls) => ({
            locationId: ls.locationId,
            quantity: ls.quantity,
          }))
        : undefined;
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      name: doc.name,
      reference: doc.reference,
      description: doc.description,
      unit: doc.unit,
      defaultPrice: doc.defaultPrice,
      stockQuantity: doc.stockQuantity,
      reorderPoint: doc.reorderPoint,
      targetStock: doc.targetStock,
      isActive: doc.isActive,
      lastMovementAt: doc.lastMovementAt?.toISOString(),
      lowStock: stockStatus !== "ok",
      stockStatus,
      suggestedReorderQuantity: Math.max(doc.targetStock - doc.stockQuantity, 0),
      locationStocks,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString(),
      isTestData: doc.isTestData === true,
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
      locationId: doc.locationId,
      locationName: doc.locationName,
      destinationLocationId: doc.destinationLocationId,
      destinationLocationName: doc.destinationLocationName,
      interventionId: doc.interventionId,
      caseId: doc.caseId,
      actorUserId: doc.actorUserId,
      actorUserName: doc.actorUserName,
      createdAt: doc.get("createdAt")?.toISOString(),
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
    locationId?: string;
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
      isActive: true,
      ...activeDocumentFilter,
    };

    let previousDoc: ArticleDocument | null = null;
    let newStock = 0;
    let movementQuantity = params.quantity;

    if (params.movementType === "out") {
      previousDoc = await this.articleModel
        .findOneAndUpdate(
          {
            ...baseFilter,
            stockQuantity: { $gte: params.quantity },
          },
          {
            $inc: { stockQuantity: -params.quantity },
            $set: { lastMovementAt: params.at },
          },
          { new: false },
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
            $set: { lastMovementAt: params.at },
          },
          { new: false },
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
            $set: { stockQuantity: params.quantity, lastMovementAt: params.at },
          },
          { new: false },
        )
        .exec();
      if (!previousDoc) {
        throw new NotFoundException("Article not found");
      }
      newStock = params.quantity;
      movementQuantity = Math.abs(params.quantity - previousDoc.stockQuantity);
    }

    if (params.locationId) {
      await this.updateLocationStock(
        params.organizationId,
        params.articleId,
        params.locationId,
        params.movementType,
        params.quantity,
      );
    }

    const locationName = params.locationId
      ? await this.getLocationName(params.organizationId, params.locationId)
      : undefined;

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
      locationId: params.locationId,
      locationName,
      interventionId: params.interventionId,
      caseId: params.caseId,
      actorUserId: params.actorUserId,
      actorUserName: params.actorUserName,
    });

    return {
      movement: this.toStockMovementResponse(movementDoc),
    };
  }

  // ── Stock locations ──

  async createStockLocation(body: CreateStockLocationBody): Promise<StockLocationResponse> {
    const name = body.name?.trim();
    if (!name) throw new BadRequestException("Location name is required");
    if (!["warehouse", "agence", "vehicle"].includes(body.type)) {
      throw new BadRequestException("Location type must be warehouse, agence, or vehicle");
    }
    if ((body.type === "agence" || body.type === "vehicle") && !body.referenceId) {
      throw new BadRequestException(`referenceId is required for type ${body.type}`);
    }

    const existingDefault = await this.stockLocationModel
      .findOne({ organizationId: body.organizationId, isDefault: true })
      .exec();
    const isDefault = !existingDefault;

    try {
      const doc = await this.stockLocationModel.create({
        organizationId: body.organizationId,
        name,
        type: body.type,
        referenceId: body.referenceId,
        address: body.address?.trim() || undefined,
        isDefault,
      });
      return this.toStockLocationResponse(doc);
    } catch (err: unknown) {
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException("A location with this name already exists");
      }
      throw err;
    }
  }

  async listStockLocations(organizationId: string): Promise<StockLocationResponse[]> {
    const docs = await this.stockLocationModel
      .find({ organizationId })
      .sort({ isDefault: -1, name: 1 })
      .exec();
    return docs.map((doc) => this.toStockLocationResponse(doc));
  }

  async getStockLocation(id: string, organizationId: string): Promise<StockLocationResponse> {
    const doc = await this.stockLocationModel.findOne({ _id: id, organizationId }).exec();
    if (!doc) throw new NotFoundException("Stock location not found");
    return this.toStockLocationResponse(doc);
  }

  async updateStockLocation(
    id: string,
    body: UpdateStockLocationBody,
  ): Promise<StockLocationResponse> {
    const doc = await this.stockLocationModel
      .findOne({ _id: id, organizationId: body.organizationId })
      .exec();
    if (!doc) throw new NotFoundException("Stock location not found");

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) throw new BadRequestException("Location name cannot be empty");
      doc.name = name;
    }
    if (body.address !== undefined) {
      doc.address = body.address?.trim() || undefined;
    }

    try {
      await doc.save();
      return this.toStockLocationResponse(doc);
    } catch (err: unknown) {
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException("A location with this name already exists");
      }
      throw err;
    }
  }

  async deleteStockLocation(id: string, organizationId: string): Promise<{ deleted: true }> {
    const doc = await this.stockLocationModel.findOne({ _id: id, organizationId }).exec();
    if (!doc) throw new NotFoundException("Stock location not found");
    if (doc.isDefault) {
      throw new BadRequestException("Cannot delete the default stock location");
    }

    const articlesAtLocation = await this.articleModel
      .countDocuments({
        organizationId,
        "locationStocks.locationId": id,
        "locationStocks.quantity": { $gt: 0 },
        ...activeDocumentFilter,
      })
      .exec();
    if (articlesAtLocation > 0) {
      throw new ConflictException(
        "Cannot delete a location that still has stock. Transfer all articles first.",
      );
    }

    await this.articleModel.updateMany(
      { organizationId, "locationStocks.locationId": id },
      { $pull: { locationStocks: { locationId: id } } },
    );

    await doc.deleteOne();
    return { deleted: true };
  }

  async createStockTransfer(body: CreateStockTransferBody): Promise<StockMovementResponse> {
    const quantity = this.ensureStrictlyPositiveNumber(body.quantity, "quantity");
    if (body.sourceLocationId === body.destinationLocationId) {
      throw new BadRequestException("Source and destination locations must be different");
    }

    await this.resolveLocationId(body.organizationId, body.sourceLocationId);
    await this.resolveLocationId(body.organizationId, body.destinationLocationId);

    const baseFilter = {
      _id: body.articleId,
      organizationId: body.organizationId,
      isActive: true,
      ...activeDocumentFilter,
    };

    const article = await this.articleModel.findOne(baseFilter).exec();
    if (!article) throw new NotFoundException("Article not found");

    const sourceEntry = (article.locationStocks ?? []).find(
      (ls) => ls.locationId === body.sourceLocationId,
    );
    const sourceQty = sourceEntry?.quantity ?? 0;
    if (sourceQty < quantity) {
      throw new ConflictException("Insufficient stock at source location");
    }

    await this.articleModel.findOneAndUpdate(
      { ...baseFilter, "locationStocks.locationId": body.sourceLocationId },
      {
        $inc: { "locationStocks.$.quantity": -quantity },
        $set: { lastMovementAt: new Date() },
      },
    );

    const destEntry = (article.locationStocks ?? []).find(
      (ls) => ls.locationId === body.destinationLocationId,
    );
    if (destEntry) {
      await this.articleModel.findOneAndUpdate(
        { ...baseFilter, "locationStocks.locationId": body.destinationLocationId },
        { $inc: { "locationStocks.$.quantity": quantity } },
      );
    } else {
      await this.articleModel.findOneAndUpdate(baseFilter, {
        $push: { locationStocks: { locationId: body.destinationLocationId, quantity } },
      });
    }

    const sourceName = await this.getLocationName(body.organizationId, body.sourceLocationId);
    const destName = await this.getLocationName(body.organizationId, body.destinationLocationId);

    const movementDoc = await this.stockMovementModel.create({
      organizationId: body.organizationId,
      articleId: article._id.toString(),
      articleName: article.name,
      articleReference: article.reference,
      movementType: "transfer",
      quantity,
      previousStock: article.stockQuantity,
      newStock: article.stockQuantity,
      note: body.note,
      reason: "transfer",
      locationId: body.sourceLocationId,
      locationName: sourceName,
      destinationLocationId: body.destinationLocationId,
      destinationLocationName: destName,
      actorUserId: body.actorUserId,
      actorUserName: body.actorUserName,
    });

    return this.toStockMovementResponse(movementDoc);
  }

  // ── Location helpers ──

  private async resolveLocationId(organizationId: string, locationId: string): Promise<string> {
    const loc = await this.stockLocationModel.findOne({ _id: locationId, organizationId }).exec();
    if (!loc) throw new NotFoundException("Stock location not found");
    return loc._id.toString();
  }

  private async getDefaultLocationId(organizationId: string): Promise<string | null> {
    const loc = await this.stockLocationModel.findOne({ organizationId, isDefault: true }).exec();
    return loc?._id.toString() ?? null;
  }

  private async getLocationName(
    organizationId: string,
    locationId: string,
  ): Promise<string | undefined> {
    const loc = await this.stockLocationModel
      .findOne({ _id: locationId, organizationId })
      .select("name")
      .exec();
    return loc?.name;
  }

  private async updateLocationStock(
    organizationId: string,
    articleId: string,
    locationId: string,
    movementType: StockMovementType,
    quantity: number,
  ): Promise<void> {
    const baseFilter = {
      _id: articleId,
      organizationId,
      ...activeDocumentFilter,
    };

    const article = await this.articleModel.findOne(baseFilter).exec();
    if (!article) return;

    const locationStocks = article.locationStocks ?? [];
    const existingEntry = locationStocks.find((ls) => ls.locationId === locationId);
    const tracksLocations = locationStocks.length > 0;

    if (movementType === "out") {
      // Articles déjà ventilés par emplacement : exiger le stock local (comme un transfert).
      // Articles legacy (stock global seul) : ne pas bloquer tant qu'aucune ligne d'emplacement n'existe.
      if (!tracksLocations) return;
      const available = existingEntry?.quantity ?? 0;
      if (available < quantity) {
        throw new ConflictException("Stock insuffisant à cet emplacement");
      }
      await this.articleModel.findOneAndUpdate(
        {
          ...baseFilter,
          "locationStocks.locationId": locationId,
          "locationStocks.quantity": { $gte: quantity },
        },
        { $inc: { "locationStocks.$.quantity": -quantity } },
      );
    } else if (movementType === "in") {
      if (existingEntry) {
        await this.articleModel.findOneAndUpdate(
          { ...baseFilter, "locationStocks.locationId": locationId },
          { $inc: { "locationStocks.$.quantity": quantity } },
        );
      } else {
        await this.articleModel.findOneAndUpdate(baseFilter, {
          $push: { locationStocks: { locationId, quantity } },
        });
      }
    } else if (movementType === "adjustment") {
      if (existingEntry) {
        await this.articleModel.findOneAndUpdate(
          { ...baseFilter, "locationStocks.locationId": locationId },
          { $set: { "locationStocks.$.quantity": quantity } },
        );
      } else {
        await this.articleModel.findOneAndUpdate(baseFilter, {
          $push: { locationStocks: { locationId, quantity } },
        });
      }
    }
  }

  private toStockLocationResponse(doc: StockLocationDocument): StockLocationResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      name: doc.name,
      type: doc.type,
      referenceId: doc.referenceId,
      address: doc.address,
      isDefault: doc.isDefault,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString(),
      isTestData: doc.isTestData === true,
    };
  }

  private isDuplicateKeyError(err: unknown): boolean {
    return (err as { code?: number })?.code === 11000;
  }
}
