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
  type CreateStockLocationBody,
  type StockLocationResponse,
  type UpdateStockLocationBody,
} from "@planwise/shared";
import type { ArticleDocument } from "../persistence/article.schema";
import type { StockLocationDocument } from "../persistence/stock-location.schema";
import { AbstractStockLocationService } from "./ports/stock-location.service.port";
import { toStockLocationResponse } from "./mappers/stock-location.mapper";
import { isDuplicateKeyError } from "./utils/validation.utils";

@Injectable()
export class StockLocationService extends AbstractStockLocationService {
  constructor(
    @InjectModel("StockLocation")
    private readonly stockLocationModel: Model<StockLocationDocument>,
    @InjectModel("Article")
    private readonly articleModel: Model<ArticleDocument>,
  ) {
    super();
  }

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
      .findOne({ organizationId: body.organizationId, isDefault: true, ...activeDocumentFilter })
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
      return toStockLocationResponse(doc);
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException("A location with this name already exists");
      }
      throw err;
    }
  }

  async listStockLocations(organizationId: string): Promise<StockLocationResponse[]> {
    const docs = await this.stockLocationModel
      .find({ organizationId, ...activeDocumentFilter })
      .sort({ isDefault: -1, name: 1 })
      .exec();
    return docs.map((doc) => toStockLocationResponse(doc));
  }

  async getStockLocation(id: string, organizationId: string): Promise<StockLocationResponse> {
    const doc = await this.stockLocationModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Stock location not found");
    return toStockLocationResponse(doc);
  }

  async updateStockLocation(
    id: string,
    body: UpdateStockLocationBody,
  ): Promise<StockLocationResponse> {
    const doc = await this.stockLocationModel
      .findOne({ _id: id, organizationId: body.organizationId, ...activeDocumentFilter })
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
      return toStockLocationResponse(doc);
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException("A location with this name already exists");
      }
      throw err;
    }
  }

  async deleteStockLocation(id: string, organizationId: string): Promise<{ deleted: true }> {
    const doc = await this.stockLocationModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
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
      { organizationId, "locationStocks.locationId": id, ...activeDocumentFilter },
      { $pull: { locationStocks: { locationId: id } } },
    );

    doc.deletedAt = new Date();
    await doc.save();
    return { deleted: true };
  }

  async resolveLocationId(organizationId: string, locationId: string): Promise<string> {
    const loc = await this.stockLocationModel
      .findOne({ _id: locationId, organizationId, ...activeDocumentFilter })
      .exec();
    if (!loc) throw new NotFoundException("Stock location not found");
    return loc._id.toString();
  }

  async getDefaultLocationId(organizationId: string): Promise<string | null> {
    const loc = await this.stockLocationModel
      .findOne({ organizationId, isDefault: true, ...activeDocumentFilter })
      .exec();
    return loc?._id.toString() ?? null;
  }

  async getLocationName(organizationId: string, locationId: string): Promise<string | undefined> {
    const loc = await this.stockLocationModel
      .findOne({ _id: locationId, organizationId, ...activeDocumentFilter })
      .select("name")
      .exec();
    return loc?.name;
  }

  async purgeTestData(organizationId: string): Promise<void> {
    await this.stockLocationModel.deleteMany({ organizationId, isTestData: true }).exec();
  }
}
