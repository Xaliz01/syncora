import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  activeDocumentFilter,
  type InterventionPrestationUsageResponse,
  type InterventionPrestationUsagesListResponse,
  type SetInterventionPrestationUsagesBody,
} from "@planwise/shared";
import type { InterventionPrestationUsageDocument } from "../persistence/intervention-prestation-usage.schema";
import type { PrestationDocument } from "../persistence/prestation.schema";
import { AbstractInterventionPrestationUsageService } from "./ports/intervention-prestation-usage.service.port";
import { toInterventionPrestationUsageResponse } from "./mappers/intervention-prestation-usage.mapper";
import { ensureNonNegativeNumber } from "./utils/validation.utils";

@Injectable()
export class InterventionPrestationUsageService extends AbstractInterventionPrestationUsageService {
  constructor(
    @InjectModel("InterventionPrestationUsage")
    private readonly usageModel: Model<InterventionPrestationUsageDocument>,
    @InjectModel("Prestation")
    private readonly prestationModel: Model<PrestationDocument>,
  ) {
    super();
  }

  async listByIntervention(
    organizationId: string,
    interventionId: string,
  ): Promise<InterventionPrestationUsagesListResponse> {
    const docs = await this.usageModel
      .find({ organizationId, interventionId, ...activeDocumentFilter })
      .sort({ updatedAt: -1 })
      .exec();
    return { usages: await this.toResponses(organizationId, docs) };
  }

  async listByCase(
    organizationId: string,
    caseId: string,
  ): Promise<InterventionPrestationUsagesListResponse> {
    const docs = await this.usageModel
      .find({ organizationId, caseId, ...activeDocumentFilter })
      .sort({ updatedAt: -1 })
      .exec();
    return { usages: await this.toResponses(organizationId, docs) };
  }

  async replaceUsages(
    interventionId: string,
    body: SetInterventionPrestationUsagesBody,
  ): Promise<InterventionPrestationUsageResponse[]> {
    const organizationId = body.organizationId?.trim();
    if (!organizationId) throw new BadRequestException("organizationId is required");
    if (!Array.isArray(body.usages)) {
      throw new BadRequestException("usages must be an array");
    }

    const desired = new Map<string, number>();
    for (const item of body.usages) {
      const prestationId = item.prestationId?.trim();
      if (!prestationId) throw new BadRequestException("prestationId is required");
      const quantity = ensureNonNegativeNumber(item.quantity, "quantity");
      desired.set(prestationId, quantity);
    }

    for (const prestationId of desired.keys()) {
      await this.requirePrestation(organizationId, prestationId, {
        requireActive: (desired.get(prestationId) ?? 0) > 0,
      });
    }

    const existing = await this.usageModel.find({ organizationId, interventionId }).exec();
    const existingByPrestation = new Map(existing.map((doc) => [doc.prestationId, doc]));
    const now = new Date();

    for (const [prestationId, quantity] of desired) {
      const doc = existingByPrestation.get(prestationId);
      if (quantity <= 0.000_001) {
        if (doc && !doc.deletedAt) {
          doc.deletedAt = now;
          doc.quantity = 0;
          if (body.caseId?.trim()) doc.caseId = body.caseId.trim();
          await doc.save();
        }
        continue;
      }
      if (doc) {
        doc.quantity = quantity;
        doc.deletedAt = null;
        if (body.caseId?.trim()) doc.caseId = body.caseId.trim();
        await doc.save();
        continue;
      }
      await this.usageModel.create({
        organizationId,
        interventionId,
        caseId: body.caseId?.trim() || undefined,
        prestationId,
        quantity,
        deletedAt: null,
      });
    }

    for (const doc of existing) {
      if (desired.has(doc.prestationId)) continue;
      if (doc.deletedAt) continue;
      doc.deletedAt = now;
      doc.quantity = 0;
      await doc.save();
    }

    const listed = await this.listByIntervention(organizationId, interventionId);
    return listed.usages;
  }

  private async requirePrestation(
    organizationId: string,
    prestationId: string,
    options: { requireActive: boolean },
  ): Promise<PrestationDocument> {
    const doc = await this.prestationModel
      .findOne({ _id: prestationId, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Prestation not found");
    if (options.requireActive && !doc.isActive) {
      throw new BadRequestException("Prestation is inactive");
    }
    return doc;
  }

  private async toResponses(
    organizationId: string,
    docs: InterventionPrestationUsageDocument[],
  ): Promise<InterventionPrestationUsageResponse[]> {
    if (docs.length === 0) return [];
    const prestationIds = [...new Set(docs.map((d) => d.prestationId))];
    const prestations = await this.prestationModel
      .find({ _id: { $in: prestationIds }, organizationId })
      .exec();
    const byId = new Map(prestations.map((p) => [p._id.toString(), p]));
    return docs.map((doc) => {
      const prestation = byId.get(doc.prestationId);
      return toInterventionPrestationUsageResponse(doc, {
        name: prestation?.name ?? "Prestation",
        reference: prestation?.reference,
        unit: prestation?.unit ?? "unité",
        defaultPrice: prestation?.defaultPrice,
        defaultTvaRate: prestation?.defaultTvaRate,
      });
    });
  }
}
