import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  activeDocumentFilter,
  type DataImportBulkResult,
  type DataImportDeleteCreatedBody,
  type DataImportDeleteCreatedResult,
  type ImportArticlesBody,
  type ImportPrestationsBody,
} from "@planwise/shared";
import { parseOrganizationIdBody } from "@planwise/shared/nest";
import type { ArticleDocument } from "../persistence/article.schema";
import type { PrestationDocument } from "../persistence/prestation.schema";
import type { StockMovementDocument } from "../persistence/stock-movement.schema";
import { AbstractStockDataImportService } from "./ports/stock-data-import.service.port";
import { AbstractStockLocationService } from "./ports/stock-location.service.port";
import {
  normalizeArticleReference,
  normalizeTvaRate,
  ensureNonNegativeNumber,
} from "./utils/validation.utils";

function emptyResult(): DataImportBulkResult {
  return { created: 0, updated: 0, skipped: 0, errors: [], mappings: [] };
}

@Injectable()
export class StockDataImportService extends AbstractStockDataImportService {
  constructor(
    @InjectModel("Article")
    private readonly articleModel: Model<ArticleDocument>,
    @InjectModel("Prestation")
    private readonly prestationModel: Model<PrestationDocument>,
    @InjectModel("StockMovement")
    private readonly stockMovementModel: Model<StockMovementDocument>,
    private readonly stockLocationService: AbstractStockLocationService,
  ) {
    super();
  }

