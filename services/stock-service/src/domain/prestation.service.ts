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
  type CreatePrestationBody,
  type PrestationResponse,
  type PrestationsListResponse,
  type UpdatePrestationBody,
} from "@planwise/shared";
import type { PrestationDocument } from "../persistence/prestation.schema";
import { AbstractPrestationService } from "./ports/prestation.service.port";
import { toPrestationResponse } from "./mappers/prestation.mapper";
import {
  normalizeArticleReference,
  normalizeTvaRate,
  ensureNonNegativeNumber,
  isDuplicateKeyError,
} from "./utils/validation.utils";

@Injectable()
export class PrestationService extends AbstractPrestationService {
  constructor(
    @InjectModel("Prestation")
    private readonly prestationModel: Model<PrestationDocument>,
  ) {
    super();
  }

  async createPrestation(body: CreatePrestationBody): Promise<PrestationResponse> {
    const name = body.name?.trim();
    if (!name) throw new BadRequestException("Prestation name is required");
    const reference = normalizeArticleReference(body.reference);
    if (!reference) throw new BadRequestException("Prestation reference is required");
    const defaultPrice = ensureNonNegativeNumber(body.defaultPrice ?? 0, "defaultPrice");
    const defaultTvaRate = normalizeTvaRate(body.defaultTvaRate);

    try {
      const doc = await this.prestationModel.create({
        organizationId: body.organizationId,
        name,
        reference,
        description: body.description?.trim() || undefined,
        unit: body.unit?.trim() || "unité",
        defaultPrice,
        defaultTvaRate,
        isActive: body.isActive ?? true,
        isTestData: body.isTestData === true,
      });
      return toPrestationResponse(doc);
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException("A prestation with this reference already exists");
      }
      throw err;
    }
  }

  async listPrestations(
    organizationId: string,
    filters?: {
      search?: string;
      activeOnly?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<PrestationsListResponse> {
    const query: Record<string, unknown> = { organizationId, ...activeDocumentFilter };
    const activeOnly = filters?.activeOnly ?? true;
    if (activeOnly) query.isActive = true;
    if (filters?.search) {
      const raw = filters.search.trim();
      const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const tokens = raw.split(/\s+/).filter(Boolean).map(escapeRegex);
      const fields = ["name", "reference", "description"] as const;
      if (tokens.length <= 1) {
        const escaped = escapeRegex(raw);
        query.$or = fields.map((field) => ({ [field]: { $regex: escaped, $options: "i" } }));
      } else {
        query.$and = tokens.map((token) => ({
          $or: fields.map((field) => ({ [field]: { $regex: token, $options: "i" } })),
        }));
      }
    }
    const { limit, offset } = clampPagination({
      limit: filters?.limit,
      offset: filters?.offset,
    });
    const [total, docs] = await Promise.all([
      this.prestationModel.countDocuments(query).exec(),
      this.prestationModel.find(query).sort({ name: 1 }).skip(offset).limit(limit).exec(),
    ]);
    return { prestations: docs.map((doc) => toPrestationResponse(doc)), total };
  }

  async getPrestation(id: string, organizationId: string): Promise<PrestationResponse> {
    const doc = await this.prestationModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Prestation not found");
    return toPrestationResponse(doc);
  }

  async updatePrestation(id: string, body: UpdatePrestationBody): Promise<PrestationResponse> {
    const doc = await this.prestationModel
      .findOne({ _id: id, organizationId: body.organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Prestation not found");

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) throw new BadRequestException("Prestation name cannot be empty");
      doc.name = name;
    }
    if (body.reference !== undefined) {
      const reference = normalizeArticleReference(body.reference);
      if (!reference) throw new BadRequestException("Prestation reference cannot be empty");
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
      doc.defaultPrice = ensureNonNegativeNumber(body.defaultPrice, "defaultPrice");
    }
    if (body.defaultTvaRate !== undefined) {
      doc.defaultTvaRate = normalizeTvaRate(body.defaultTvaRate) as number;
    }
    if (body.isActive !== undefined) {
      doc.isActive = body.isActive;
    }

    try {
      await doc.save();
      return toPrestationResponse(doc);
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException("A prestation with this reference already exists");
      }
      throw err;
    }
  }

  async deletePrestation(id: string, organizationId: string): Promise<{ deleted: true }> {
    const doc = await this.prestationModel
      .findOneAndUpdate(
        { _id: id, organizationId, ...activeDocumentFilter },
        { $set: { isActive: false, deletedAt: new Date() } },
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException("Prestation not found");
    return { deleted: true };
  }

  async purgeTestData(organizationId: string): Promise<void> {
    await this.prestationModel.deleteMany({ organizationId, isTestData: true }).exec();
  }
}