  async importArticles(body: ImportArticlesBody): Promise<DataImportBulkResult> {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    const result = emptyResult();
    const defaultLocationId = await this.stockLocationService.getDefaultLocationId(organizationId);

    for (let i = 0; i < body.rows.length; i += 1) {
      const row = body.rows[i]!;
      const rowNum = i + 2;
      if (!row.externalId?.trim()) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "externalId",
          message: "externalId requis",
          severity: "error",
        });
        continue;
      }
      if (!row.name?.trim()) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "name",
          message: "name requis",
          severity: "error",
        });
        continue;
      }
      let reference: string;
      try {
        reference = normalizeArticleReference(row.reference ?? "");
        if (!reference) throw new Error("reference requis");
      } catch {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "reference",
          message: "reference requis",
          severity: "error",
        });
        continue;
      }

      const externalId = row.externalId.trim();
      try {
        const initialStock = ensureNonNegativeNumber(row.initialStock ?? 0, "initialStock");
        const reorderPoint = ensureNonNegativeNumber(row.reorderPoint ?? 0, "reorderPoint");
        const targetStock = ensureNonNegativeNumber(
          row.targetStock ?? Math.max(initialStock, reorderPoint),
          "targetStock",
        );
        const defaultPrice =
          row.defaultPrice !== undefined && row.defaultPrice !== null
            ? ensureNonNegativeNumber(Number(row.defaultPrice), "defaultPrice")
            : undefined;

        const existing = await this.articleModel
          .findOne({ organizationId, importExternalId: externalId, ...activeDocumentFilter })
          .exec();

        const locationStocks =
          initialStock > 0 && defaultLocationId
            ? [{ locationId: defaultLocationId, quantity: initialStock }]
            : [];

        if (existing) {
          existing.name = row.name.trim();
          existing.reference = reference;
          existing.description = row.description?.trim() || undefined;
          existing.unit = row.unit?.trim() || "unité";
          existing.defaultPrice = defaultPrice;
          existing.reorderPoint = reorderPoint;
          existing.targetStock = targetStock;
          existing.isActive = true;
          await existing.save();
          result.updated += 1;
          result.mappings.push({ externalId, id: existing._id.toString(), action: "updated" });
        } else {
          const byRef = await this.articleModel
            .findOne({ organizationId, reference, ...activeDocumentFilter })
            .exec();
          if (byRef) {
            byRef.importExternalId = externalId;
            byRef.name = row.name.trim();
            byRef.description = row.description?.trim() || undefined;
            byRef.unit = row.unit?.trim() || byRef.unit;
            if (defaultPrice !== undefined) byRef.defaultPrice = defaultPrice;
            byRef.reorderPoint = reorderPoint;
            byRef.targetStock = targetStock;
            byRef.isActive = true;
            await byRef.save();
            result.updated += 1;
            result.mappings.push({ externalId, id: byRef._id.toString(), action: "updated" });
          } else {
            const doc = await this.articleModel.create({
              organizationId,
              name: row.name.trim(),
              reference,
              description: row.description?.trim() || undefined,
              unit: row.unit?.trim() || "unité",
              defaultPrice,
              stockQuantity: initialStock,
              reorderPoint,
              targetStock,
              isActive: true,
              locationStocks,
              importExternalId: externalId,
              lastMovementAt: initialStock > 0 ? new Date() : undefined,
            });
            result.created += 1;
            result.mappings.push({ externalId, id: doc._id.toString(), action: "created" });
          }
        }
      } catch (e) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          message: e instanceof Error ? e.message : "Erreur import article",
          severity: "error",
        });
      }
    }
    return result;
  }

  async importPrestations(body: ImportPrestationsBody): Promise<DataImportBulkResult> {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    const result = emptyResult();

    for (let i = 0; i < body.rows.length; i += 1) {
      const row = body.rows[i]!;
      const rowNum = i + 2;
      if (!row.externalId?.trim()) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "externalId",
          message: "externalId requis",
          severity: "error",
        });
        continue;
      }
      if (!row.name?.trim()) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "name",
          message: "name requis",
          severity: "error",
        });
        continue;
      }
      let reference: string;
      try {
        reference = normalizeArticleReference(row.reference ?? "");
        if (!reference) throw new Error("reference requis");
      } catch {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "reference",
          message: "reference requis",
          severity: "error",
        });
        continue;
      }

      const externalId = row.externalId.trim();
      try {
        const defaultPrice = ensureNonNegativeNumber(Number(row.defaultPrice ?? 0), "defaultPrice");
        const defaultTvaRate = normalizeTvaRate(row.defaultTvaRate);
        const existing = await this.prestationModel
          .findOne({ organizationId, importExternalId: externalId, ...activeDocumentFilter })
          .exec();

        if (existing) {
          existing.name = row.name.trim();
          existing.reference = reference;
          existing.description = row.description?.trim() || undefined;
          existing.unit = row.unit?.trim() || "unité";
          existing.defaultPrice = defaultPrice;
          existing.defaultTvaRate = defaultTvaRate;
          existing.isActive = true;
          await existing.save();
          result.updated += 1;
          result.mappings.push({ externalId, id: existing._id.toString(), action: "updated" });
        } else {
          const byRef = await this.prestationModel
            .findOne({ organizationId, reference, ...activeDocumentFilter })
            .exec();
          if (byRef) {
            byRef.importExternalId = externalId;
            byRef.name = row.name.trim();
            byRef.description = row.description?.trim() || undefined;
            byRef.unit = row.unit?.trim() || byRef.unit;
            byRef.defaultPrice = defaultPrice;
            byRef.defaultTvaRate = defaultTvaRate;
            byRef.isActive = true;
            await byRef.save();
            result.updated += 1;
            result.mappings.push({ externalId, id: byRef._id.toString(), action: "updated" });
          } else {
            const doc = await this.prestationModel.create({
              organizationId,
              name: row.name.trim(),
              reference,
              description: row.description?.trim() || undefined,
              unit: row.unit?.trim() || "unité",
              defaultPrice,
              defaultTvaRate,
              isActive: true,
              importExternalId: externalId,
            });
            result.created += 1;
            result.mappings.push({ externalId, id: doc._id.toString(), action: "created" });
          }
        }
      } catch (e) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          message: e instanceof Error ? e.message : "Erreur import prestation",
          severity: "error",
        });
      }
    }
    return result;
  }

  async deleteCreated(body: DataImportDeleteCreatedBody): Promise<DataImportDeleteCreatedResult> {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    const ids = [
      ...new Set(
        (body.ids ?? []).map((id) => id.trim()).filter((id) => Types.ObjectId.isValid(id)),
      ),
    ];
    if (ids.length === 0) return { deleted: 0 };

    let deleted = 0;
    const chunkSize = 500;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const objectIds = chunk.map((id) => new Types.ObjectId(id));
      if (body.entity === "articles") {
        await this.stockMovementModel
          .deleteMany({ organizationId, articleId: { $in: chunk } })
          .exec();
        const res = await this.articleModel
          .deleteMany({ organizationId, _id: { $in: objectIds } })
          .exec();
        deleted += res.deletedCount ?? 0;
      } else if (body.entity === "prestations") {
        const res = await this.prestationModel
          .deleteMany({ organizationId, _id: { $in: objectIds } })
          .exec();
        deleted += res.deletedCount ?? 0;
      } else {
        throw new Error(`Entité non gérée par stock-service : ${body.entity}`);
      }
    }
    return { deleted };
  }
}
